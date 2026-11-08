"""Build the aggregated data file behind the Dashboard Royale page (DuckDB over the released parquet)."""
import duckdb, json, math, sys, pathlib, hashlib
import numpy as np
import pandas as pd
if len(sys.argv) < 2:
    raise SystemExit('Usage: python build_data.py ORGANIZER_DATA_DIRECTORY [OUTPUT_JSON]')
D = pathlib.Path(sys.argv[1]).resolve().as_posix().rstrip('/') + '/'
con = duckdb.connect()
for name, path in {'pdv':'1_prepared_views/prepared_daily_view','prop':'1_prepared_views/property_day','pp':'1_prepared_views/player_period',
                   'md':'2_machine_decision/machine_day','gm':'2_machine_decision/game_math','cal':'2_machine_decision/calendar_day',
                   'mach':'2_machine_decision/machines','ops':'2_machine_decision/operations','ac':'2_machine_decision/action_catalog',
                   'lg':'3_guests/loyalty_ledger','wk':'2_machine_decision/floor_walkways'}.items():
    con.sql(f"create view {name} as select * from '{D}{path}.parquet'")
r = lambda x, n=2: None if x is None or (isinstance(x, float) and math.isnan(x)) else round(float(x), n)
months = ['2025-01','2025-02','2025-03','2025-04','2025-05','2025-06']
out = {'months': months}
out['provenance'] = {str(p.relative_to(D)): hashlib.sha256(p.read_bytes()).hexdigest()
                     for p in pathlib.Path(D).rglob('*.parquet') if p.parent.name in ('1_prepared_views','2_machine_decision','3_guests')}
hourly_source = pathlib.Path(D)/'5_optional/machine_hour.parquet'
out['provenance']['5_optional/machine_hour.parquet'] = hashlib.sha256(hourly_source.read_bytes()).hexdigest()

# Fail before publishing if source keys, money identities, or availability are invalid.
for table, keys in [('md','machine_id,gaming_date'), ('pdv','machine_id,gaming_date'), ('gm','config_id'), ('prop','gaming_date')]:
    assert con.sql(f'select count(*) from (select {keys} from {table} group by {keys} having count(*)>1)').fetchall()[0][0] == 0, table + ' duplicate keys'
assert con.sql('select count(*) from md where coin_in_cents-payout_cents<>house_win_cents or available_seconds>scheduled_seconds or occupied_seconds>available_seconds or available_seconds<0').fetchall()[0][0] == 0
assert con.sql('select count(*) from md left join gm using(config_id) where md.active and gm.config_id is null').fetchall()[0][0] == 0

# Machine x month (active days only). var = sum(payout_multiplier_variance * bet^2) in USD^2 -> luck z-scores add up.
mm = con.sql("""select md.machine_id, strftime(md.gaming_date,'%Y-%m') mo, count(*) d,
  sum(md.coin_in_cents)/100 ci, sum(md.house_win_cents)/100 hw, sum(md.theo_cents)/100 th,
  sum(gm.payout_multiplier_variance*md.sum_bet_squared)/10000 var,
  sum(md.available_seconds)/3600 ah, sum(md.scheduled_seconds)/3600 sh, sum(md.occupied_seconds)/3600 oh,
  sum(md.paid_spins) sp, sum(md.payout_positive_spins) ps
 from md join gm using(config_id) where md.active group by 1,2""").df()
meta = con.sql("""select p.machine_id, mode(p.zone_name) zone, mode(p.bank_id) bank, any_value(p.manufacturer) mfr, any_value(p.theme) theme,
  any_value(p.config_id) cfg, any_value(p.volatility_class) vol, any_value(p.configured_rtp)::double rtp, sum(p.faults_opened) faults_total
 from pdv p where p.active group by 1""").df()
fa = con.sql("select machine_id, strftime(gaming_date,'%Y-%m') mo, sum(faults_opened) f from pdv where active group by 1,2").df()
gmd = con.sql("select config_id, hit_probability::double hp from gm").df().set_index('config_id').hp.to_dict()
machines = []
for _, m in meta.sort_values('machine_id').iterrows():
    rows = mm[mm.machine_id == m.machine_id].set_index('mo')
    f = fa[fa.machine_id == m.machine_id].set_index('mo')
    per = []
    for mo in months:
        if mo in rows.index:
            x = rows.loc[mo]
            per.append([int(x.d), r(x.ci), r(x.hw), r(x.th), r(x['var'], 1), r(x.ah, 1), r(x.sh, 1), r(x.oh, 1), int(x.sp), int(x.ps), int(f.loc[mo].f) if mo in f.index else 0])
        else:
            per.append(None)
    machines.append({'id': m.machine_id, 'zone': m.zone, 'bank': m.bank, 'mfr': m.mfr, 'theme': m.theme, 'cfg': m.cfg, 'vol': m.vol,
                     'rtp': r(m.rtp, 3), 'hitCfg': r(gmd[m.cfg], 5), 'm': per})
out['machineFields'] = ['days','coinIn','houseWin','theo','var','availH','schedH','occH','spins','posSpins','faults']
out['machines'] = machines

# Preserve dated placements before aggregating; never move historical play into a modal zone.
seg = con.sql("""select md.machine_id, strftime(md.gaming_date,'%Y-%m') mo, p.zone_name, p.bank_id,
 count(*) d, sum(md.coin_in_cents)/100 ci, sum(md.house_win_cents)/100 hw, sum(md.theo_cents)/100 th,
 sum(gm.payout_multiplier_variance*md.sum_bet_squared)/10000 variance,
 sum(md.available_seconds)/3600 ah, sum(md.scheduled_seconds)/3600 sh, sum(md.occupied_seconds)/3600 oh,
 sum(md.paid_spins) sp, sum(md.payout_positive_spins) ps, sum(p.faults_opened) faults,
 sum(md.paid_spins*gm.hit_probability)::double expected_hits,
 sum(md.paid_spins*gm.hit_probability*(1-gm.hit_probability))::double hit_variance
 from md join pdv p using(machine_id,gaming_date) join gm on md.config_id=gm.config_id
 where md.active group by 1,2,3,4 order by 1,2,3,4""").df()
out['machineFields'] += ['expectedHits','hitVariance']
for m in machines:
    m['segments'] = [[months.index(x.mo), x.zone_name, x.bank_id,
        [int(x.d), float(x.ci), float(x.hw), float(x.th), float(x.variance), float(x.ah), float(x.sh), float(x.oh),
         int(x.sp), int(x.ps), int(x.faults), float(x.expected_hits), float(x.hit_variance)]]
        for x in seg[seg.machine_id == m['id']].itertuples()]
    m['m'] = [None] * len(months)
    for i, z, b, values in m['segments']:
        m['m'][i] = [a+b for a,b in zip(m['m'][i] or [0]*len(values), values)]

# Property day
pdd = con.sql("""select gaming_date::varchar d, local_weekday wd, coalesce(events_active,'') ev, coin_in_usd::double ci, house_win_usd::double hw, theo_usd::double th,
  available_machine_hours ah, occupied_machine_hours oh, comp_cost_usd::double cc, faults_opened f, total_zone_entries_observed ent, pos_cash_usd::double pc
 from prop order by 1""").df()
out['days'] = [[x.d, x.wd, x.ev, r(x.ci, 0), r(x.hw, 0), r(x.th, 0), r(x.ah, 0), r(x.oh, 0), r(x.cc, 0), int(x.f), int(x.ent) if x.ent == x.ent else None] for x in pdd.itertuples()]
out['dayFields'] = ['date','weekday','events','coinIn','houseWin','theo','availH','occH','compCost','faults','entries']

# Forecast: train Jan-Apr, test May-Jun. Both forecasts frozen from training data only.
pdd['date'] = pd.to_datetime(pdd.d)
tr, te = pdd[pdd.date < '2025-05-01'], pdd[pdd.date >= '2025-05-01'].copy()
const = tr.ci.mean(); wkmean = tr.groupby('wd').ci.mean().to_dict()
te['base'] = const; te['wk'] = te.wd.map(wkmean)
mae_b = (te.base - te.ci).abs().mean(); mae_w = (te.wk - te.ci).abs().mean()
# train-period fit (in-sample) for context
out['forecast'] = {'train': [[x.d, r(x.ci, 0)] for x in tr.itertuples()],
                   'test': [[x.d, r(x.ci, 0), r(x.base, 0), r(x.wk, 0), x.wd] for x in te.itertuples()],
                   'weekdayMeans': {k: r(v, 0) for k, v in wkmean.items()}, 'constMean': r(const, 0),
                   'maeBaseline': r(mae_b, 0), 'maeWeekday': r(mae_w, 0),
                   'mapeBaseline': r(((te.base - te.ci) / te.ci).abs().mean() * 100, 2), 'mapeWeekday': r(((te.wk - te.ci) / te.ci).abs().mean() * 100, 2),
                   'biasWeekday': r((te.wk - te.ci).mean(), 0),
                   'byWeekday': {k: [r(g.ci.mean(), 0), r(g.wk.mean(), 0), r((g.wk - g.ci).abs().mean(), 0)] for k, g in te.groupby('wd')}}

# Paired moving-block bootstrap: preserve weekly dependence in test errors.
rng = np.random.default_rng(2026)
gain = ((te.base-te.ci).abs()-(te.wk-te.ci).abs()).to_numpy()
boot = []
for _ in range(4000):
    starts = rng.integers(0, len(gain)-6, size=math.ceil(len(gain)/7))
    idx = np.concatenate([np.arange(s,s+7) for s in starts])[:len(gain)]
    boot.append(float(gain[idx].mean()))
out['forecast']['maeGainCI95'] = [r(v) for v in np.quantile(boot,[.025,.975])]
out['forecast']['r2Weekday'] = r(1-((te.wk-te.ci)**2).sum()/((te.ci-te.ci.mean())**2).sum(),4)
out['forecast']['r2Baseline'] = r(1-((te.base-te.ci)**2).sum()/((te.ci-te.ci.mean())**2).sum(),4)
out['forecast']['testDays'] = len(te)

# Zone x config theo per available hour (location effect controlling for game math)
zc = con.sql("""select zone_name z, config_id c, count(distinct machine_id) n, sum(theo_usd)::double th, sum(available_hours) ah
 from pdv where active group by 1,2""").df()
out['zoneConfig'] = [[x.z, x.c, int(x.n), r(x.th / x.ah, 2)] for x in zc.itertuples()]

# Walkway closure natural experiment
we = con.sql("""select case when zone_name='Back Forty' then 'Back Forty' else 'Other zones' end g,
 case when gaming_date < '2025-03-03' then 'before' when gaming_date < '2025-04-07' then 'closed' else 'after' end p,
 sum(theo_usd)::double / sum(available_hours) tph, sum(coin_in_usd)::double / sum(available_hours) cph, avg(zone_entries_observed) ent
 from pdv where active group by 1,2""").df()
out['walkway'] = {f'{x.g}|{x.p}': [r(x.tph, 2), r(x.cph, 1), r(x.ent, 0)] for x in we.itertuples()}
# Traffic belongs to zone-day, not machine-day. Missing coverage is not zero traffic.
traffic = con.sql("""with daily as (select distinct zone_name, gaming_date,
 zone_entries_observed, zone_counter_coverage_hours from pdv where active)
 select case when zone_name='Back Forty' then 'Back Forty' else 'Other zones' end g,
 case when gaming_date<'2025-03-03' then 'before' when gaming_date<'2025-04-07' then 'closed' else 'after' end p,
 avg(zone_entries_observed) ent, count(*) n,
 sum(case when zone_counter_coverage_hours>=23 then 1 else 0 end) covered
 from daily where zone_counter_coverage_hours>0 group by 1,2""").df()
for x in traffic.itertuples():
    out['walkway'][f'{x.g}|{x.p}'][2] = r(x.ent,0)
out['trafficCoverage'] = [[x.g,x.p,int(x.n),int(x.covered)] for x in traffic.itertuples()]
zw = con.sql("""select zone_name z, date_trunc('week', gaming_date)::varchar w, sum(theo_usd)::double / sum(available_hours) tph, avg(zone_entries_observed) ent
 from pdv where active group by 1,2 order by 2""").df()
out['zoneWeek'] = [[x.z, x.w, r(x.tph, 2), r(x.ent, 0)] for x in zw.itertuples()]

# Fault tickets: manufacturer x local hour, and weekly
oh = con.sql("""select m.manufacturer mf, hour(o.opened_at_local) h, count(*) n, avg(epoch(o.work_started_at_utc-o.opened_at_utc))/3600 wait,
 avg(epoch(o.available_at_utc-o.opened_at_utc))/3600 down from ops o join mach m using(machine_id) where o.event_type='fault_repair' group by 1,2""").df()
out['faultHour'] = [[x.mf, int(x.h), int(x.n), r(x.wait, 2), r(x.down, 2)] for x in oh.itertuples()]

# Descriptive counterfactual: same manufacturer, weekday and local-hour demand.
# All-play money; actual UTC rows retain the spring DST missing hour.
con.sql(f"create view mh as select * from '{D}5_optional/machine_hour.parquet'")
loss = con.sql("""with cells as (
 select m.manufacturer mf, c.local_weekday wd, h.local_hour hr,
 sum(3600-h.available_seconds)/3600.0 down_h, sum(h.available_seconds)/3600.0 avail_h,
 sum(h.coin_in_cents)/100.0 coin_in,
 sum(h.coin_in_cents*(1-g.configured_rtp))/100.0 theo
 from mh h join md d using(machine_id,gaming_date) join gm g on d.config_id=g.config_id
 join mach m using(machine_id) join cal c using(gaming_date)
 where h.active group by 1,2,3)
 select hr, sum(down_h) down_h, sum(down_h*coin_in/nullif(avail_h,0)) lost_coin,
 sum(down_h*theo/nullif(avail_h,0)) lost_theo from cells group by 1 order by 1""").df()
out['downtimeHourly'] = [[int(x.hr),r(x.down_h),r(x.lost_coin),r(x.lost_theo)] for x in loss.itertuples()]

# Comps: weekly points per comp dollar (redemptions), comp cost, redemptions
con.sql("""create view ledger_gaming as select *,
 ((event_at_utc AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') - interval 6 hour)::date gaming_date
 from lg""")
cw = con.sql("""select date_trunc('week', gaming_date)::varchar w, -sum(points_delta)::double / nullif(sum(face_value_cents)/100.0,0) ppd,
 sum(economic_cost_cents)/100.0 cost, count(*) n from ledger_gaming
 where event_type <> 'award' and gaming_date between '2025-01-01' and '2025-06-30' group by 1 order by 1""").df()
out['compWeek'] = [[x.w, r(x.ppd, 2), r(x.cost, 0), int(x.n)] for x in cw.itertuples()]

# Players: month x opening tier x home region, with player-month 'ahead' counts
pg = con.sql("""select period_month mo, opening_tier t, home_region g, count(*) pm, sum(case when tracked_net_usd>0 then 1 else 0 end) ahead,
 sum(case when tracked_coin_in_usd>0 then 1 else 0 end) played,
 sum(tracked_coin_in_usd)::double ci, sum(tracked_payout_usd)::double po, sum(tracked_net_usd)::double net, sum(theo_usd)::double th,
 sum(comp_cost_usd)::double cc, sum(comp_face_value_usd)::double cf, sum(tracked_contribution_usd)::double contrib
 from pp group by 1,2,3""").df()
out['players'] = [[x.mo, x.t, x.g, int(x.pm), int(x.played), int(x.ahead), r(x.ci, 0), r(x.po, 0), r(x.net, 0), r(x.th, 0), r(x.cc, 0), r(x.cf, 0), r(x.contrib, 0)] for x in pg.itertuples()]
out['playerFields'] = ['month','tier','region','playerMonths','played','ahead','coinIn','payout','net','theo','compCost','compFace','contribution']
# Concentration (full window, player level), overall and by region
cc = con.sql("""with p as (select player_id, any_value(home_region) g, any_value(opening_tier) t, sum(theo_usd)::double th, sum(tracked_net_usd)::double net
  from pp group by 1 having sum(tracked_coin_in_usd)>0),
 r as (select *, ntile(100) over (order by th desc) pc from p)
 select g, pc, count(*) n, sum(th) th, sum(-net) loss, sum(case when net>0 then 1 else 0 end) ahead from r group by 1,2""").df()
out['concentration'] = [[x.g, int(x.pc), int(x.n), r(x.th, 0), r(x.loss, 0), int(x.ahead)] for x in cc.itertuples()]

# Action catalog
a = con.sql("select action_type_id, name, unit, unit_cost_cents/100.0 c, recurring_cost_cents_per_day/100.0 rc, lead_days, downtime_minutes, quantity_limit, coalesce(incompatibility_group,'') ig, notes from ac").df()
out['actions'] = [[x.action_type_id, x.name, x.unit, r(x.c, 0), r(x.rc, 0), int(x.lead_days), int(x.downtime_minutes), int(x.quantity_limit), x.ig, x.notes] for x in a.itertuples()]
from advanced_analysis import build as advanced_build
out['advanced'] = advanced_build(con,D)
target = pathlib.Path(sys.argv[2]) if len(sys.argv)>2 else pathlib.Path(__file__).with_name('data.json')
target.write_text(json.dumps(out, separators=(',', ':'), allow_nan=False), encoding='utf-8')
print('ok', 'MAE baseline', out['forecast']['maeBaseline'], 'weekday', out['forecast']['maeWeekday'])


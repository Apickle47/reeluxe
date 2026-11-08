"""Independent reconciliation of generated aggregates with organizer parquet.
Usage: python validate_backend.py DATA_DIRECTORY [GENERATED_JSON]
"""
import sys, json, pathlib, math
import duckdb
root=pathlib.Path(sys.argv[1]).resolve()
data=json.loads((pathlib.Path(sys.argv[2]) if len(sys.argv)>2 else pathlib.Path(__file__).with_name('data.json')).read_text(encoding='utf-8'))
c=duckdb.connect()
for n,p in {'p':'1_prepared_views/prepared_daily_view','d':'2_machine_decision/machine_day','prop':'1_prepared_views/property_day','lg':'3_guests/loyalty_ledger','h':'5_optional/machine_hour'}.items():
    c.sql(f"create view {n} as select * from '{(root/(p+'.parquet')).as_posix()}'")
checks=[]
def check(name, condition):
    if not condition: raise AssertionError(name)
    checks.append(name)
fields={n:i for i,n in enumerate(data['machineFields'])}
# All machine/month/placement cells compared to an independent prepared-view query.
expected=c.sql("""select machine_id,strftime(gaming_date,'%Y-%m'),zone_name,bank_id,
 count(*),sum(coin_in_usd)::double,sum(house_win_usd)::double,sum(theo_usd)::double,
 sum(available_hours),sum(occupied_hours) from p where active group by 1,2,3,4""").fetchall()
actual={(m['id'],data['months'][s[0]],s[1],s[2]):s[3] for m in data['machines'] for s in m['segments']}
check('segment key count',len(actual)==len(expected))
for row in expected:
    v=actual[row[:4]]
    for k,x in zip(['days','coinIn','houseWin','theo','availH','occH'],row[4:]):
        check(f'{row[:4]} {k}',math.isclose(v[fields[k]],float(x),abs_tol=.01,rel_tol=1e-9))
for month in data['months']:
    total=sum(v[fields['coinIn']] for key,v in actual.items() if key[1]==month)
    raw=c.sql(f"select sum(coin_in_usd)::double from prop where strftime(gaming_date,'%Y-%m')='{month}'").fetchall()[0][0]
    check(month+' floor coin reconciliation',abs(total-raw)<.01)
check('four movers retained',sum(len(set(s[2] for s in m['segments']))>1 for m in data['machines'])==4)
# UTC boundaries in winter and summer; excludes July 1 gaming day, includes June 30 evening.
for utc,expected_day in [('2025-01-02 13:59:59','2025-01-01'),('2025-01-02 14:00:00','2025-01-02'),('2025-07-01 12:59:59','2025-06-30'),('2025-07-01 13:00:00','2025-07-01')]:
    day=c.sql(f"select ((timestamp '{utc}' at time zone 'UTC' at time zone 'America/Los_Angeles')-interval 6 hour)::date::varchar").fetchall()[0][0]
    check('gaming boundary '+utc,day==expected_day)
raw=c.sql("""select sum(economic_cost_cents)/100.0 from lg where event_type<>'award'
 and event_at_utc>=timestamp '2025-01-01 14:00:00' and event_at_utc<timestamp '2025-07-01 13:00:00'""").fetchall()[0][0]
check('weekly comp costs reconcile',abs(sum(r[2] for r in data['compWeek'])-float(raw))<=len(data['compWeek'])*.5)
daily=c.sql('select sum(coin_in_cents),sum(available_seconds) from d where active').fetchall()[0]
hourly=c.sql('select sum(coin_in_cents),sum(available_seconds) from h where active').fetchall()[0]
check('hourly meters reconcile to daily',daily==hourly)
f=data['forecast']; train=c.sql("select local_weekday,avg(coin_in_usd)::double from prop where gaming_date<'2025-05-01' group by 1").fetchall()
wk=dict(train)
mae=sum(abs(v[1]-wk[v[4]]) for v in f['test'])/len(f['test'])
check('forecast rebuilt from train only',abs(mae-f['maeWeekday'])<1)
check('train/test dates strictly separated',max(v[0] for v in f['train'])<min(v[0] for v in f['test']))
check('all 61 holdout days',len(f['test'])==61)
result={'passed':len(checks),'placement_cells':len(expected),'forecast':{k:v for k,v in f.items() if k not in ('train','test','byWeekday','weekdayMeans')},'comp_cost_usd':float(raw),'four_movers_retained':True}
print(json.dumps(result,indent=2))

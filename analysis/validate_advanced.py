"""Independent study checks and a future-outcome leakage perturbation test."""
import json, pathlib, sys, math
import duckdb
from advanced_analysis import build
root=pathlib.Path(sys.argv[1]).resolve()
data=json.loads(pathlib.Path(__file__).with_name('data.json').read_text(encoding='utf-8'))
a=data['advanced'];checks=[]
def check(name,ok):
    if not ok: raise AssertionError(name)
    checks.append(name)
c=duckdb.connect()
paths={'pdv':'1_prepared_views/prepared_daily_view','prop':'1_prepared_views/property_day','pp':'1_prepared_views/player_period',
 'gm':'2_machine_decision/game_math','cal':'2_machine_decision/calendar_day','mh':'5_optional/machine_hour','md':'2_machine_decision/machine_day'}
for name,p in paths.items(): c.sql(f"create view {name} as select * from '{(root/(p+'.parquet')).as_posix()}'")
for m in a['movers']:
    counts=c.sql(f"""select sum(case when gaming_date<date '{m['date']}' then 1 else 0 end),
    sum(case when gaming_date>date '{m['date']}' then 1 else 0 end),sum(case when gaming_date=date '{m['date']}' then 1 else 0 end)
    from pdv where active and machine_id='{m['id']}' and gaming_date between date '{m['date']}'-interval {m['daysEachSide']} day and date '{m['date']}' + interval {m['daysEachSide']} day""").fetchall()[0]
    check(m['id']+' balanced source windows',counts==(m['daysEachSide'],m['daysEachSide'],1))
    check(m['id']+' ratio of ratios',math.isclose(m['relativeEffect'],(m['postTph']/m['preTph'])/(m['controlPostTph']/m['controlPreTph'])-1))
    check(m['id']+' valid interval',m['ci95'][0]<m['ci95'][1])
check('all four movers',len(a['movers'])==4)
check('56-day pretrend',a['pretrend']['days']==56)
down=float(c.sql('select sum(scheduled_seconds-available_seconds)/3600.0 from md where active').fetchall()[0][0])
check('peer downtime reconciles',abs(down-a['matchedDowntime']['downHours'])<1e-6)
check('peer hourly loss sums',abs(sum(r[1] for r in a['matchedDowntime']['hourly'])-a['matchedDowntime']['lostTheo'])<1e-6)
for switch,loss in a['matchedDowntime']['substitution']:
    check('switching '+str(switch),math.isclose(loss,a['matchedDowntime']['lostTheo']*(1-switch),abs_tol=1e-8))
check('power sample fits eligible cohort',a['pilot']['totalEnrolled']<=a['pilot']['eligiblePlayers'])
check('arms balanced',a['pilot']['totalEnrolled']==2*a['pilot']['perArm'])
mde=(1.9599639845+.8416212336)*a['pilot']['sd25DayContribution']*math.sqrt(2/a['pilot']['perArm'])
check('power formula',math.isclose(mde,a['pilot']['mde80']))
for row in a['scenarios']['recommended']:
    check('inspection net '+row['name'],abs(row['netContribution']-(row['inspectionRecovery']-row['actionCost']-row['conditionalRepair']-row['downtimeCost']))<1e-7)
for row in a['scenarios']['rows']:
    check('full package net '+row['name'],abs(row['netContribution']-(row['signageProperty']-row['variableCost']+row['inspectionRecovery']-row['actionCost']-row['conditionalRepair']-row['inspectionDowntimeCost']))<1e-7)
r=a['rolling']
check('only historical calibration folds',[f['month'] for f in r['folds']]==['2025-02','2025-03','2025-04'])
check('89 calibration days',r['calibrationDays']==89)
check('coverage counted',r['coverage']==sum(x[2]<=x[4]<=x[3] for x in r['intervals'])/61)
for row,original in zip(r['intervals'],data['forecast']['test']):
    check('original point forecast '+row[0],abs(row[1]-original[3])<=.5)
# Change every held-out coin-in outcome. Past backtests, radius and forecasts must
# remain exactly the same; only coverage/actuals may change.
source=(root/'1_prepared_views/property_day.parquet').as_posix().replace("'","''")
c.sql(f"""create or replace view prop as select * replace
 (case when gaming_date>=date '2025-05-01' then coin_in_usd*10 else coin_in_usd end as coin_in_usd)
 from read_parquet('{source}')""")
changed=build(c,str(root))
check('future perturbation: folds unchanged',changed['rolling']['folds']==r['folds'])
check('future perturbation: interval radius unchanged',changed['rolling']['radius']==r['radius'])
check('future perturbation: point forecasts and bounds unchanged',all(x[:4]==y[:4] for x,y in zip(changed['rolling']['intervals'],r['intervals'])))
check('future perturbation: outcome/coverage changes',changed['rolling']['coverage']!=r['coverage'])
check('seed reproducibility: mover bootstrap',changed['movers']==a['movers'])
check('seed reproducibility: trend bootstrap',changed['pretrend']==a['pretrend'])
print(json.dumps({'passed':len(checks),'checks':checks},indent=2))

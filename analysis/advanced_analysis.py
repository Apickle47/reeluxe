"""Pre-specified descriptive robustness studies. No model selection on May-June.
All seeds, cohorts, windows and estimators are explicit; no causal claim is implied.
"""
import math
import numpy as np
import pandas as pd

def block_indices(n, rng, block=7):
    block=min(block,n)
    starts=rng.integers(0,n-block+1,size=math.ceil(n/block))
    return np.concatenate([np.arange(s,s+block) for s in starts])[:n]

def build(con, data_dir):
    rng=np.random.default_rng(20261107)
    result={}
    daily=con.sql("""select machine_id,gaming_date,zone_name,bank_id,config_id,
        theo_usd::double theo,available_hours ah,coin_in_usd::double ci
        from pdv where active order by gaming_date,machine_id""").df()
    daily['gaming_date']=pd.to_datetime(daily.gaming_date)
    moves=daily.groupby('machine_id').bank_id.nunique()
    mover_ids=sorted(moves[moves>1].index)
    stable=daily[~daily.machine_id.isin(mover_ids)]
    movers=[]
    def rates(a):
        s=a.sum(axis=0)
        return s[0]/s[1],s[2]/s[3]
    def effect(a,b):
        t0,c0=rates(a); t1,c1=rates(b)
        return (t1/t0)/(c1/c0)-1
    for mid in mover_ids:
        m=daily[daily.machine_id==mid].sort_values('gaming_date')
        first=m.iloc[0]; second=m[m.bank_id!=first.bank_id].iloc[0]
        date=second.gaming_date
        n=min(28,(date-m.gaming_date.min()).days,(m.gaming_date.max()-date).days)
        start,end=date-pd.Timedelta(days=n),date+pd.Timedelta(days=n)
        target=m[(m.gaming_date>=start)&(m.gaming_date<=end)&(m.gaming_date!=date)]
        def matched(zone):
            ctrl=stable[(stable.config_id==first.config_id)&(stable.zone_name==zone)&(stable.gaming_date>=start)&(stable.gaming_date<=end)&(stable.gaming_date!=date)]
            # Require each control to be observed on every target date; selection uses only exposure.
            ids=ctrl.groupby('machine_id').gaming_date.nunique()
            ids=ids[ids==len(target)].index
            ctrl=ctrl[ctrl.machine_id.isin(ids)]
            if not len(ids): return None
            g=ctrl.groupby('gaming_date')[['theo','ah']].sum()
            j=target.set_index('gaming_date')[['theo','ah']].join(g,rsuffix='_ctrl')
            return len(ids),j[j.index<date].to_numpy(),j[j.index>date].to_numpy(),j
        source=matched(first.zone_name)
        if source is None: raise ValueError('No same-game stable control: '+mid)
        nc,a,b,j=source
        boot=[effect(a[block_indices(len(a),rng)],b[block_indices(len(b),rng)]) for _ in range(2000)]
        t0,c0=rates(a);t1,c1=rates(b)
        dest=matched(second.zone_name)
        half=len(a)//2
        movers.append({'id':mid,'date':str(date.date()),'from':first.zone_name+' / '+first.bank_id,
            'to':second.zone_name+' / '+second.bank_id,'config':first.config_id,'daysEachSide':n,
            'controls':nc,'preTph':t0,'postTph':t1,'controlPreTph':c0,'controlPostTph':c1,
            'relativeEffect':effect(a,b),'ci95':np.quantile(boot,[.025,.975]).tolist(),
            'prePlacebo':effect(a[:half],a[half:]),
            'destinationControls':dest[0] if dest else 0,
            'destinationEffect':effect(dest[1],dest[2]) if dest else None})
    result['movers']=movers

    # Pretrend: 8 full weeks before closure, log ratio to whole-floor controls.
    z=daily.assign(group=np.where(daily.zone_name=='Back Forty','treated','control')).groupby(['gaming_date','group'])[['theo','ah']].sum()
    z['rate']=z.theo/z.ah
    wide=z.rate.unstack().sort_index()
    pre=wide.loc['2025-01-06':'2025-03-02']
    y=np.log(pre.treated/pre.control).to_numpy()
    t=np.arange(len(y))/7
    X=np.column_stack([np.ones(len(y)),t,pd.get_dummies(pre.index.dayofweek,drop_first=True).to_numpy(dtype=float)])
    beta=np.linalg.lstsq(X,y,rcond=None)[0]; residual=y-X@beta
    slopes=[]
    for _ in range(2000):
        ys=X@beta+residual[block_indices(len(y),rng)]
        slopes.append(np.linalg.lstsq(X,ys,rcond=None)[0][1])
    ratio=pre.treated/pre.control
    a=wide.loc['2025-01-27':'2025-03-02']; b=wide.loc['2025-03-03':'2025-04-06']
    closure=(b.treated.mean()/a.treated.mean())/(b.control.mean()/a.control.mean())-1
    result['pretrend']={'start':'2025-01-06','end':'2025-03-02','days':len(pre),
        'relativeSlopePerWeek':float(np.expm1(beta[1])),
        'slopeCI95':np.expm1(np.quantile(slopes,[.025,.975])).tolist(),
        'placeboDate':'2025-02-03','placeboEffect':float(ratio.iloc[28:].mean()/ratio.iloc[:28].mean()-1),
        'matched35DayClosureEffect':float(closure),
        'weekly':[[str(i.date()),float(r.treated),float(r.control)] for i,r in pre.resample('W-MON',label='left',closed='left').mean().iterrows()]}
    fixed=stable[(stable.gaming_date>='2025-01-06')&(stable.gaming_date<='2025-04-06')]
    complete=fixed.groupby('machine_id').gaming_date.nunique()
    fixed=fixed[fixed.machine_id.isin(complete[complete==91].index)]
    panel=fixed.assign(group=np.where(fixed.zone_name=='Back Forty','treated','control')).groupby(['gaming_date','group'])[['theo','ah']].sum()
    panel=(panel.theo/panel.ah).unstack()
    pre_fixed=panel.loc['2025-01-06':'2025-03-02']
    beta_fixed=np.linalg.lstsq(X,np.log(pre_fixed.treated/pre_fixed.control).to_numpy(),rcond=None)[0]
    result['pretrend']['balancedPanelMachines']=int(fixed.machine_id.nunique())
    result['pretrend']['balancedPanelSlopePerWeek']=float(np.expm1(beta_fixed[1]))

    # Historical expanding monthly forecasts. February-April errors calibrate a
    # symmetric nominal 90% interval. May-June are never calibration observations.
    p=con.sql('select gaming_date,local_weekday,coin_in_usd::double ci from prop order by gaming_date').df()
    p['gaming_date']=pd.to_datetime(p.gaming_date)
    folds=[]; errors=[]
    for month in ['2025-02','2025-03','2025-04']:
        start=pd.Timestamp(month+'-01');stop=start+pd.offsets.MonthBegin(1)
        train=p[p.gaming_date<start];test=p[(p.gaming_date>=start)&(p.gaming_date<stop)]
        forecast=test.local_weekday.map(train.groupby('local_weekday').ci.mean())
        residuals=(test.ci-forecast).to_numpy();errors.extend(abs(residuals).tolist())
        folds.append({'month':month,'trainEnd':str(train.gaming_date.max().date()),'trainDays':len(train),'testDays':len(test),
            'maeModel':float(abs(residuals).mean()),'maeBaseline':float(abs(test.ci-train.ci.mean()).mean())})
    rank=min(len(errors),math.ceil((len(errors)+1)*.90)); radius=float(sorted(errors)[rank-1])
    train=p[p.gaming_date<'2025-05-01'];test=p[p.gaming_date>='2025-05-01']
    means=train.groupby('local_weekday').ci.mean()
    intervals=[]
    for row in test.itertuples():
        pred=float(means[row.local_weekday]);lo=max(0,pred-radius);hi=pred+radius
        intervals.append([str(row.gaming_date.date()),pred,lo,hi,float(row.ci),bool(lo<=row.ci<=hi)])
    result['rolling']={'folds':folds,'calibrationDays':len(errors),'rank':rank,'radius':radius,'nominalCoverage':.90,
        'coverage':sum(x[5] for x in intervals)/len(intervals),'intervals':intervals,
        'meanWidth':float(np.mean([x[3]-x[2] for x in intervals]))}

    # Peers: other machines, same config and actual zone, same weekday and local hour.
    # Fall back to config/hour/weekday if fewer than 3 peers or 24 peer available hours.
    con.sql("""create temp table peer_hour as select h.machine_id,p.zone_name,p.config_id,c.local_weekday wd,h.local_hour hr,
        sum(3600-h.available_seconds)/3600.0 dh,sum(h.available_seconds)/3600.0 ah,
        sum(h.coin_in_cents)/100.0 ci,sum(h.coin_in_cents*(1-g.configured_rtp))/100.0 th
        from mh h join pdv p using(machine_id,gaming_date) join gm g on p.config_id=g.config_id
        join cal c using(gaming_date) where h.active group by 1,2,3,4,5""")
    peers=con.sql("""with zone as (select config_id,zone_name,wd,hr,sum(ah) ah,sum(ci) ci,sum(th) th,count(distinct machine_id) n from peer_hour group by 1,2,3,4),
      config as (select config_id,wd,hr,sum(ah) ah,sum(ci) ci,sum(th) th,count(distinct machine_id) n from peer_hour group by 1,2,3),
      own as (select machine_id,config_id,wd,hr,sum(ah) ah,sum(ci) ci,sum(th) th from peer_hour group by 1,2,3,4)
      select p.*, case when z.n>=4 and z.ah-p.ah>=24 then 'zone' else 'config' end level,
      case when z.n>=4 and z.ah-p.ah>=24 then (z.ci-p.ci)/(z.ah-p.ah) else (c.ci-o.ci)/nullif(c.ah-o.ah,0) end coin_rate,
      case when z.n>=4 and z.ah-p.ah>=24 then (z.th-p.th)/(z.ah-p.ah) else (c.th-o.th)/nullif(c.ah-o.ah,0) end theo_rate
      from peer_hour p join zone z using(config_id,zone_name,wd,hr) join config c using(config_id,wd,hr)
      join own o using(machine_id,config_id,wd,hr)""").df()
    assert peers.theo_rate.notna().all()
    lost=float((peers.dh*peers.theo_rate).sum())
    result['matchedDowntime']={'lostTheo':lost,'lostCoinIn':float((peers.dh*peers.coin_rate).sum()),
        'downHours':float(peers.dh.sum()),'zoneMatchedShare':float(peers.loc[peers.level=='zone','dh'].sum()/peers.dh.sum()),
        'substitution':[[s,lost*(1-s)] for s in [0,.25,.5,.75,1]],
        'hourly':[[int(h),float((g.dh*g.theo_rate).sum())] for h,g in peers.groupby('hr')]}

    # ITT planning variance: enroll prior-month active players, include zero outcomes
    # for non-returners. June outcome for May cohort; 25/30 scales both mean and SD.
    pilot=con.sql("""with cohort as (select player_id from pp where period_month='2025-05' and tracked_coin_in_usd>0),
      outcome as (select player_id,(theo_usd+linked_pos_cash_usd-linked_pos_cogs_usd)::double contribution,
      comp_cost_usd::double comp from pp where period_month='2025-06')
      select coalesce(o.contribution,0) outcome,coalesce(o.comp,0) comp from cohort left join outcome o using(player_id)""").df()
    n=int(con.sql("select count(*) from pp where period_month='2025-06' and tracked_coin_in_usd>0").fetchall()[0][0])
    sd=float(pilot.outcome.std()*25/30);mu=float(pilot.outcome.mean()*25/30)
    narm=n//2;target=5.0;zsum=1.9599639845+.8416212336
    mde=zsum*sd*math.sqrt(2/narm)
    result['pilot']={'eligiblePlayers':n,'perArm':narm,'totalEnrolled':narm*2,'planningCohort':len(pilot),
        'mean25DayContribution':mu,'sd25DayContribution':sd,'mde80':mde,'targetDelta':target,
        'requiredPerArmForTarget':math.ceil(2*zsum*zsum*sd*sd/(target*target)),
        'mdeCompCost':zsum*float(pilot.comp.std()*25/30)*math.sqrt(2/narm),
        'nonReturnShare':float((pilot.outcome==0).mean())}
    result['pilot']['mdeWith25PctMoreSD']=mde*1.25
    result['pilot']['requiredPerArmWith25PctMoreSD']=math.ceil(2*zsum*zsum*(sd*1.25)**2/(target*target))

    # Property accounting is an identity, not a profit forecast; comp is already COGS.
    accounting=con.sql("""select sum(house_win_usd)::double hw,sum(theo_usd)::double th,
      sum(pos_cash_usd)::double cash,sum(pos_cogs_usd)::double cogs,
      sum(machine_supplied_costs_usd)::double machines,sum(tech_labor_cost_usd)::double labor,
      sum(contribution_after_supplied_costs_usd)::double contribution from prop""").df().iloc[0].to_dict()
    assert abs(accounting['hw']+accounting['cash']-accounting['cogs']-accounting['machines']-accounting['labor']-accounting['contribution'])<.01
    accounting['expectedContribution']=accounting['th']+accounting['cash']-accounting['cogs']-accounting['machines']-accounting['labor']
    result['accounting']=accounting
    b40=float(daily.loc[daily.zone_name=='Back Forty','theo'].sum()/6)
    inspect=daily[daily.machine_id=='M-1158']; downcost=float(inspect.theo.sum()/inspect.ah.sum()*2)
    scenarios=[]
    for name,lift,switch,recovery,repair in [('Downside',0,1,0,0),('Base',.02,.5,3000,1500),('Upside',.05,.25,6000,1500)]:
        gross=b40*20/30*lift; incremental=gross*(1-switch);variable=incremental*.10
        net=incremental-variable+recovery-12700-repair-downcost
        scenarios.append({'name':name,'zoneLift':lift,'substitution':switch,'signageGross':gross,'signageProperty':incremental,
            'variableCost':variable,'inspectionRecovery':recovery,'conditionalRepair':repair,
            'inspectionDowntimeCost':downcost,'pilotJulyBenefit':0,'actionCost':12700,'netContribution':net})
    result['scenarios']={'backFortyMonthlyTheo':b40,'rows':scenarios,'variableCostRate':.10,
        'baseBreakevenLift':(12700+1500+downcost-3000)/(b40*20/30*.5*.9)}
    result['scenarios']['recommended']=[{'name':s['name'],'actionCost':1200,
        'inspectionRecovery':s['inspectionRecovery'],'conditionalRepair':s['conditionalRepair'],
        'downtimeCost':downcost,'netContribution':s['inspectionRecovery']-1200-s['conditionalRepair']-downcost}
        for s in scenarios]
    return result

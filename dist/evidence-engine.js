/* Shared, pure calculations over the exact dashboard export. No simulated outcomes. */
(()=>{'use strict';
const D=window.ACE_EVIDENCE,F=D.machineFields;
function machines({from=0,to=5,zone='',bank=''}={}){return D.machines.map(m=>{
 const segments=m.segments.filter(s=>s[0]>=from&&s[0]<=to&&(!zone||s[1]===zone)&&(!bank||s[2]===bank));
 const sums=Array(F.length).fill(0);segments.forEach(s=>s[3].forEach((v,i)=>sums[i]+=v));
 const x=Object.fromEntries(F.map((k,i)=>[k,sums[i]]));
 return {...m,...x,locations:[...new Set(segments.map(s=>s[1]+' / '+s[2]))],tph:x.availH?x.theo/x.availH:0,availability:x.schedH?x.availH/x.schedH:0,hold:x.coinIn?x.houseWin/x.coinIn:0,luckZ:x.var?(x.houseWin-x.theo)/Math.sqrt(x.var):0,hit:x.spins?x.posSpins/x.spins:0,expectedHit:x.spins?x.expectedHits/x.spins:0,hitZ:x.hitVariance?(x.posSpins-x.expectedHits)/Math.sqrt(x.hitVariance):0};
 }).filter(m=>m.days>0);}
function guests({from=0,to=5,tier='',region=''}={}){const rows=D.players.filter(r=>r[0]>=D.months[from]&&r[0]<=D.months[to]&&(!tier||r[1]===tier)&&(!region||r[2]===region));const totals={};D.playerFields.slice(3).forEach((k,j)=>totals[k]=rows.reduce((s,r)=>s+r[j+3],0));return {rows,totals};}
function concentration(region=''){const r=D.concentration.filter(r=>!region||r[0]===region),total=r.reduce((s,r)=>s+r[3],0);return total?r.filter(r=>r[1]<=10).reduce((s,r)=>s+r[3],0)/total:null;}
function breakdown(state,override={}){const p={...state,...override},qty=p.quantities||{},q=id=>qty[id]||0;
 const committed=D.actions.reduce((s,a)=>s+q(a[0])*(a[3]+a[4]*Math.max(0,30-a[5])),0)+(p.extraCosts||0);
 const inspect=q('A-INSPECT')>0&&(p.targets['A-INSPECT']||'').split(',').map(x=>x.trim()).includes('M-1158');
 const signage=q('A-WAYFINDING')>0&&(p.targets['A-WAYFINDING']||'Back Forty').split(',').map(x=>x.trim()).includes('Back Forty');
 const zoneGain=signage?D.advanced.scenarios.backFortyMonthlyTheo*20/30*p.lift/100:0;
 const propertyGain=zoneGain*(1-p.switching/100),variableCost=propertyGain*D.advanced.scenarios.variableCostRate;
 const recovery=inspect?p.recovery:0,repair=inspect&&recovery>0?p.repair:0;
 const downtime=q('A-INSPECT')*D.advanced.scenarios.recommended[0].downtimeCost;
 return {committed,reserve:100000-committed,zoneGain,propertyGain,variableCost,recovery,repair,downtime,net:propertyGain-variableCost+recovery-repair-downtime-committed};}
function scenarios(s){return [{name:'No recovery / no new play',lift:0,switching:100,recovery:0},{name:'Your selected assumptions',lift:s.lift,switching:s.switching,recovery:s.recovery},{name:'Higher recovery / more new play',lift:Math.max(5,s.lift),switching:Math.min(25,s.switching),recovery:Math.max(6000,s.recovery)}].map(x=>({...x,...breakdown(s,x)}));}
window.GAME_DATA={actions:D.actions,machineIds:D.machines.map(m=>m.id),monthlyBackForty:D.advanced.scenarios.backFortyMonthlyTheo,inspectionDowntime:D.advanced.scenarios.recommended[0].downtimeCost};
window.AceEvidence={data:D,machines,guests,concentration,breakdown,scenarios};
})();

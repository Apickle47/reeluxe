/* Shared, read-only what-if calculations for Ace. All figures are fictional. */
(function(root){'use strict';const C=root.AceSimCore;
function preview(state,args={}){let s=JSON.parse(JSON.stringify(state)),cost=0;
for(const k of ['menu','crew','promo'])if(args[k]!==undefined){if(![0,1,2].includes(args[k]))throw Error('Invalid setting');s[k]=args[k];}
if(args.action&&args.action!=='none'){const before=s.cash;s=C.action(s,args.action,args.machine_id,args.zone);cost=before-s.cash;}
const n=C.shift(s,args.response||'host').last;return {fictional_simulation:true,upfront_cost:cost,nightly_profit:n.net,net_after_upfront_cost:n.net-cost,guests_served:n.served,guests_missed:n.missed,happiness:n.rating,bonus:n.rewards.reduce((v,r)=>v+r.reward,0)};}
function compare(state,id){const m=state.machines.find(m=>m.id===id)||state.machines[0];const choices=[{label:'Keep things as they are',choice:{}}];
if(m.wear>0&&state.cash>=C.cost(state,'repair',m.id))choices.push({label:`Repair machine ${m.id}`,choice:{action:'repair',machine_id:m.id}});
if(m.l<3&&state.cash>=C.cost(state,'upgrade',m.id))choices.push({label:`Upgrade machine ${m.id}`,choice:{action:'upgrade',machine_id:m.id}});
if(choices.length<3){const z=C.forecast(state).zone;if(m.z!==z&&state.machines.filter(x=>x.z===z).length<4&&state.cash>=80)choices.push({label:`Move machine ${m.id} to ${C.zones[z]}`,choice:{action:'move',machine_id:m.id,zone:z}});}
return choices.map(x=>({...x,result:preview(state,x.choice)}));}
function futures(state,id){
 const m=state.machines.find(x=>x.id===id);if(!m)throw Error('Choose a machine first.');
 const zones=[m.z,C.forecast(state).zone,0,1,2];const zone=zones.find(z=>state.machines.filter(x=>x.z===z).length<4);
 const rows=[{label:'Keep cash',choice:{}},{label:`Repair machine ${id}`,choice:{action:'repair',machine_id:id}},{label:zone===undefined?'Buy: floor is full':`Buy in ${C.zones[zone]}`,choice:{action:'buy',zone}}].map(r=>{try{if(r.choice.action==='buy'&&zone===undefined)throw Error('All twelve spaces are occupied.');return {...r,result:preview(state,r.choice)};}catch(e){return {...r,unavailable:e.message};}});
 const base=rows[0].result.net_after_upfront_cost;
 for(const r of rows)if(r.result)r.difference=r.result.net_after_upfront_cost-base;
 return {night:state.day,machine_id:id,rows,assumption:'One fictional night with the same starting seed and current settings; greet guests response. Adding a machine can change random-event draws. This is a scenario, not a forecast or guaranteed profit.',placement:'A new machine goes beside the selected one if there is room; otherwise the forecast hot spot, then the first free area.'};
}
root.AceAdvisor={preview,compare,futures};if(typeof module!=='undefined')module.exports=root.AceAdvisor;
})(typeof window==='undefined'?globalThis:window);

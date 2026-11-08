/* Read-only, reproducible fictional rehearsals. Never historical casino forecasts. */
(function(root){'use strict';
const C=root.AceSimCore,N=24,copy=x=>JSON.parse(JSON.stringify(x));
function catalog(s,id){
 if(!C.valid(s))throw Error('Invalid floor');
 const m=s.machines.find(x=>x.id===id);if(!m)throw Error('Choose a machine first');
 const plans=[{id:'keep',label:'Your current plan',upfront:0,choice:{}}];
 function add(id,label,choice){try{const upfront=choice.action?s.cash-C.action(s,choice.action,choice.machine_id,choice.zone).cash:0;plans.push({id,label,choice,upfront});}catch{}}
 for(const [key,values] of [['menu',C.menus],['crew',C.staff],['promo',[{name:'Word of mouth'},{name:'Flyers'},{name:'City buzz'}]]])
  values.forEach((v,i)=>{if(i!==s[key])add(key+'-'+i,v.name,{[key]:i});});
 add('repair-'+id,'Repair machine '+id,{action:'repair',machine_id:id});
 add('upgrade-'+id,'Upgrade machine '+id,{action:'upgrade',machine_id:id});
 C.zones.forEach((z,i)=>{add('buy-'+i,'Add a machine in '+z,{action:'buy',zone:i});add('move-'+id+'-'+i,'Move machine '+id+' to '+z,{action:'move',machine_id:id,zone:i});});
 return plans;
}
function apply(s,planId,id){
 const plan=catalog(s,id).find(x=>x.id===planId);if(!plan)throw Error('That plan is no longer available');
 let out=copy(s);for(const key of ['menu','crew','promo'])if(plan.choice[key]!==undefined)out[key]=plan.choice[key];
 if(plan.choice.action)out=C.action(out,plan.choice.action,plan.choice.machine_id,plan.choice.zone);
 return out;
}
function scenarioSeed(seed,index){let x=(seed^Math.imul(index+1,0x9e3779b9))>>>0;x=Math.imul(x^(x>>>16),0x85ebca6b);x=Math.imul(x^(x>>>13),0xc2b2ae35);return (x^(x>>>16))>>>0;}
function run(s,planId,id){
 const plan=catalog(s,id).find(x=>x.id===planId);if(!plan)throw Error('Unknown or unavailable plan');
 const changed=apply(s,planId,id),upfront=s.cash-changed.cash;
 const values=[],baseValues=[],deltas=[],moods=[],baseMoods=[];
 for(let i=0;i<N;i++){
  const seed=scenarioSeed(s.seed,i),a=C.shift({...copy(s),seed},'host').last,b=C.shift({...copy(changed),seed},'host').last;
  values.push(b.net-upfront);baseValues.push(a.net);deltas.push(b.net-upfront-a.net);moods.push(b.rating);baseMoods.push(a.rating);
 }
 const mean=xs=>xs.reduce((a,b)=>a+b,0)/xs.length;
 return {id:plan.id,label:plan.label,choice:plan.choice,samples:N,upfront,averageNet:mean(values),baselineAverage:mean(baseValues),averageGain:mean(deltas),lowestNet:Math.min(...values),highestNet:Math.max(...values),worstDifference:Math.min(...deltas),betterNights:deltas.filter(x=>x>0).length,worseNights:deltas.filter(x=>x<0).length,averageHappiness:mean(moods),happinessChange:mean(moods)-mean(baseMoods)};
}
function report(s,ids,id){
 const unique=[...new Set(ids)];if(unique.length>3)throw Error('At most three ideas');
 const rows=[run(s,'keep',id),...unique.filter(x=>x!=='keep').map(x=>run(s,x,id))];
 const best=[...rows].sort((a,b)=>b.averageNet-a.averageNet||b.averageHappiness-a.averageHappiness)[0];
 return {night:s.day,machineId:id,samples:N,rows,bestId:best.id,version:1,assumption:'24 alternative versions of tonight, not 24 consecutive nights or a forecast. Same starting floor, event and paired seed for each comparison; greet-guests response. Costs counted once, building bonuses excluded. Buying or moving can change random-draw order. Later nights and guest retention are not modeled. The best average is only among the ideas tested; simulated frequencies are not real-world probabilities.'};
}
function reasons(result,planId){const r=result.rows.find(x=>x.id===planId);if(!r)return [];const out=[];if(r.id==='keep')out.push('keep_plan');if(r.averageGain>0)out.push('more_cash');if(r.happinessChange>0)out.push('happier_guests');if(r.choice.action==='repair')out.push('repair_wear');if(r.id!=='keep'&&r.upfront===0)out.push('no_upfront_cost');return out;}
function finalize(s,ids,id,pickId,reason){const result=report(s,ids,id);if(!reasons(result,pickId).includes(reason))throw Error('That reason is not supported by the tested plan');return {...result,pickId,reason};}
function narrate(result){const r=result.rows.find(x=>x.id===result.pickId);if(!r||!reasons(result,r.id).includes(result.reason))throw Error('Invalid checked decision');const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Math.abs(n));if(r.id==='keep')return result.bestId==='keep'?'Keep your current plan. None of the tested changes improved average profit after costs. Some may help guests or maintenance instead—open the comparison to see the tradeoffs.':'Keep your current plan for now. A tested change earned more on average, but it comes with a different tradeoff. Open the comparison before choosing.';const profit=r.averageGain>0?`${money(r.averageGain)} more`:`${money(r.averageGain)} less`;const mood=Math.abs(r.happinessChange)<.05?'similar guest happiness':`${Math.abs(r.happinessChange).toFixed(1)} points ${r.happinessChange>0?'higher':'lower'} guest happiness`;return `${r.label}: ${profit} average profit after costs, with ${mood}. ${r.worseNights?`It earned less than your current plan in ${r.worseNights} of ${N} practice runs.`:'It did not earn less in these practice runs.'} Tonight can differ.`;}
const api={catalog,apply,run,report,reasons,finalize,narrate,scenarioSeed,samples:N};root.AceRehearsal=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);

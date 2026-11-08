/* Transparent adaptation: guidance changes; odds, prices and rewards do not. */
(function(root){'use strict';
function context(s,detail='simple'){
 const style=detail==='numbers'?'numbers':'simple';
 const worn=[...s.machines].sort((a,b)=>b.wear-a.wear)[0];
 let focus='start',reason='You are starting a new floor.',tip='Open for one night with the current settings. Then look at your night report.',question='What should I look at after my first night?';
 if(worn.wear>=65){focus='maintenance';reason=`Machine ${worn.id} has ${Math.round(100-worn.wear)}% condition.`;tip=`Check machine ${worn.id} before buying more. A repair could restore space for guests; compare its cost first.`;question=`Compare repairing machine ${worn.id} with keeping cash.`;}
 else if(s.cash<300){focus='cash';reason='Your available cash is below $300.';tip='Use the free smaller-floor restart if you need breathing room. There is no penalty for taking a break.';question='How can I reopen with lower running costs?';}
 else if(s.last && s.last.missed>Math.max(10,s.last.visitors*.25)){focus='capacity';reason=`${s.last.missed} guests could not find space last night.`;tip='Check which area filled up before paying for more advertising. Moving an existing machine may be cheaper than buying one.';question='Compare a move to the busy area with keeping my floor as it is.';}
 else if(s.day>1&&s.last?.net<0){focus='costs';reason='Your last night cost more than it earned.';tip='Try comparing a smaller crew or less advertising. Change one thing so the next report is easier to understand.';question='Compare cheaper staffing with my current setup.';}
 else if(s.day>1){focus='tradeoffs';reason='You have a completed night to compare.';tip='Try before spending: compare the upfront cost with the next night’s gain. An upgrade can help later without paying for itself tonight.';question='Compare an upgrade with keeping cash and show the tradeoff.';}
 return {style,focus,reason,tip,question,rule:'Guidance only: no changes to game odds, costs, rewards or difficulty.'};
}
root.AceCoach={context};if(typeof module!=='undefined')module.exports=root.AceCoach;
})(typeof window==='undefined'?globalThis:window);

const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const code=fs.readFileSync(__dirname+'/dist/game.js','utf8');
function state(overrides={}){return {v:1,phase:'plan',order:['leak','mover','trend'],index:2,opened:{leak:[0,1,2],mover:[0,1,2],trend:[0,1,2]},answers:{leak:0,mover:1,trend:2},quantities:{},targets:{'A-INSPECT':'M-1158','A-REPLACE-LEASE':'M-5076','A-REPLACE-BUY':'M-5076'},lift:2,switching:50,recovery:3000,repair:1500,compRate:12.5,reason:'Inspect the anomaly before committing capital.',ack:true,...overrides};}
function run(s,inspect=false){const nodes={};const node=id=>nodes[id]??={style:{},classList:{add(){},remove(){}},handlers:{},addEventListener(k,f){this.handlers[k]=f;},setAttribute(){}};const ctx={window:{},CustomEvent:class{},document:{body:{dataset:{}},dispatchEvent(){},getElementById:node,querySelectorAll:()=>[],querySelector:()=>null,addEventListener(k,f){node("stage").handlers[k]=f;}},LocalStorageManager:class {getGameState(){return s;}setGameState(){}getBestScore(){return 0;}setBestScore(){}},Intl,console,setTimeout,clearTimeout};vm.createContext(ctx);for(const f of ['evidence-data.js','evidence-engine.js','decision.js'])vm.runInContext(fs.readFileSync(__dirname+'/dist/'+f,'utf8'),ctx);vm.runInContext(code,ctx);return inspect?{game:ctx.window.AceGame,nodes}:ctx.window.AceGame;}
let n=0;function check(label,fn){fn();n++;console.log('PASS '+label);}
check('Holding cash is valid',()=>assert.equal(run(state()).validate().length,0));
check('Perfect evidence and valid result scores 100',()=>assert.equal(run(state({phase:'result'})).points(),100));
check('Inspection base contribution',()=>assert.ok(Math.abs(run(state({quantities:{'A-INSPECT':1}})).estimate().net-276.0547575)<.001));
check('Inspection downside includes lost play',()=>assert.ok(Math.abs(run(state({quantities:{'A-INSPECT':1},recovery:0})).estimate().net+1223.9452425)<.001));
check('Lease includes 16 daily charges',()=>assert.equal(run(state({quantities:{'A-REPLACE-LEASE':1}})).estimate().net,-3380));
check('Budget cap enforced',()=>assert.ok(run(state({quantities:{'A-REPLACE-BUY':5}})).validate().some(x=>x.includes('budget'))));
check('Negative quantity rejected',()=>assert.ok(run(state({quantities:{'A-INSPECT':-1}})).validate().length));
check('Fractional quantity rejected',()=>assert.ok(run(state({quantities:{'A-INSPECT':.5}})).validate().length));
check('Missing target rejected',()=>assert.ok(run(state({quantities:{'A-INSPECT':2}})).validate().length));
check('Duplicate machine allocation rejected',()=>assert.ok(run(state({quantities:{'A-REPLACE-LEASE':1,'A-REPLACE-BUY':1}})).validate().some(x=>x.includes('both'))));
check('Conflicting policies rejected',()=>assert.ok(run(state({quantities:{'A-COMP-PILOT':1,'A-COMP-CHANGE':1}})).validate().some(x=>x.includes('conflicts'))));
check('Maximum three action types',()=>assert.ok(run(state({quantities:{'A-INSPECT':1,'A-WAYFINDING':1,'A-COMP-PILOT':1,'A-REPLACE-LEASE':1}})).validate().some(x=>x.includes('three'))));
check('Full switching removes signage benefit',()=>assert.equal(run(state({quantities:{'A-WAYFINDING':1},switching:100})).estimate().net,-7500));
check('Unacknowledged uncertainty rejected',()=>assert.ok(run(state({ack:false})).validate().length));
check('Missing rationale rejected',()=>assert.ok(run(state({reason:''})).validate().length));
check('Wrong version safely resets',()=>assert.equal(run({v:0}).getState(),null));
console.log(n+' game-engine checks passed.');
check('Bank move conflicts with member replacement',()=>assert.ok(run(state({quantities:{'A-MOVE-BANK':1,'A-REPLACE-BUY':1},targets:{'A-MOVE-BANK':'B-01','A-REPLACE-BUY':'M-1001'}})).validate().some(x=>x.includes('both'))));
check('Move and lease conflict',()=>assert.ok(run(state({quantities:{'A-MOVE-MACHINE':1,'A-REPLACE-LEASE':1},targets:{'A-MOVE-MACHINE':'M-1001','A-REPLACE-LEASE':'M-1001'}})).validate().some(x=>x.includes('both'))));
check('Unknown action rejected',()=>assert.ok(run(state({quantities:{FAKE:1}})).validate().some(x=>x.includes('Unknown'))));
check('Nonfinite scenario rejected',()=>assert.equal(run(state({lift:NaN})).getState(),null));
check('Out-of-range switching rejected',()=>assert.ok(run(state({switching:105})).validate().length));
check('Repair reserve is enforced by engine',()=>assert.ok(run(state({quantities:{'A-INSPECT':1,'A-REPLACE-BUY':4,'A-PREVENTIVE':1},repair:6000,targets:{'A-INSPECT':'M-1158','A-REPLACE-BUY':'M-1001,M-1002,M-1003,M-1004','A-PREVENTIVE':'Halcyon'}})).validate().some(x=>x.includes('reserve'))));
check('Guest policy bounds enforced',()=>assert.ok(run(state({quantities:{'A-COMP-CHANGE':1},compRate:30})).validate().length));
console.log(n+' total game-engine checks passed.');

function preset(test,key){test.nodes.stage.handlers.click({target:{closest:()=>({dataset:{preset:key},hasAttribute:()=>false})}});return test.game.getState();}
check('Opening a custom saved plan does not replace its actions or costs',()=>{const t=run(state({quantities:{'A-INSPECT':1,'A-SURVEY':1},extraCosts:420}),true);assert.equal(t.game.getState().extraCosts,420);assert.equal(t.game.getState().quantities['A-SURVEY'],1);});
check('Choosing inspection replaces custom costs and restores the intended target',()=>{const t=run(state({quantities:{'A-REPLACE-BUY':3},extraCosts:500,targets:{'A-INSPECT':'M-1001'}}),true),s=preset(t,'inspect');assert.equal(s.extraCosts,0);assert.equal(Object.keys(s.quantities).length,1);assert.equal(s.targets['A-INSPECT'],'M-1158');assert.equal(s.ack,false);assert.ok(Math.abs(t.game.estimate().net-276.0547575)<.001);});
check('Location preset supplies a valid Back Forty target',()=>{const t=run(state(),true);preset(t,'location');const s=t.game.getState();assert.equal(s.targets['A-WAYFINDING'],'Back Forty');assert.equal(t.game.validate().length,1);assert.ok(t.game.validate()[0].startsWith('Acknowledge'));});
check('Pilot preset removes conflicting floor-wide policy',()=>{const t=run(state({quantities:{'A-COMP-CHANGE':1}}),true);preset(t,'pilot');assert.equal(t.game.getState().quantities['A-COMP-CHANGE'],undefined);assert.equal(t.game.estimate().net,-4000);});
check('Holding budget clears action and additional cost commitments',()=>{const t=run(state({quantities:{'A-INSPECT':1},extraCosts:500}),true);preset(t,'hold');assert.equal(t.game.estimate().net,0);assert.equal(t.game.getState().extraCosts,0);});
check('Switching plan preserves completed learning answers and rationale',()=>{const t=run(state(),true),before=t.game.getState();preset(t,'location');const after=t.game.getState();assert.equal(JSON.stringify(after.answers),JSON.stringify(before.answers));assert.equal(after.reason,before.reason);});
console.log(n+' total game and plan-transition checks passed.');
for(const id of ['leak','mover','trend','downtime','model','pilot'])check('Plain-language replay case: '+id,()=>{const t=run(state({phase:'case',order:[id,'leak','mover'],index:0,opened:{[id]:[0,1,2]},answers:{}}),true);assert.doesNotMatch(t.nodes.stage.innerHTML,/holdout|bootstrap|nominal|pretrend|paytable|per arm|displacement|statistical power/i);assert.match(t.nodes.stage.innerHTML,/data-answer/);});
console.log(n+' total game checks passed.');

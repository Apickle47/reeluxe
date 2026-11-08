const assert=require('node:assert/strict'),C=require('./dist/sim-core.js'),A=require('./dist/ace-advisor.js');let n=0;
function test(name,fn){fn();n++;console.log('PASS',name);}
test('comparison leaves cash and seed unchanged',()=>{const s=C.fresh(),before=JSON.stringify(s);A.compare(s,1);assert.equal(JSON.stringify(s),before);});
test('baseline matches actual next shift',()=>{const s=C.fresh(),r=A.preview(s);assert.equal(r.nightly_profit,C.shift(s).last.net);assert.equal(r.upfront_cost,0);});
test('purchase cost is deducted once',()=>{const s=C.fresh(),r=A.preview(s,{action:'upgrade',machine_id:1});assert.equal(r.upfront_cost,650);assert.equal(r.net_after_upfront_cost,r.nightly_profit-650);});
test('unaffordable recommendations excluded',()=>{const rows=A.compare({...C.fresh(),cash:0},1);assert.equal(rows.length,1);});
test('selected machine determines price and comparison',()=>{const s=C.action(C.fresh(),'upgrade',2);const row=A.compare(s,2).find(x=>x.choice.action==='upgrade');assert.equal(row.result.upfront_cost,1300);});
test('repair preview restores service to broken floor',()=>{const s=C.fresh();s.machines.forEach(m=>m.wear=100);assert.equal(A.preview(s).guests_served,0);assert(A.preview(s,{action:'repair',machine_id:1}).guests_served>0);});
test('invalid moves and settings rejected',()=>{assert.throws(()=>A.preview(C.fresh(),{action:'move',machine_id:1,zone:0}));assert.throws(()=>A.preview(C.fresh(),{crew:5}));});
console.log(`${n} advisor checks passed`);

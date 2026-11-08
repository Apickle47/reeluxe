const assert=require('node:assert/strict');
global.window={};for(const f of ['evidence-data','evidence-engine','decision'])require('./dist/'+f+'.js');
const E=window.AceEvidence,J=window.AceDecision,rows=J.shortlist();let n=0;
function check(label,fn){fn();n++;console.log('PASS '+label);}
check('Original shortlist is exactly the ten lowest full-window actual earners',()=>assert.deepEqual(rows.map(m=>m.id),E.machines().sort((a,b)=>a.houseWin-b.houseWin).slice(0,10).map(m=>m.id)));
check('Inactive IDs receive no July replacement or inspection',()=>assert.deepEqual(rows.filter(m=>!m.activeJune).map(m=>m.id),['M-1120','M-1118']));
check('Single funded inspection matches catalogue and active evidence',()=>{const r=rows.filter(m=>m.action.startsWith('Inspect'));assert.equal(r.length,1);assert.equal(r[0].id,'M-1158');assert.equal(r[0].activeJune,true);assert.equal(E.data.actions.find(a=>a[0]==='A-INSPECT')[3],1200);});
check('Short-exposure active machine is explicitly distinguished',()=>{const m=rows.find(m=>m.id==='M-5076');assert.equal(m.days,49);assert.match(m.action,/longer history/);});
check('All ten have evidence, uncertainty and an actionable next step',()=>rows.forEach(m=>{for(const k of ['reason','uncertainty','next'])assert.ok(m[k].length>20);}));
check('Scheduling uses training data minimum only',()=>{const s=J.schedule();assert.equal(s.day,'Tue');assert.equal(s.mean,Math.min(...Object.values(E.data.forecast.weekdayMeans)));});
check('Inspection date respects lead time and weekday',()=>{const s=J.schedule();assert.equal(s.date,'2025-07-08');assert.equal(new Date(s.date+'T00:00:00Z').getUTCDay(),2);assert.ok(new Date(s.date)>new Date('2025-07-01'));});
console.log(n+' decision checks passed.');

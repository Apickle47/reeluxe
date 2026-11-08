/* Run with Playwright: module exports an async function accepting a loaded page. */
module.exports=async function(page){
const results=await page.evaluate(()=>{
 const D=JSON.parse(document.getElementById('data').textContent),F=Object.fromEntries(D.machineFields.map((k,i)=>[k,i])),P=Object.fromEntries(D.playerFields.map((k,i)=>[k,i]));
 const $=id=>document.getElementById(id);let machineViews=0,guestViews=0,assertions=0;
 const check=(v,msg)=>{assertions++;if(!v)throw Error(msg);};
 const select=(id,v)=>{$(id).value=String(v);$(id).dispatchEvent(new Event('change',{bubbles:true}));};
 const fmt=v=>{const a=Math.abs(v),s=v<0?'−':'';return s+'$'+(a>=1e6?(a/1e6).toFixed(2)+'M':a>=1e4?Math.round(a/1e3)+'k':a>=1e3?(a/1e3).toFixed(1)+'k':Math.round(a));};
 const fixed=['moversStudy','pretrendStudy','matchedLoss','rollingStudy','fcStats','budgetNote'].map(id=>[id,$(id).textContent]);
 function machine(f,t,z,b){
  const expected=D.machines.map(m=>({id:m.id,rows:m.segments.filter(s=>s[0]>=f&&s[0]<=t&&(z==='All'||s[1]===z)&&(b==='All'||s[2]===b))})).filter(m=>m.rows.length).map(m=>({id:m.id,ci:m.rows.reduce((a,s)=>a+s[3][F.coinIn],0),hw:m.rows.reduce((a,s)=>a+s[3][F.houseWin],0)}));
  check($('fNote').textContent.endsWith(expected.length+' machines'),'machine count '+[f,t,z,b]);
  check($('kpis').querySelector('.v').textContent===fmt(expected.reduce((s,m)=>s+m.ci,0)),'coin-in '+[f,t,z,b]);
  const ids=[...$('bottomTable').querySelectorAll('tbody tr')].map(tr=>tr.cells[0].textContent);
  check(ids.join()===expected.sort((a,b)=>a.hw-b.hw).slice(0,10).map(m=>m.id).join(),'rank '+[f,t,z,b]);
  machineViews++;
 }
 for(let f=0;f<6;f++)for(let t=f;t<6;t++){
  $('fReset').click();select('fFrom',f);select('fTo',t);
  const zones=[...$('fZone').options].map(o=>o.value);
  for(const z of zones){select('fZone',z);const banks=[...$('fBank').options].map(o=>o.value);
   for(const b of banks){select('fBank',b);machine(f,t,z,b);}
  }
  select('fZone','All');
  for(const tier of [...$('fTier').options].map(o=>o.value))for(const region of [...$('fRegion').options].map(o=>o.value)){
   select('fTier',tier);select('fRegion',region);
   const rows=D.players.filter(r=>D.months.indexOf(r[P.month])>=f&&D.months.indexOf(r[P.month])<=t&&(tier==='All'||r[P.tier]===tier)&&(region==='All'||r[P.region]===region));
   const ci=rows.reduce((a,r)=>a+r[P.coinIn],0);
   check($('ptiles').querySelector('.v').textContent===fmt(ci),'guest coin '+[f,t,tier,region]);guestViews++;
  }
 }
 $('fReset').click();
 for(const [id,text]of fixed)check($(id).textContent===text,'fixed panel changed '+id);
 check(!/\b(NaN|undefined|Infinity)\b/.test(document.body.innerText),'nonfinite visible content');
 check($('bottomTable').querySelectorAll('th').length===6,'simplified table');
 return {machineViews,guestViews,assertions};
});
await page.selectOption('#fZone','Back Forty');await page.selectOption('#fFrom','3');
await page.waitForFunction(()=>document.getElementById('scope-bottomTable').textContent.includes('Apr 2025')&&document.getElementById('scope-bottomTable').textContent.includes('Back Forty'));
await page.click('#fReset');
await page.locator('#bottomTable details').first().locator('summary').click();
if(!await page.locator('#bottomTable details').first().getAttribute('open').then(x=>x!==null))throw Error('details did not open');
for(const [id,value,expected]of [['switching','100','$0'],['switching','0','$102,216']]){
 await page.locator('#'+id).evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input'));},value);
 if(!(await page.locator('#switchResult').innerText()).includes(expected))throw Error('switching control '+value);
}
await page.locator('#cann').evaluate(e=>{e.value='100';e.dispatchEvent(new Event('input'));});
if(!(await page.locator('#scenarioResult').innerText()).includes('-$11,224'))throw Error('scenario control');
await page.locator('#pilotProtocol summary').click();
if(!(await page.locator('#pilotDetails').innerText()).includes('10,288'))throw Error('pilot not readable');
const broken=await page.evaluate(()=>[...document.querySelectorAll('a[href^="#"]')].map(a=>a.getAttribute('href')).filter(h=>h.length>1&&!document.getElementById(h.slice(1))));
if(broken.length)throw Error('broken evidence anchors '+broken);
await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#dragLever').press('Enter');
if(!(await page.locator('#spinStatus').innerText()).includes('Spin complete'))throw Error('keyboard spin');
await page.locator('#sceneMotion').click();
await page.setViewportSize({width:390,height:844});
const mobile=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}));
if(mobile.document>mobile.viewport)throw Error('mobile page overflow');
await page.setViewportSize({width:1440,height:1050});await page.click('#fReset');
return {...results,mobile,details:true,sliders:true,links:true,keyboardSpin:true};
};

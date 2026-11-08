/* The slot sequence is a scripted entrance, not a random reward. */
(()=>{
const $=id=>document.getElementById(id), body=document.body;
function view(name){
  body.dataset.view=name;body.classList.remove('entry-running','entry-jackpot','entry-zoom','entry-fade');
  window.scrollTo(0,0);
  if(name==='welcome'){
    const saved=window.AceSim.getState();
    $('welcomeStart').textContent=saved&&saved.day>1?'Back to my casino →':'Open my casino →';
    $('welcome').focus({preventScroll:true});
  }
  if(name==='game'){if(body.dataset.mode==='sim')window.AceSim.enter();else{window.AceGame.enter();window.AceDesk?.show('brief',false);window.AceFindings.enter();}}
}
function route(){const page=location.hash;document.querySelectorAll('[data-main-route]').forEach(a=>{if(a.dataset.mainRoute===(page==='#analysis'?'analysis':'game'))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});body.dataset.mode=page==='#analysis'?'analysis':'sim';view(page==='#game'||page==='#analysis'?'game':page==='#welcome'?'welcome':'lobby');}
function welcome(){window.gildedScene?.reset();location.hash='welcome';if(body.dataset.view!=='welcome')view('welcome');}
function start(){if(window.gildedScene)window.gildedScene.spin();else welcome();}
$('start').onclick=start;
$('resume').onclick=()=>{location.hash='game';};
$('clearSave').onclick=()=>{if(!confirm('Clear your simulator progress, investigation save and personal best on this browser?'))return;for(const key of ['ace-tycoon-v1','ace-help-style','ace-investigation-notes','gildedAceBestV1','gildedAceShiftV1'])localStorage.removeItem(key);window.AceSim.reset();location.reload();};
$('welcomeStart').onclick=()=>{location.hash='game';};
$('skipIntro').onclick=welcome;$('cancelEntry').onclick=welcome;
document.querySelectorAll('[data-lobby]').forEach(b=>b.onclick=()=>{window.gildedScene?.reset();location.hash='lobby';});
document.querySelectorAll('a[href="#floor"]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();welcome();}));
window.addEventListener('ace:entered',welcome);
window.addEventListener('hashchange',()=>{window.gildedScene?.reset();route();});
const brand=document.querySelector('.nav .brand');brand.addEventListener('click',()=>window.gildedScene?.reset());

route();
})();

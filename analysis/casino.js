/* Adapted from Virtual Slot Machine, Copyright (c) 2015 Kevin Ellis, MIT.
 * Original reel geometry, texture, eight-segment spin concept retained.
 * See vendor/VirtualSlotMachine-LICENSE.txt. New cabinet, room and controls.
 */
(function(){
'use strict';
const host=document.getElementById('casinoScene'),status=document.getElementById('spinStatus');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch(e){status.textContent='3D is unavailable in this browser. The dashboard below is fully available.';return;}
renderer.setClearColor(0x000000,0);renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));
host.insertBefore(renderer.domElement,host.firstChild);renderer.domElement.setAttribute('aria-label','Three-dimensional Gilded Ace casino and slot machine');
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(39,1,.1,500);

const cabinet=new THREE.Object3D();scene.add(cabinet);
function mat(color,shine){return new THREE.MeshPhongMaterial({color:color,ambient:color,specular:0xb7a78a,shininess:shine||35});}
const gold=mat(0x8b6d37,65),dark=mat(0x111315,38),black=mat(0x071015),trim=mat(0x716349),red=mat(0xb83c32,100);
function box(parent,w,h,d,x,y,z,material){
  let geometry;
  if(d>.25){
    const radius=Math.min(w*.12,h*.12,.55),bevel=Math.min(d*.12,w*.08,h*.08,.14);
    const left=-w/2+bevel,right=w/2-bevel,low=-h/2+bevel,high=h/2-bevel,r=Math.min(radius,(right-left)/3,(high-low)/3),shape=new THREE.Shape();
    shape.moveTo(left+r,low);shape.lineTo(right-r,low);shape.quadraticCurveTo(right,low,right,low+r);shape.lineTo(right,high-r);shape.quadraticCurveTo(right,high,right-r,high);shape.lineTo(left+r,high);shape.quadraticCurveTo(left,high,left,high-r);shape.lineTo(left,low+r);shape.quadraticCurveTo(left,low,left+r,low);
    geometry=new THREE.ExtrudeGeometry(shape,{amount:d-2*bevel,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:4,curveSegments:12,steps:1});
    geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0,0,-d/2+bevel));
  }else geometry=new THREE.BoxGeometry(w,h,d);
  const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);parent.add(m);return m;
}
function textPanel(parent,text,w,h,x,y,z,size){const c=document.createElement('canvas');c.width=1024;c.height=256;const g=c.getContext('2d');g.fillStyle='#102724';g.fillRect(0,0,1024,256);g.strokeStyle='#c8a462';g.lineWidth=8;g.strokeRect(12,12,1000,232);g.fillStyle='#efd8a4';g.font=(size||68)+'px Georgia';g.textAlign='center';g.textBaseline='middle';g.fillText(text,512,130);const t=new THREE.Texture(c);t.needsUpdate=true;return box(parent,w,h,.15,x,y,z,new THREE.MeshBasicMaterial({map:t}));}
box(cabinet,14,25,7,0,-1,0,dark);box(cabinet,14.5,.65,7.5,0,-13,0,trim);
box(cabinet,14.5,.35,7.5,0,11.7,0,trim);box(cabinet,14,4,7,0,13.5,0,dark);
box(cabinet,14,2.9,7,0,9.8,0,black);textPanel(cabinet,'7 7 7   •   THREE OF A KIND',12,1.7,0,10,3.7,42);
textPanel(cabinet,'GILDED JACKPOT',13,3,0,13.5,3.6,75);
box(cabinet,12,9,1,0,4,3,black);
[-6.5,-1.65,1.65,6.5].forEach(x=>box(cabinet,.3,9.5,1,x,4,6.9,gold));
box(cabinet,13.2,.5,1,0,8.7,6.9,gold);box(cabinet,13.2,.5,1,0,-.7,6.9,gold);
box(cabinet,14,.85,9,0,-2.1,1,dark);box(cabinet,13,.4,8.5,0,-1.9,1.2,black);
artPanel(cabinet,12,6,0,-7,3.6);
function artPanel(parent,w,h,x,y,z){const c=document.createElement('canvas');c.width=1024;c.height=512;const g=c.getContext('2d');let grd=g.createRadialGradient(512,250,30,512,250,560);grd.addColorStop(0,'#b77c27');grd.addColorStop(.5,'#49301a');grd.addColorStop(1,'#0c1012');g.fillStyle=grd;g.fillRect(0,0,1024,512);g.strokeStyle='#d8b976';g.lineWidth=10;g.strokeRect(15,15,994,482);g.lineWidth=2;g.strokeRect(30,30,964,452);g.textAlign='center';g.fillStyle='#f9e2a9';g.font='bold 70px Georgia';g.fillText('THE GILDED ACE',512,110);g.font='150px Georgia';g.fillText('♠  ♦  ♣',512,290);g.font='32px Georgia';g.fillText('LUCK · LOCATION · A LEAK?',512,425);for(let i=0;i<26;i++){const a=i*2.4;g.beginPath();g.arc(512+Math.cos(a)*410,255+Math.sin(a)*160,3,0,Math.PI*2);g.fill();}const t=new THREE.Texture(c);t.needsUpdate=true;box(parent,w,h,.12,x,y,z,new THREE.MeshBasicMaterial({map:t}));}

box(cabinet,4,.5,.4,0,-3.7,5,black);box(cabinet,9,.7,2,0,-11.2,4,gold);
const lever=new THREE.Object3D();lever.position.set(8,-1,0);cabinet.add(lever);
const arm=new THREE.Mesh(new THREE.CylinderGeometry(.2,.28,8,48),gold);arm.position.y=4;lever.add(arm);
const knob=new THREE.Mesh(new THREE.SphereGeometry(.85,48,32),red);knob.position.y=8;lever.add(knob);
const parsed=new THREE.JSONLoader().parse(Object.assign({},window.ACE_WHEEL,{materials:[]}));
const image=new Image(),texture=new THREE.Texture(image);image.onload=()=>{texture.needsUpdate=true;};image.src=window.ACE_TEXTURE;
const wheelMat=new THREE.MeshFaceMaterial([new THREE.MeshPhongMaterial({map:texture,color:0xf4dfb5,ambient:0xb9aa8a,shininess:18}),gold]);
const wheels=[];for(let i=0;i<3;i++){const w=new THREE.Mesh(parsed.geometry,wheelMat);w.scale.set(4.9,4,4);w.position.set((i-1)*3.6,4,3);w.rotation.x=-.2;cabinet.add(w);wheels.push(w);}
// Photographic cabinet facade on a silhouette mesh; a real opening exposes the 3D reels.
cabinet.children.forEach(child=>{if(!wheels.includes(child)&&child!==lever)child.visible=false;});
const facadeShape=new THREE.Shape();
const outline=[[.115,.975],[.14,.90],[.14,.57],[.17,.52],[.18,.17],[.20,.12],[.28,.085],[.42,.069],[.43,.04],[.47,.02],[.5,.005],[.53,.02],[.57,.04],[.58,.069],[.73,.085],[.80,.12],[.83,.17],[.83,.52],[.86,.57],[.86,.90],[.885,.975],[.88,.995],[.12,.995]];
const xy=(u,v)=>[(u-.5)*18,16-v*30];outline.forEach(([u,v],i)=>{const q=xy(u,v);if(i)facadeShape.lineTo(...q);else facadeShape.moveTo(...q);});facadeShape.closePath();
const aperture=new THREE.Path();[[.215,.31],[.775,.31],[.775,.492],[.215,.492]].forEach(([u,v],i)=>{const q=xy(u,v);if(i)aperture.lineTo(...q);else aperture.moveTo(...q);});aperture.closePath();facadeShape.holes.push(aperture);
const facadeGeo=new THREE.ShapeGeometry(facadeShape);facadeGeo.faceVertexUvs[0]=facadeGeo.faces.map(f=>[f.a,f.b,f.c].map(i=>{const v=facadeGeo.vertices[i];return new THREE.Vector2(v.x/18+.5,1-(16-v.y)/30);}));facadeGeo.uvsNeedUpdate=true;
const facadeImage=new Image(),facadeTexture=new THREE.Texture(facadeImage);facadeImage.onload=()=>{facadeTexture.needsUpdate=true;wake();};facadeImage.src=window.ACE_CABINET;
const facade=new THREE.Mesh(facadeGeo,new THREE.MeshBasicMaterial({map:facadeTexture,side:THREE.DoubleSide}));facade.position.z=7.3;cabinet.add(facade);
wheels.forEach((wheel,i)=>{wheel.scale.set(4.5,2.55,2.55);wheel.position.set((i-1)*3.3,4,8.1);});
// The generated poker lounge supplies the photographic environment.
// Small gold chips at the cabinet base anchor the foreground object.
for(let i=0;i<14;i++){const chip=new THREE.Mesh(new THREE.CylinderGeometry(.65,.65,.16,24),gold);chip.position.set(-8+(i%5)*.7,-13+(Math.floor(i/5)*.18),4+(i%3)*.5);cabinet.add(chip);}
// Broad studio reflections add material depth without competing with the room.
const reflectionFaces=[];for(let i=0;i<6;i++){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),gradient=g.createLinearGradient(0,0,128,128);gradient.addColorStop(0,'#181b20');gradient.addColorStop(.35,'#746852');gradient.addColorStop(.45,'#e8d7ae');gradient.addColorStop(.55,'#4b4943');gradient.addColorStop(1,'#12171c');g.fillStyle=gradient;g.fillRect(0,0,128,128);reflectionFaces.push(c);}
const reflection=new THREE.CubeTexture(reflectionFaces);reflection.needsUpdate=true;
gold.envMap=reflection;gold.combine=THREE.MixOperation;gold.reflectivity=.28;
dark.envMap=reflection;dark.combine=THREE.MixOperation;dark.reflectivity=.12;
red.envMap=reflection;red.combine=THREE.MixOperation;red.reflectivity=.22;
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=256;shadowCanvas.height=128;const sg=shadowCanvas.getContext('2d'),shade=sg.createRadialGradient(128,64,8,128,64,110);shade.addColorStop(0,'rgba(0,0,0,.8)');shade.addColorStop(1,'rgba(0,0,0,0)');sg.fillStyle=shade;sg.fillRect(0,0,256,128);const shadowTex=new THREE.Texture(shadowCanvas);shadowTex.needsUpdate=true;const shadow=new THREE.Mesh(new THREE.PlaneGeometry(26,17),new THREE.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.set(0,-13.5,1);scene.add(shadow);
scene.add(new THREE.AmbientLight(0x494449));const key=new THREE.DirectionalLight(0xffe4b1,.78);key.position.set(-20,35,50);scene.add(key);const fill=new THREE.DirectionalLight(0xc5d2da,.36);fill.position.set(30,15,10);scene.add(fill);
const button=document.getElementById('dragLever'),spin=document.getElementById('spinButton'),pause=document.getElementById('sceneMotion');
let dragging=false,startY=0,pull=0,spinning=false,started=0,stops=[],bases=[],turn=0,scrollTurn=0,paused=reduced.matches,visible=true,raf=0;
function spinNow(){if(spinning)return;spinning=true;started=performance.now();bases=wheels.map(w=>w.rotation.x);stops=wheels.map((w,i)=>{const target=Math.floor(Math.random()*8)*Math.PI/4-.2;return target+(Math.ceil((bases[i]-target)/(Math.PI*2))+4+i)*Math.PI*2;});status.textContent='Reels spinning — illustrative only, not a forecast.';spin.disabled=true;button.setAttribute('aria-disabled','true');if(reduced.matches){wheels.forEach((w,i)=>w.rotation.x=stops[i]);finish();}wake();}
function finish(){spinning=false;spin.disabled=false;button.setAttribute('aria-disabled','false');status.textContent='Spin complete. A single result cannot tell us whether a machine underperforms.';}
button.addEventListener('pointerdown',e=>{if(spinning||e.button>0)return;dragging=true;startY=e.clientY;button.setPointerCapture(e.pointerId);button.classList.add('dragging');e.preventDefault();});
button.addEventListener('pointermove',e=>{if(!dragging)return;pull=Math.max(0,Math.min(1,(e.clientY-startY)/100));lever.rotation.x=pull*1.25;button.style.setProperty('--pull',pull*86+'px');status.textContent=pull>.65?'Release to spin':'Pull downward, then release';wake();});
function release(e){if(!dragging)return;dragging=false;button.classList.remove('dragging');const fire=pull>.65&&e.type!=='pointercancel';pull=0;button.style.setProperty('--pull','0px');lever.rotation.x=0;if(fire)spinNow();else{status.textContent='Drag the red lever down to spin, or use the Spin button.';wake();}}
button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
button.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '||e.key==='ArrowDown'){e.preventDefault();spinNow();}});spin.addEventListener('click',spinNow);
pause.textContent=paused?'Enable camera motion':'Pause camera motion';pause.onclick=()=>{paused=!paused;pause.textContent=paused?'Enable camera motion':'Pause camera motion';pause.setAttribute('aria-pressed',String(paused));wake();};
host.addEventListener('pointermove',e=>{if(dragging||e.pointerType==='touch')return;const r=host.getBoundingClientRect();turn=((e.clientX-r.left)/r.width-.5)*8;wake();});host.addEventListener('pointerleave',()=>{turn=0;wake();});
window.addEventListener('scroll',()=>{const r=host.getBoundingClientRect();scrollTurn=Math.max(-1,Math.min(1,(innerHeight/2-r.top-r.height/2)/innerHeight));wake();},{passive:true});
reduced.addEventListener('change',()=>{paused=reduced.matches;if(reduced.matches&&spinning){wheels.forEach((w,i)=>w.rotation.x=stops[i]);finish();}wake();});
function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();wake();}new ResizeObserver(resize).observe(host);
function wake(){if(!raf&&visible)raf=requestAnimationFrame(draw);}
function draw(now){raf=0;const narrow=host.clientWidth<650;camera.position.set(paused||reduced.matches?7:7+turn+scrollTurn*4,narrow?8:10,narrow?95:64);camera.lookAt(new THREE.Vector3(0,1,0));if(spinning){let complete=true;wheels.forEach((w,i)=>{const t=Math.min(1,(now-started)/(2200+i*650));w.rotation.x=bases[i]+(stops[i]-bases[i])*(1-Math.pow(1-t,3));if(t<1)complete=false;});if(complete)finish();}renderer.render(scene,camera);cabinet.updateMatrixWorld(true);const v=new THREE.Vector3(8,7,0).applyMatrix4(cabinet.matrixWorld).project(camera);button.style.left=(v.x*.5+.5)*host.clientWidth+'px';button.style.top=(-v.y*.5+.5)*host.clientHeight+'px';if(spinning)wake();}
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)wake();}).observe(host);image.onload=()=>{texture.needsUpdate=true;wake();};resize();
window.gildedScene={spin:spinNow,get spinning(){return spinning;},get renderer(){return renderer;}};
})();

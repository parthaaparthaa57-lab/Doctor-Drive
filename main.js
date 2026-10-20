import * as THREE from 'three';
import './style.css';
const $=i=>document.getElementById(i);
const S=Object.assign({coins:0,best:null,q:1,mute:false},JSON.parse(localStorage.getItem('cd3d')||'{}'));
const store=()=>localStorage.setItem('cd3d',JSON.stringify(S));
const PITCH=48,LIM=3.5*PITCH,MAXV=28,BRAKE=26,CR=1.5,TIME=120;
const rnd=(a,b)=>a+Math.random()*(b-a), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const roads=[-4,-3,-2,-1,0,1,2,3].map(k=>(k+.5)*PITCH);

// ---------- renderer / scene ----------
const R=new THREE.WebGLRenderer({canvas:$('c'),antialias:S.q>0,powerPreference:'low-power'});
R.setPixelRatio([0.7,1,Math.min(devicePixelRatio,1.5)][S.q]);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x9fc5e8);
scene.fog=new THREE.Fog(0x9fc5e8,40,[110,170,240][S.q]);
const cam=new THREE.PerspectiveCamera(65,1,.1,300);
scene.add(new THREE.HemisphereLight(0xffffff,0x556677,1.1));
const sun=new THREE.DirectionalLight(0xffffff,1.6);scene.add(sun,sun.target);
if(S.q==2){R.shadowMap.enabled=true;sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);const c=sun.shadow.camera;c.left=c.bottom=-70;c.right=c.top=70;}
function resize(){R.setSize(innerWidth,innerHeight,false);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();}
addEventListener('resize',resize);resize();

const ground=new THREE.Mesh(new THREE.PlaneGeometry(500,500).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({color:0x6b8f5e}));
ground.receiveShadow=S.q==2;scene.add(ground);
const roadMat=new THREE.MeshLambertMaterial({color:0x2b2f36}),lineMat=new THREE.MeshBasicMaterial({color:0xe8c547}),L=2*LIM+14;
const gz=new THREE.PlaneGeometry(14,L).rotateX(-Math.PI/2),gx=new THREE.PlaneGeometry(L,14).rotateX(-Math.PI/2);
const lz=new THREE.PlaneGeometry(.3,L).rotateX(-Math.PI/2),lx=new THREE.PlaneGeometry(L,.3).rotateX(-Math.PI/2);
for(const r of roads){
  for(const [g,l,px,pz] of [[gz,lz,r,0],[gx,lx,0,r]]){
    const a=new THREE.Mesh(g,roadMat);a.position.set(px,.02,pz);a.receiveShadow=S.q==2;
    const b=new THREE.Mesh(l,lineMat);b.position.set(px,.04,pz);scene.add(a,b);}}

// buildings: one instanced mesh = one draw call
const solids=[],bm=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshLambertMaterial({flatShading:true}),200);
{let n=0;const m=new THREE.Matrix4(),col=new THREE.Color();
for(let i=-3;i<=3;i++)for(let j=-3;j<=3;j++)for(const sx of[-1,1])for(const sz of[-1,1]){
  if(Math.random()<.15)continue;
  const w=rnd(11,14),d=rnd(11,14),h=rnd(8,Math.abs(i)+Math.abs(j)<2?45:22),x=i*PITCH+sx*9.5,z=j*PITCH+sz*9.5;
  m.makeScale(w,h,d).setPosition(x,h/2,z);bm.setMatrixAt(n,m);
  bm.setColorAt(n,col.setHSL(rnd(.5,.65),.15,rnd(.55,.8)));solids.push({x,z,hx:w/2,hz:d/2});n++;}
bm.count=n;bm.castShadow=bm.receiveShadow=S.q==2;scene.add(bm);}

// traffic signals: tall coloured posts, 2 per intersection (index 2n = z-traffic, 2n+1 = x-traffic)
const sigM=new THREE.InstancedMesh(new THREE.BoxGeometry(.8,6,.8),new THREE.MeshBasicMaterial(),128);
{const m=new THREE.Matrix4();let n=0;for(const x of roads)for(const z of roads){
  sigM.setMatrixAt(n++,m.makeTranslation(x+8.5,3,z+8.5));sigM.setMatrixAt(n++,m.makeTranslation(x-8.5,3,z+8.5));}
scene.add(sigM);}
let tsig=0,lastSig='';const SC={g:0x22c55e,y:0xfbbf24,r:0xef4444};
const sigState=ax=>{const q=ax==0?tsig%16:(tsig%16+8)%16;return q<6.5?'g':q<8?'y':'r';};
function paintSignals(){const k=sigState(0)+sigState(1);if(k==lastSig)return;lastSig=k;
  const c=new THREE.Color();for(let n=0;n<128;n++)sigM.setColorAt(n,c.setHex(SC[sigState(n%2)]));sigM.instanceColor.needsUpdate=true;}

// ---------- cars ----------
const gBody=new THREE.BoxGeometry(1.8,.7,4),gCab=new THREE.BoxGeometry(1.5,.6,2),
  gW=new THREE.CylinderGeometry(.35,.35,.3,10).rotateZ(Math.PI/2),wMat=new THREE.MeshLambertMaterial({color:0x111111}),
  cabMat=new THREE.MeshLambertMaterial({color:0x1b2733});
function makeCar(color){const g=new THREE.Group(),ex=new THREE.Group();
  const b=new THREE.Mesh(gBody,new THREE.MeshLambertMaterial({color,flatShading:true}));b.position.y=.65;
  const c=new THREE.Mesh(gCab,cabMat);c.position.set(0,1.2,-.2);b.castShadow=c.castShadow=S.q==2;ex.add(b,c);
  for(const[x,z]of[[-.9,1.3],[.9,1.3],[-.9,-1.3],[.9,-1.3]]){const w=new THREE.Mesh(gW,wMat);w.position.set(x,.35,z);ex.add(w);}
  g.add(ex);g.userData.ex=ex;scene.add(g);return g;}
const pm=makeCar(0x2e86de),dash=new THREE.Group();
{const d=new THREE.Mesh(new THREE.BoxGeometry(1.7,.35,.5),cabMat);d.position.set(0,.95,.85);
 const w=new THREE.Mesh(new THREE.TorusGeometry(.22,.03,6,14),wMat);w.position.set(0,1.1,.55);w.name='wheel';dash.add(d,w);pm.add(dash);}
const car={x:27.5,z:48,h:Math.PI,v:0,steer:0};

// AI traffic
const ai=[],cols=[0xd94f4f,0xe0c14a,0x6bbf6b,0xb36bd9,0xeeeeee,0xe08a3c];
for(let i=0;i<[8,14,20][S.q];i++){const axis=i%2,dir=Math.random()<.5?-1:1,road=roads[Math.floor(Math.random()*8)];
  const a={m:makeCar(cols[i%6]),axis,dir,road,u:rnd(-LIM,LIM),v:0,base:rnd(8,12),hold:0,x:0,z:0};
  if(axis==0&&Math.abs(road-24)<1)a.u=-100;ai.push(a);}
function aiStep(a,dt){
  const d=a.dir,u=a.u,lat=a.axis==0?-3.5*d:3.5*d;let t=a.base,best=1e9;
  for(const c of roads){const dd=(c-u)*d;if(dd>0&&dd<best)best=dd;}
  const dist=best-8.5,s=sigState(a.axis);
  if(s!='g'&&dist>-.5&&dist<16&&!(s=='y'&&dist<5))t=Math.min(t,Math.max(0,dist)*.9);
  for(const o of ai)if(o!=a&&o.axis==a.axis&&o.dir==d&&o.road==a.road){const g=(o.u-u)*d-4.5;if(g>-3&&(o.u-u)*d>0&&g<14)t=Math.min(t,g<2?0:g*.8);}
  const lane=a.road+lat,px=a.axis==0?car.x:car.z,pu=a.axis==0?car.z:car.x,g=(pu-u)*d-4.5;
  if(Math.abs(px-lane)<2.6&&(pu-u)*d>0&&g<16)t=Math.min(t,g<2?0:g*.7);
  a.v+=Math.sign(t-a.v)*Math.min(Math.abs(t-a.v),(t<a.v?20:5)*dt);
  if(a.hold>0){a.hold-=dt;a.v=0;}
  a.u+=a.v*d*dt;if(Math.abs(a.u)>LIM+10)a.u=-Math.sign(a.u)*(LIM+8);
  if(a.axis==0){a.x=a.road+lat;a.z=a.u;a.m.rotation.y=d>0?0:Math.PI;}
  else{a.x=a.u;a.z=a.road+lat;a.m.rotation.y=d>0?Math.PI/2:-Math.PI/2;}
  a.m.position.set(a.x,0,a.z);}

// ---------- audio (procedural, no asset files) ----------
let AC,eng,egain;
function audio(){if(AC)return;try{AC=new(window.AudioContext||window.webkitAudioContext)();eng=AC.createOscillator();eng.type='sawtooth';
  egain=AC.createGain();egain.gain.value=0;eng.connect(egain).connect(AC.destination);eng.start();}catch(e){AC=null;}}
function beep(f,d,type='square',g=.08){if(!AC||S.mute)return;const o=AC.createOscillator(),n=AC.createGain(),t=AC.currentTime;
  o.type=type;o.frequency.value=f;n.gain.setValueAtTime(g,t);n.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(n).connect(AC.destination);o.start();o.stop(t+d);}

// ---------- input ----------
const K={},T={};
const on=(id,k)=>{const e=$(id),dn=ev=>{ev.preventDefault();T[k]=1;e.classList.add('on');audio();},up=()=>{T[k]=0;e.classList.remove('on');};
  e.addEventListener('pointerdown',dn);['pointerup','pointerleave','pointercancel'].forEach(n=>e.addEventListener(n,up));};
on('tL','left');on('tR','right');on('tG','gas');on('tB','brake');
addEventListener('keydown',e=>{audio();K[e.code]=true;
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  if(e.code=='Enter'&&!$('ov').classList.contains('hide')){e.preventDefault();$('ovB').click();return;}
  if(e.repeat)return;
  if(e.code=='KeyP'||e.code=='Escape')togglePause();else if(e.code=='KeyC')cycleCam();else if(e.code=='KeyR')restart();
  else if(e.code=='KeyM')toggleMute();else if(e.code=='KeyG')cycleGfx();else if(e.code=='KeyH')beep(420,.4,'square',.12);});
addEventListener('keyup',e=>K[e.code]=false);
addEventListener('blur',()=>{for(const k in K)K[k]=false;if(state=='play')togglePause();});
const gas=()=>K.KeyW||K.ArrowUp||T.gas,brk=()=>K.KeyS||K.ArrowDown||T.brake,
  lft=()=>K.KeyA||K.ArrowLeft||T.left,rgt=()=>K.KeyD||K.ArrowRight||T.right;

// ---------- mission / state ----------
const CPS=[[24,-24],[24,-120],[120,-120],[120,24],[24,24]];
const beacon=new THREE.Mesh(new THREE.CylinderGeometry(4,4,30,16,1,true),
  new THREE.MeshBasicMaterial({color:0x37e0c8,transparent:true,opacity:.35,side:THREE.DoubleSide}));scene.add(beacon);
let state='menu',cp=0,tl=TIME,run=0,camMode=0,snap=true;
const CAMN=['Chase','Hood','Cockpit'];
function reset(){Object.assign(car,{x:27.5,z:48,h:Math.PI,v:0,steer:0});cp=0;tl=TIME;run=0;snap=true;beacon.position.set(CPS[0][0],15,CPS[0][1]);}
function show(t,p,b,fn){$('ovT').textContent=t;$('ovP').textContent=p;$('ovB').textContent=b;$('ovB').onclick=fn;$('ov').classList.remove('hide');}
const hide=()=>$('ov').classList.add('hide');
function start(){audio();reset();state='play';hide();}
function restart(){if(state=='menu')return;start();}
function togglePause(){if(state=='play'){state='pause';show('Paused','','Resume',()=>{state='play';hide();});}
  else if(state=='pause'){state='play';hide();}}
function cycleCam(){camMode=(camMode+1)%3;snap=true;$('bCam').textContent=CAMN[camMode];}
function toggleMute(){S.mute=!S.mute;store();$('bMute').textContent=S.mute?'Sound off':'Sound on';}
function cycleGfx(){S.q=(S.q+1)%3;store();location.reload();}
function finish(win){state='end';S.coins+=run;let msg=`Checkpoints: ${cp}/${CPS.length}\nCoins earned: ${run}`;
  if(win){const bonus=50+Math.floor(tl),t=+(TIME-tl).toFixed(1);S.coins+=bonus;msg+=` + ${bonus} bonus\nTime: ${t} s`;
    if(S.best==null||t<S.best)S.best=t;msg+=`\nBest: ${S.best} s`;}store();
  show(win?'Mission complete':'Time is up',msg+`\nTotal coins: ${S.coins}`,win?'Drive again':'Try again',start);}
const hit=s=>{if(s>3)beep(90,.25,'sawtooth',.2);};
$('bPause').onclick=togglePause;$('bCam').onclick=cycleCam;$('bMute').onclick=toggleMute;$('bGfx').onclick=cycleGfx;$('bRestart').onclick=restart;
$('bMute').textContent=S.mute?'Sound off':'Sound on';$('bGfx').textContent=['Low','Medium','High'][S.q];

// ---------- simulation ----------
function drive(dt){
  let a=0;const v=car.v;
  if(gas())a=v>=0?12*(1-v/MAXV):BRAKE;
  else if(brk())a=v>.5?-BRAKE:-7*(1-(-v)/8);
  else a=-Math.sign(v)*Math.min(Math.abs(v)/dt,3);
  if(K.Space)a-=Math.sign(v)*30;
  car.v=clamp(v+a*dt,-8,MAXV);if(!gas()&&!brk()&&Math.abs(car.v)<.3)car.v=0;
  car.steer+=((rgt()?1:0)-(lft()?1:0)-car.steer)*Math.min(1,dt*8);
  car.h-=car.steer*1.5*clamp(car.v/6,-1,1)/(1+Math.abs(car.v)/18)*dt;
  car.x+=Math.sin(car.h)*car.v*dt;car.z+=Math.cos(car.h)*car.v*dt;
  for(const s of solids){const cx=clamp(car.x,s.x-s.hx,s.x+s.hx),cz=clamp(car.z,s.z-s.hz,s.z+s.hz);
    let dx=car.x-cx,dz=car.z-cz,d=Math.hypot(dx,dz);
    if(d<CR){if(d<1e-4){dx=1;dz=0;d=1;}car.x+=dx/d*(CR-d);car.z+=dz/d*(CR-d);hit(Math.abs(car.v));car.v*=-.2;}}
  for(const o of ai){const dx=car.x-o.x,dz=car.z-o.z,d=Math.hypot(dx,dz);
    if(d<3&&d>1e-4){car.x+=dx/d*(3-d);car.z+=dz/d*(3-d);hit(Math.abs(car.v));car.v*=.5;o.hold=1.2;}}
  car.x=clamp(car.x,-LIM-20,LIM+20);car.z=clamp(car.z,-LIM-20,LIM+20);
  tl-=dt;const[cx,cz]=CPS[cp];
  if(Math.hypot(car.x-cx,car.z-cz)<7){run+=10;cp++;beep(880,.12,'sine',.15);setTimeout(()=>beep(1320,.18,'sine',.15),110);
    if(cp>=CPS.length){finish(true);return;}beacon.position.set(CPS[cp][0],15,CPS[cp][1]);}
  if(tl<=0){tl=0;finish(false);}
}
const fwd=new THREE.Vector3(),want=new THREE.Vector3(),look=new THREE.Vector3();
function camStep(dt){
  fwd.set(Math.sin(car.h),0,Math.cos(car.h));pm.userData.ex.visible=camMode==0;dash.visible=camMode==2;
  if(camMode==0){want.set(car.x,4.2,car.z).addScaledVector(fwd,-9);
    if(snap)cam.position.copy(want);else cam.position.lerp(want,1-Math.exp(-dt*6));
    cam.lookAt(look.set(car.x,1.2,car.z).addScaledVector(fwd,6));}
  else{cam.position.set(car.x,camMode==1?1.35:1.2,car.z).addScaledVector(fwd,camMode==1?.6:-.1);
    cam.lookAt(look.copy(cam.position).addScaledVector(fwd,20).setY(1.1));}
  snap=false;}
let last=performance.now();
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000);last=now;
  if(state=='play'||state=='menu'){tsig+=dt;paintSignals();for(const a of ai)aiStep(a,dt);}
  if(state=='play')drive(dt);
  pm.position.set(car.x,0,car.z);pm.rotation.y=car.h;dash.getObjectByName('wheel').rotation.z=-car.steer*1.2;
  sun.position.set(car.x+60,100,car.z+40);sun.target.position.set(car.x,0,car.z);
  camStep(dt);
  $('kmh').textContent=Math.round(Math.abs(car.v)*3.6);$('coins').textContent=S.coins+run;$('time').textContent=Math.ceil(tl);
  const cpi=Math.min(cp,CPS.length-1),dx=CPS[cpi][0]-car.x,dz=CPS[cpi][1]-car.z;
  $('dist').textContent=`${cp+1>CPS.length?CPS.length:cp+1}/${CPS.length} · ${Math.round(Math.hypot(dx,dz))} m`;
  $('arrow').style.transform=`rotate(${-(Math.atan2(dx,dz)-car.h)}rad)`;
  if(egain){egain.gain.value=S.mute||state!='play'?0:.03+(gas()?.02:0);eng.frequency.value=50+Math.abs(car.v)*5;}
  R.render(scene,cam);}
reset();show('City Drive 3D',`Reach all ${CPS.length} checkpoints in ${TIME} seconds.\nStay off the buildings and watch the lights.`+(S.best?`\nBest time: ${S.best} s`:''),'Start driving',start);
requestAnimationFrame(frame);

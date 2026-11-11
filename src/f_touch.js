
// ---------------- touch controls (iPad / phones), audio unlock, mobile layout helpers ----------------
const touchIn={thr:null,thrSet:false,pitch:0,roll:0,yaw:0,active:false};
document.body.classList.toggle('touch',TOUCH_UI);
const tui=document.createElement('div');tui.id='touchui';
tui.innerHTML=`<div id="thr"><div class="zfull">FULL</div><div class="track"><div class="fill"></div><div class="knob"><span>THR</span></div></div><div class="tlbl">THROTTLE</div></div>
<div id="cutb" class="tb">CUT</div>
<div id="stick"><div class="ring"></div><div class="knob"></div><div class="tlbl">ATTITUDE</div></div>
<div id="yawl" class="tb">&#10226;<small>YAW</small></div><div id="yawr" class="tb">&#10227;<small>YAW</small></div>
<div id="tbar"><b data-k="Space">ALARM</b><b data-k="KeyF">SWITCHES</b><b data-k="KeyC">CAM</b><b data-k="KeyV">VOICE</b><b data-k="KeyM">MUTE</b><b data-k="KeyP">&#10074;&#10074;</b><b data-k="KeyR">&#8634;</b></div>`;
$('view').appendChild(tui);
const rot=document.createElement('div');rot.id='rotate';rot.innerHTML='<div>&#8635;<br>Rotate to landscape<br><small>EAGLE is flown with the device sideways</small></div>';document.body.appendChild(rot);
function pressKey(code){dispatchEvent(new KeyboardEvent('keydown',{code}));dispatchEvent(new KeyboardEvent('keyup',{code}));}
// generic multi-touch helper: each control tracks its own pointer id, so throttle + stick work at once
function track(el,{down,move,up}){let id=null;
  el.addEventListener('pointerdown',e=>{if(id!==null)return;id=e.pointerId;el.setPointerCapture(id);e.preventDefault();e.stopPropagation();down&&down(e);move&&move(e);});
  el.addEventListener('pointermove',e=>{if(e.pointerId!==id)return;e.preventDefault();move&&move(e);});
  const end=e=>{if(e.pointerId!==id)return;id=null;up&&up(e);};el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);}
// throttle: 10-60% over the lower 80% of the track, a detent gap, then FULL at the top
const thrEl=$('thr'),thrTrack=thrEl.querySelector('.track');
function thrFromY(y){const r=thrTrack.getBoundingClientRect();const p=clamp((r.bottom-y)/r.height,0,1);return p>=0.87?1:p>=0.8?0.6:0.1+p/0.8*0.5;}
function thrToP(v){return v>0.6+1e-3?1:clamp((v-0.1)/0.5,0,1)*0.8;}
track(thrEl,{move:e=>{if(S.mode!=='fly')return;touchIn.thr=thrFromY(e.clientY);touchIn.thrSet=true;}});
track($('cutb'),{down:()=>{if(S.mode==='fly'){S.cutReq=true;touchIn.active=true;}}});
// attitude stick (springs back to centre = attitude hold)
const stEl=$('stick'),stKnob=stEl.querySelector('.knob');
track(stEl,{move:e=>{const r=stEl.getBoundingClientRect(),R=r.width/2;let dx=e.clientX-(r.left+R),dy=e.clientY-(r.top+R);const d=Math.hypot(dx,dy),m=R*0.62;if(d>m){dx*=m/d;dy*=m/d;}
    stKnob.style.transform=`translate(${dx}px,${dy}px)`;const dz=v=>Math.abs(v)<0.14?0:(v-Math.sign(v)*0.14)/0.86;touchIn.roll=dz(dx/m);touchIn.pitch=dz(dy/m);},
  up:()=>{stKnob.style.transform='';touchIn.roll=touchIn.pitch=0;}});
track($('yawl'),{down:()=>touchIn.yaw=1,up:()=>touchIn.yaw=0});
track($('yawr'),{down:()=>touchIn.yaw=-1,up:()=>touchIn.yaw=0});
for(const b of $('tbar').querySelectorAll('b'))b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();unlockAudio();pressKey(b.dataset.k);});
// tap-to-continue on the pause / debrief cards
$('pause').addEventListener('click',()=>{if(paused)pressKey('KeyP');});
$('debrief').addEventListener('click',()=>pressKey('KeyR'));
// camera: one finger orbits, two fingers pinch-zoom (on the 3D view only)
{const pts=new Map();let pinch=0;const el=renderer.domElement;
 el.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')return;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});el.setPointerCapture(e.pointerId);if(pts.size===2){const [a,b]=[...pts.values()];pinch=Math.hypot(a.x-b.x,a.y-b.y);}});
 el.addEventListener('pointermove',e=>{const p=pts.get(e.pointerId);if(!p)return;
   if(pts.size===1){camState.yaw+=(e.clientX-p.x)*0.006;camState.pitch=clamp(camState.pitch+(e.clientY-p.y)*0.005,-0.15,1.5);}
   p.x=e.clientX;p.y=e.clientY;if(pts.size===2){const [a,b]=[...pts.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch>0)camState.dist=clamp(camState.dist*pinch/d,7,1500);pinch=d;}});
 const end=e=>{pts.delete(e.pointerId);pinch=0;};el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);}
// iOS: no pinch-zoom / double-tap zoom / rubber-banding / long-press callouts
for(const ev of ['gesturestart','gesturechange','gestureend'])document.addEventListener(ev,e=>e.preventDefault());
document.addEventListener('touchmove',e=>{if(!e.target.closest('.card'))e.preventDefault();},{passive:false});
document.addEventListener('dblclick',e=>e.preventDefault());
document.addEventListener('contextmenu',e=>{if(TOUCH_UI)e.preventDefault();});
// audio unlock: iOS (Safari and Chrome, both WebKit) only starts WebAudio / speech inside a user gesture
let unlocked=false;
function unlockAudio(){initAudio();if(!AC)return;if(AC.state!=='running')AC.resume();
  if(!unlocked){unlocked=true;try{if(navigator.audioSession)navigator.audioSession.type='playback';}catch(e){}   // play even with the ringer/silent switch on (iOS 16.4+)
    const b=AC.createBuffer(1,1,22050),s=AC.createBufferSource();s.buffer=b;s.connect(AC.destination);s.start(0);
    if(window.speechSynthesis){try{const u=new SpeechSynthesisUtterance(' ');u.volume=0;speechSynthesis.speak(u);}catch(e){}}}}
for(const ev of ['pointerdown','touchend','click','keydown'])addEventListener(ev,unlockAudio,{capture:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&AC&&AC.state!=='running'&&!paused)AC.resume();});
// per-frame: mirror the sim state on the throttle
function touchFrame(){if(!TOUCH_UI)return;const v=S.mode==='fly'?S.thrCmd:0;const p=thrToP(v);
  thrTrack.querySelector('.fill').style.height=(p*100)+'%';thrTrack.querySelector('.knob').style.bottom=`calc(${p*100}% - 22px)`;
  thrEl.classList.toggle('isfull',v>0.6+1e-3);thrEl.classList.toggle('auto',!!S.auto&&S.mode==='fly');}
// settings rows on the start screen (graphics, controls)
function renderSetRow(id,opts,cur,fn){const el=$(id);if(!el)return;el.innerHTML=opts.map(([k,n])=>`<span class="fs${k===cur?' on':''}" data-k="${k}">${n}</span>`).join('');
  el.onclick=e=>{e.stopPropagation();const k=e.target.dataset&&e.target.dataset.k;if(k)fn(k);};}
function renderDevSettings(){
  renderSetRow('gfxset',[['auto','Auto'],['high','High'],['low','Low']],gfxPref,k=>{if(k===gfxPref)return;try{localStorage.setItem('eagle.gfx',k);}catch(e){}location.reload();});
  renderSetRow('ctlset',[['auto','Auto'],['on','Touch'],['off','Keyboard']],touchPref,k=>{touchPref=k;try{localStorage.setItem('eagle.touch',k);}catch(e){}
    TOUCH_UI=k==='on'||(k==='auto'&&IS_TOUCH);document.body.classList.toggle('touch',TOUCH_UI);renderDevSettings();layout();});
  const g=$('gfxnote');if(g)g.textContent=`now ${GFX.toUpperCase()}${gfxPref==='auto'?' (auto)':''}: ${LOW?'pixel ratio ≤1.5, lighter terrain, 2K shadows, fewer particles':'full detail'}`;}
function layoutTouch(){const u=clamp(VIEWH/560,0.62,1.15);tui.style.setProperty('--u',u.toFixed(3));
  // phone / short landscape: stack CUT under the throttle so the slider, CUT, and radio log cannot overlap
  const compact=TOUCH_UI&&(innerWidth<960||VIEWH<420);tui.classList.toggle('compact',compact);
  const comm=$('comms');
  if(!TOUCH_UI){comm.style.left=comm.style.maxWidth=comm.style.top='';return;}
  const SA=safeArea(),view=$('view').getBoundingClientRect(),tbar=$('tbar').getBoundingClientRect();
  const thr=$('thr').getBoundingClientRect(),cut=$('cutb').getBoundingClientRect();
  // if the left column reaches up into the log's band, sit the log to the right of it (phones)
  const colR=Math.max(thr.right,cut.right);
  const left=(compact&&thr.top<view.top+90?colR+8-view.left:14+SA.l);
  comm.style.left=left+'px';comm.style.top=`calc(8px + var(--sa-t))`;
  const rightLimit=tbar.left>0?tbar.left-12:view.right-12;
  comm.style.maxWidth=Math.max(120,Math.min(520,rightLimit-(view.left+left)))+'px';}
// ---------------- start ----------------
reset();layout();refreshHelp();renderFailSetting();renderDevSettings();requestAnimationFrame(frame);

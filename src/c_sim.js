
// ---------------- state ----------------
const S={rcsCmd:new V3(),postLog:[],pos:new V3(),vel:new V3(),q:new THREE.Quaternion(),w:new V3(),mode:'ready',t:0,events:[],post:[]};
const keys={};
let paused=false, muted=false, showHelp=true;
const tq=new THREE.Quaternion(),tv=new V3();
function upVec(q=S.q){return new V3(0,1,0).applyQuaternion(q);}
function worldPt(local,out=new V3()){return out.copy(local).applyQuaternion(S.q).add(S.pos);}
function originPt(){return worldPt(new V3(0,S.staged?ASC_BASE:0,0).sub(COM));}   // base of the vehicle (ascent stage base once staged)
function altitude(){const o=originPt();return o.y-H(o.x,o.z);}
function hoverRate(){return (DRY+S.fuel)*GM/(ISP*G0);}
function hoverSec(){return S.fuel/hoverRate();}
function fuelPct(){return S.fuel/TANK*100;}
// Fuel mass at which 20 s of hover remains — the bingo reserve. Constant for a given dry mass.
function bingoFuelMass(){return 20*GM*DRY/(ISP*G0-20*GM);}
// Time to that reserve at the current descent-engine burn rate (throttle-dependent). Null when the engine is shut down.
// Uses the throttle the engine is being driven to (commanded, or stuck value), floored at the DPS's 10% minimum, not the
// lagging actual thrust: after CUT the actual thrust decays toward zero over ~2 s, and dividing by it sent the figure to
// hundreds of thousands of seconds, which the hold then kept on the gauge.
function burnThr(){if(S.staged||!S.engineOn||!(S.fuel>0))return null;const ts=thrStuck(),c=ts!=null?ts:S.thrCmd;return c>1e-4?Math.max(0.1,c):null;}
function liveBingo(fuel){const t=burnThr();if(t==null)return null;return Math.min(BINGO_CAP,(fuel-bingoFuelMass())/Math.max(t*TMAX/(ISP*G0),hoverRate()));}   // never slower than hover burn: below hover throttle the gauge reads hover time
const BINGO_CAP=599;   // gauge shows at most 9:59
function updateBingoClock(){
  if(S.bingoFrozen!=null)return;
  const v=liveBingo(indFuelPct()/100*TANK);
  if(v!=null)S.bingoHeld=v;            // only refresh while thrusting; a shutdown leaves the last reading in place
}
function freezeBingo(){if(S.bingoFrozen==null)S.bingoFrozen=S.bingoHeld!=null?S.bingoHeld:(liveBingo(indFuelPct()/100*TANK)??(indHoverSec()-20));}
function timeToBingo(){                 // real-fuel, same hold/freeze as the gauge
  if(S.bingoFrozen!=null)return S.bingoFrozen;
  const v=liveBingo(S.fuel);return v!=null?v:(S.bingoHeld!=null?S.bingoHeld:hoverSec()-20);}
function indTimeToBingo(){              // what the TO BINGO gauge shows
  if(S.bingoFrozen!=null)return S.bingoFrozen;
  const v=liveBingo(indFuelPct()/100*TANK);return v!=null?v:(S.bingoHeld!=null?S.bingoHeld:indHoverSec()-20);}
function quatFromUp(u,f=new V3(1,0,0)){const z=new V3().crossVectors(f,u).normalize();const x=new V3().crossVectors(u,z).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,u.clone().normalize(),z));}
function eulers(){const e=new THREE.Euler().setFromQuaternion(S.q,'YZX');return {pitch:e.z/DEG,roll:e.x/DEG,yaw:e.y/DEG,psi:e.y};}
function hvel(){const psi=eulers().psi;const f=new V3(Math.cos(psi),0,-Math.sin(psi)),r=new V3(Math.sin(psi),0,Math.cos(psi));return {fwd:S.vel.dot(f),lat:S.vel.dot(r)};}

// P64-style approach guidance (computer flying to the planned site)
function guidance(){
  const tgt=S.apTarget||TARGET;const o=originPt();const dx=tgt.x-o.x,dz=tgt.z-o.z,d=Math.hypot(dx,dz);const alt=altitude();
  const vmag=Math.min(32,0.8*Math.sqrt(2*0.7*d));const vhx=d>0.3?dx/d*vmag:0,vhz=d>0.3?dz/d*vmag:0;let vv;
  if(d<6&&Math.hypot(S.vel.x,S.vel.z)<1.5)vv=-clamp(alt*0.08,0.9,5);else{const altD=18+0.5*d;vv=clamp(-0.5*vmag+0.15*(altD-alt),-14,0.5);}
  const a=new V3((vhx-S.vel.x)/3,Math.max((vv-S.vel.y)/1.5+GM,0.3),(vhz-S.vel.z)/3);
  const hor=Math.hypot(a.x,a.z),maxH=a.y*Math.tan((alt<15?3+alt*2:45)*DEG);if(hor>maxH){a.x*=maxH/hor;a.z*=maxH/hor;}
  const thr=clamp(a.length()*(DRY+S.fuel)/TMAX,0.1,0.6);return {dir:a.normalize(),thr};
}

const comms=[];
// clip: id of a real recording (RADIO); priority: queue behind a playing clip instead of skipping
function say(who,text,clip=null,priority=false){
  const el=document.createElement('div');el.className=who.toLowerCase();el.innerHTML=`<b>${who}:</b>${text}`;$('comms').appendChild(el);
  comms.push({el,t:performance.now()});while(comms.length>3){comms.shift().el.remove();}
  // keep the log to about 4 text lines, but never clip a message: long (wrapped) lines push older entries out instead of being cut off
  {const box=$('comms'),lh=parseFloat(getComputedStyle(box).lineHeight)||20;while(comms.length>1&&box.scrollHeight>lh*4+22)comms.shift().el.remove();}
  restyleComms();
  let real=false;if(clip){el.classList.add('real');real=radio(clip,who,text,priority);}
  if(!clip){if(who==='CAPCOM')beep(2525,0.25,0.05);if(voiceMode===2)speak(text,who);}
  if(S.mode!=='fly'&&S.mode!=='ready')S.postLog.push({who,text});   // outcome radio exchange, repeated in full on the results card
  S.lastSay=S.t;return real;
}
function sayClip(clip,priority=true){const c=RADIO[clip];return say(c.who,c.text,clip,priority);}
function restyleComms(){const n=comms.length,now=performance.now();
  comms.forEach((c,i)=>{const age=n-1-i;let o=age===0?1:age===1?0.78:0.52;if(now-c.t>14000)o=Math.min(o,0.35);c.el.style.opacity=o;});}
let bannerTimer=0;
function banner(text,color='#ffc04a',dur=3){const b=$('banner');b.textContent=text;b.style.color=color;b.style.opacity=1;bannerTimer=dur;}
function setAlarm(code){S.alarm=code;S.alarmAck=false;S.master=true;S.dskyBlank=S.t+1.3;S.alarmT=S.t;}

function reset(){
  const x0=-1150,z0=-55;
  S.q.identity();S.pos.set(x0,H(x0,z0)+640+COM.y,z0);
  S.vel.set(30,-12,1.2);S.w.set(0,0,0);S.fuel=FUEL0;S.rcs=100;S.engineOn=true;S.auto=true;S.prog=64;S.t=0;
  S.mode='ready';S.contact=false;S.lowLevel=false;S.said60=S.said30=S.saidBingo=S.saidDust=S.saidShadow=false;
  S.alarm=null;S.alarmAck=true;S.master=false;S.dskyBlank=0;S.alarmT=0;S.nextCall=7;S.lastSay=-10;S.result=null;S.ftpT=0;S.rcsAct=0;S.cutReq=S.ftpReq=false;S.apTarget=null;
  S.post=[];S.postT=0;S.postLog=[];S.anim=null;S.usedClips=new Set();S.saidDrift=false;
  S.abort=null;S.staged=false;S.apsOn=false;S.apsFuel=ASC_FUEL0;S.info=null;S.abortEv=[];S.saidStageNow=false;
  S.bingoFrozen=null;S.bingoHeld=null;
  DS.active=false;DS.done=false;DS.fate=null;DS.anim=null;lm.add(dsG);dsG.position.set(0,0,0);dsRoot.visible=false;aplume.visible=false;clearDebris();PANEL.reset();
  if(typeof radioStop==='function'&&AC)radioStop();
  const g=guidance();S.q.copy(quatFromUp(g.dir));S.thr=S.thrCmd=g.thr;
  S.events=[
    {t:0.6,fn:()=>sayClip('capcom_go_landing')},
    {t:4.5,fn:()=>sayClip('aldrin_go_landing')},
    {t:13,alarm:1,fn:()=>{setAlarm('1201');sayClip('alarm_1201');}},
    {t:19,alarm:1,fn:()=>sayClip('capcom_1201')},
    {t:38,alarm:1,fn:()=>{setAlarm('1202');sayClip('alarm_1202');}},
    {t:47,alarm:1,fn:()=>sayClip('capcom_1202_go')},
  ];
  if(!historicalAlarms())S.events=S.events.filter(e=>!e.alarm);
  S.lr={reacqT:0,fa:0,fv:0,ea:0,ev:0,drift:(Math.random()<0.5?-1:1)*0.03};scheduleFailures();
  $('comms').innerHTML='';comms.length=0;$('debrief').classList.add('hidden');clearDust();
  $('banner').style.opacity=0;
}
function fmtAlt(ft){if(ft>=1000)return Math.round(ft/50)*50;if(ft>=200)return Math.round(ft/10)*10;if(ft>=40)return Math.round(ft/5)*5;return Math.max(0,Math.round(ft));}
function fmtRate(fps){const a=Math.abs(fps);if(a>=10)return String(Math.round(a));const h=Math.round(a*2)/2,i=Math.floor(h);return ((i?String(i):'')+(h-i?(i?' ':'')+'½':''))||'0';}
function takeover(){S.auto=false;S.prog=66;banner('P66: MANUAL CONTROL','#7dff8a',3);say('ARMSTRONG',"Going manual. P66.");}

// ---------------- simulation step ----------------
function simStep(dt){
  S.t+=dt;
  const kUp=keys.KeyW, kDn=keys.KeyS;
  const pitchIn=clamp(((keys.ArrowDown||keys.KeyK)?1:0)-((keys.ArrowUp||keys.KeyI)?1:0)+touchIn.pitch,-1,1);
  const rollIn=clamp(((keys.ArrowRight||keys.KeyD||keys.KeyL)?1:0)-((keys.ArrowLeft||keys.KeyA||keys.KeyJ)?1:0)+touchIn.roll,-1,1);
  const yawIn=clamp((keys.KeyQ?1:0)-(keys.KeyE?1:0)+touchIn.yaw,-1,1);
  if(S.auto&&!S.abort&&(kUp||kDn||pitchIn||rollIn||yawIn||S.cutReq||S.ftpReq||touchIn.thrSet))takeover();
  if(S.abort){S.cutReq=S.ftpReq=false;touchIn.thrSet=false;}
  const wcmd=new V3();
  if(S.auto){let gd;if(S.abort){gd=abortGuidance();if(!S.staged)S.thrCmd=1;}else{const g=guidance();S.thrCmd=g.thr;gd=g.dir;}const err=new V3().crossVectors(upVec(),gd).applyQuaternion(tq.copy(S.q).invert());
    wcmd.set(clamp(err.x*1.6,-MAXRATE,MAXRATE),0,clamp(err.z*1.6,-MAXRATE,MAXRATE));}
  else{
    wcmd.set(rollIn*MAXRATE,yawIn*MAXRATE,pitchIn*MAXRATE);
    if(S.cutReq){S.engineOn=false;S.thrCmd=0;S.cutReq=false;touchIn.thr=0;touchIn.thrSet=false;}
    if(S.ftpReq){if(S.fuel>0){S.engineOn=true;S.thrCmd=1;}S.ftpReq=false;}
    if(touchIn.thrSet){touchIn.thrSet=false;if(S.fuel>0){S.engineOn=true;S.thrCmd=touchIn.thr;}}
    if(kUp){if(!S.engineOn){if(S.fuel>0){S.engineOn=true;S.thrCmd=0.1;}}else if(S.thrCmd<0.6){S.thrCmd=Math.min(0.6,S.thrCmd+0.22*dt);S.ftpT=0;}
      else if(S.thrCmd<1){S.ftpT+=dt;if(S.ftpT>0.6)S.thrCmd=1;}}else S.ftpT=0;
    if(kDn){if(S.thrCmd>0.6)S.thrCmd=0.6;else S.thrCmd=Math.max(0.1,S.thrCmd-0.22*dt);}
  }
  // attitude: rate command / attitude hold through the RCS
  const dist=rcsDisturb();if(dist&&S.rcs>0)S.w.addScaledVector(dist,dt);
  S.rcsCmd.set(0,0,0);
  if(S.rcs>0){const md=ANGACC*dt*attAuthority(pitchIn||rollIn||yawIn);const dx=clamp(wcmd.x-S.w.x,-md,md),dy=clamp(wcmd.y-S.w.y,-md,md),dz=clamp(wcmd.z-S.w.z,-md,md);
    S.w.x+=dx;S.w.y+=dy;S.w.z+=dz;S.rcsCmd.set(dx/md,dy/md,dz/md);const use=(Math.abs(dx)+Math.abs(dy)+Math.abs(dz))/md;S.rcsAct=lerp(S.rcsAct,use>0.05?1:0,0.2);S.rcs=Math.max(0,S.rcs-use*0.004);}
  const ang=S.w.length()*dt;if(ang>1e-9){tq.setFromAxisAngle(tv.copy(S.w).normalize(),ang);S.q.multiply(tq).normalize();}
  // propulsion: descent engine (throttleable) or, once staged, the fixed-thrust ascent engine
  let m,F;const u=upVec();
  if(!S.staged){const ts=thrStuck(),tgt=(S.engineOn&&S.fuel>0)?(ts!=null?ts:S.thrCmd):0;S.thr+=(tgt-S.thr)*Math.min(1,dt/0.2);m=DRY+S.fuel;F=S.thr*TMAX;}
  else{m=ASC_DRY+S.apsFuel;F=(S.apsOn&&S.apsFuel>0)?APS_T:0;if(F>0){S.apsFuel-=F/(APS_ISP*G0)*dt;if(S.apsFuel<=0){S.apsFuel=0;S.apsOn=false;}}}
  S.vel.x+=u.x*F/m*dt;S.vel.y+=(u.y*F/m-GM)*dt;S.vel.z+=u.z*F/m*dt;S.pos.addScaledVector(S.vel,dt);
  if(F>0&&!S.staged){S.fuel-=F/(ISP*G0)*dt;if(S.fuel<=0){S.fuel=0;S.engineOn=false;S.thr=0;if(S.mode==='fly'){banner('PROPELLANT DEPLETED','#ff5a4a',4);say('ALDRIN',"Engine's out! We're out of fuel!");}}}
  updateBingoClock();
  if(DS.active)updateDS(dt);
  if(S.mode==='abortok')return;
  // scripted events & callouts
  while(S.events.length&&S.events[0].t<=S.t){const e=S.events.shift();if(S.mode==='fly')e.fn();}
  failStep(dt);
  if(S.master&&!S.alarmAck&&S.t-S.alarmT>9){S.alarmAck=true;S.master=false;}
  const alt=altitude(),altFt=alt*FT,vs=S.vel.y*FT,dA=pgnsAlt()*FT,dV=pgnsVs()*FT;   // dA/dV: what the DSKY (PGNS) shows; the crew read their callouts from it
  if(S.abort){abortStep(dt);if(S.mode!=='fly')return;}
  else{
  // 60 / 30 / bingo calls follow the TO BINGO gauge (throttle-dependent remaining time). The quantity light follows the fuel gauge.
  const bingo=indTimeToBingo();
  if(!S.lowLevel&&indFuelPct()<=5.6){S.lowLevel=true;S.master=true;S.alarmAck=false;S.alarmT=S.t;banner('LOW LEVEL','#ffc04a',3);sayClip('flight_lowlevel');sayClip('lowlevel');}  // FD loop "Low level." first, Aldrin's "Five percent" queued after it
  if(!S.said60&&bingo<=60){S.said60=true;sayClip('capcom_60');banner('60 SECONDS','#ffc04a',2.5);}
  if(!S.said30&&bingo<=30){S.said30=true;sayClip('capcom_30');banner('30 SECONDS','#ff7a3a',2.5);}
  if(!S.saidBingo&&bingo<=0){S.saidBingo=true;say('CAPCOM','Bingo. Eagle, you need to be on the ground.');banner('BINGO FUEL','#ff5a4a',3);}
  const hv=hvel();
  if(!S.saidDust&&altFt<45&&S.thr>0.12&&vs<0.5){S.saidDust=true;if(!radioBusy())sayClip('dust',false);else say('ALDRIN','Picking up some dust.');}
  if(!S.saidShadow&&altFt<32&&S.saidDust){S.saidShadow=true;if(!radioBusy())sayClip('shadow',false);else say('ALDRIN','Faint shadow.');}
  if(!S.saidDrift&&altFt<80&&altFt>8&&Math.abs(hv.lat)>0.5&&S.t-S.lastSay>2){S.saidDrift=true;if(hv.lat>0&&!radioBusy())sayClip('drift',false);else say('ALDRIN',`Drifting to the ${hv.lat>0?'right':'left'} a little.`);}
  // real Aldrin callout when the player passes close to one of his actual altitude / rate calls
  if(S.t>22&&altFt<2150&&S.t-S.lastSay>2.2&&!radioBusy()){const m=matchCallout(dA,-dV);if(m){S.usedClips.add(m.clip);say('ALDRIN',m.text,m.clip);S.nextCall=S.t+(alt>100?5.5:3.5);}}
  if(S.t>=S.nextCall&&altFt<3000){
    if(S.t-S.lastSay>1.6){const h=hvel();let s=`${fmtAlt(Math.max(0,dA))} feet, ${dV<=0?'down':'up'} ${fmtRate(dV)}`;
      if(altFt<300&&Math.abs(h.fwd*FT)>=1)s+=`, ${fmtRate(h.fwd*FT)} ${h.fwd>=0?'forward':'back'}`;
      if(altFt<150&&Math.abs(h.lat*FT)>2.5)s+=`. Drifting ${h.lat>0?'right':'left'}`;
      say('ALDRIN',s+'.');}
    S.nextCall=S.t+(alt>100?5.5:3.5);
  }
  }
  // contact probes / gear / hull
  if(S.staged){for(const p of HULL_A){worldPt(p,tv);if(tv.y<=H(tv.x,tv.z)){ascentCrash();return;}}return;}
  if(!S.contact&&!S.abort)for(const p of PROBES){worldPt(p,tv);if(tv.y<=H(tv.x,tv.z)){S.contact=true;sayClip('contact');banner('CONTACT LIGHT','#79b8ff',2.5);break;}}
  for(const p of HULL){worldPt(p,tv);if(tv.y<=H(tv.x,tv.z)){touchdown('hull');return;}}
  for(const p of PADS){worldPt(p,tv);if(tv.y<=H(tv.x,tv.z)){touchdown('pad');return;}
    for(const b of bouldersNear(tv.x,tv.z)){if(b.r<0.3)continue;const dx=tv.x-b.x,dy=(tv.y-b.y)/b.sy,dz=tv.z-b.z;if(dx*dx+dy*dy+dz*dz<(b.r+0.35)**2){touchdown('boulder');return;}}}
}

// ---------------- touchdown ----------------
function touchdown(reason){
  const u=upVec(),vs=-S.vel.y,hs=Math.hypot(S.vel.x,S.vel.z),tilt=Math.acos(clamp(u.y,-1,1))/DEG;
  const pw=PADS.map(p=>worldPt(p)),gp=pw.map(p=>new V3(p.x,H(p.x,p.z),p.z));
  const n=new V3().subVectors(gp[2],gp[0]).cross(new V3().subVectors(gp[3],gp[1])).normalize();if(n.y<0)n.negate();
  const slope=Math.acos(clamp(n.y,-1,1))/DEG;
  let bhit=reason==='boulder';const o=originPt(),g0=H(o.x,o.z);
  for(const p of gp)for(const b of bouldersNear(p.x,p.z)){if(b.r<0.3)continue;if(Math.hypot(p.x-b.x,p.z-b.z)<b.r+0.45&&b.y+b.r*b.sy>p.y+0.25)bhit=true;}
  for(let ix=-1;ix<=1;ix++)for(let iz=-1;iz<=1;iz++)for(const b of bouldersNear(o.x+ix*3,o.z+iz*3)){if(b.r<0.3)continue;if(Math.hypot(o.x-b.x,o.z-b.z)<2.3&&b.y+b.r*b.sy>g0+0.45)bhit=true;}
  const why=[];
  if(reason==='hull')why.push('The LM hit the surface before its landing gear did.');
  if(bhit)why.push('Came down on boulders.');
  if(vs>3)why.push(`Descent rate too high (${vs.toFixed(1)} m/s).`);
  if(hs>1.2)why.push(`Too much sideways speed (${hs.toFixed(1)} m/s); a footpad could dig in and tip her over.`);
  if(tilt>10)why.push(`Not upright: ${tilt.toFixed(0)}° tilt.`);
  if(slope>10)why.push(`Ground too steep: ${slope.toFixed(0)}° slope.`);
  let res='ok';
  if(reason==='hull'||bhit||vs>4.5||hs>2.5||tilt>16||slope>16)res='crash';else if(why.length)res='hard';
  const dist=Math.hypot(o.x-TARGET.x,o.z-TARGET.z);
  S.result={res,why,vs,hs,tilt,slope,fuel:hoverSec(),pct:fuelPct(),t:S.t,dist,get:GET0+S.t,bhit,reason,abort:S.info,staged:false};
  if(S.abort&&res==='crash')why.push('An abort was in progress, but the descent engine could not stop the LM in time (or ran dry). ABORT STAGE might have saved it.');
  freezeBingo();
  S.mode=res==='crash'?'crashed':'landed';S.engineOn=false;S.thrCmd=0;S.thr=0;S.w.set(0,0,0);S.alarm=null;S.master=res==='crash';S.alarmAck=res!=='crash';S.alarmT=S.t;S.post=[];S.postT=0;
  for(let i=0;i<260;i++){const a=Math.random()*6.283,sp=4+Math.random()*(res==='crash'?16:6);emitDust(o.x,g0+0.3,o.z,Math.cos(a)*sp,Math.random()*(res==='crash'?6:1.2),Math.sin(a)*sp,1+Math.random()*1.8,1.4,0.5);}
  const P=(at,fn)=>S.post.push({at,fn});
  if(res!=='crash'){
    const f=new V3(1,0,0).applyQuaternion(S.q);f.y=0;if(f.lengthSq()<1e-4)f.set(1,0,0);f.normalize();
    const q1=quatFromUp(n,f);const mid=gp.reduce((a,b)=>a.add(b),new V3()).multiplyScalar(0.25);
    const p1=COM.clone().applyQuaternion(q1).add(mid).add(n.clone().multiplyScalar(-0.15));
    S.anim={type:'settle',q0:S.q.clone(),q1,p0:S.pos.clone(),p1,t:0};
    P(0.4,()=>{say('ARMSTRONG','Shutdown.');sayClip('engine_stop');});
    P(4.6,()=>sayClip('copy_down'));
    if(res==='ok'){P(7.2,()=>{sayClip('eagle_landed');banner('THE EAGLE HAS LANDED','#7dff8a',6);});
      P(12.4,()=>sayClip('turn_blue'));P(20.5,showDebrief);}
    else{P(7,()=>{say('ALDRIN','That was a hard one, Neil.');banner('HARD LANDING','#ffc04a',4);});P(9.5,()=>say('CAPCOM',"Eagle, Houston. We're looking at your gear and structure data. Stand by."));P(13,showDebrief);}
  }else{
    const low=gp.reduce((a,b)=>a.y<b.y?a:b);let pv=new V3(low.x-o.x,0,low.z-o.z).add(new V3(S.vel.x,0,S.vel.z).multiplyScalar(0.5));if(pv.lengthSq()<1e-4)pv.set(1,0,0);pv.normalize();
    const axis=new V3(0,1,0).cross(pv).normalize();
    S.anim={type:'crash',axis,ang:0,q0:S.q.clone(),p0:S.pos.clone(),pivot:low.clone(),t:0};
    banner('CRASH','#ff5a4a',5);if(AC&&au&&voiceMode){radioStop();noiseBurst(AC.currentTime,2.2,0.12,1200);}
    P(1.5,()=>say('CAPCOM','Eagle, Houston. Do you read? Over.'));P(4.5,()=>say('CAPCOM','Eagle, Houston...'));P(6.5,showDebrief);
  }
}
function radioRecapHTML(){const L=S.postLog||[];if(!L.length)return '';
  const esc=t=>String(t).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  return `<div class="recap" style="text-align:left;margin:10px auto 4px;max-width:560px;font:13px/1.45 'Courier New',monospace;color:#d6dccb">${L.map(l=>`<div style="margin:2px 0"><b style="color:${l.who==='CAPCOM'?'#e9b43a':l.who==='ARMSTRONG'?'#6fb6ff':'#9fc2a0'}">${esc(l.who)}:</b> ${esc(l.text)}</div>`).join('')}</div>`;}
function showDebrief(){
  const r=S.result;if(!r)return;if(r.res==='abort'||(r.abort&&r.res==='crash'))return showAbortDebrief(r);const title={ok:'THE EAGLE HAS LANDED',hard:'HARD LANDING',crash:'MISSION LOST'}[r.res];
  const cls={ok:'res-ok',hard:'res-hard',crash:'res-bad'}[r.res];
  const get=r.get,hh=Math.floor(get/3600),mm=Math.floor(get%3600/60),ss=(get%60).toFixed(1).padStart(4,'0');
  let verdict='';if(r.res==='ok'){verdict=r.fuel-20>40?'Plenty in the tanks. Smooth flying.':r.fuel-20>15?'Close to bingo, just like the real thing.':'Fumes! Houston has stopped breathing.';
    if(r.vs<1&&r.hs<0.4&&r.tilt<4)verdict+=' A textbook touchdown.';}
  else if(r.res==='hard')verdict='She survived, but the descent stage took a beating. The ascent stage may still get you home.';
  else verdict='Eagle did not survive the touchdown.';
  const row=(k,v,bad)=>`<tr><td>${k}</td><td style="color:${bad?'#ff8a6a':'#e2ddcc'}">${v}</td></tr>`;
  $('debriefCard').innerHTML=`<h1 class="${cls}" style="font-size:38px;letter-spacing:6px">${title}</h1><h2>TOUCHDOWN AT GET ${hh}:${String(mm).padStart(2,'0')}:${ss} &middot; ${r.t.toFixed(0)} S AFTER P64 START</h2>
  <p>${verdict}</p>${r.why.length?`<p style="color:#ffb090">${r.why.join('<br>')}</p>`:''}
  <table>${row('Vertical speed',`${r.vs.toFixed(2)} m/s (${(r.vs*FT).toFixed(1)} ft/s)`,r.vs>3)}
  ${row('Horizontal speed',`${r.hs.toFixed(2)} m/s (${(r.hs*FT).toFixed(1)} ft/s)`,r.hs>1.2)}
  ${row('Tilt from vertical',`${r.tilt.toFixed(1)}°`,r.tilt>10)}${row('Ground slope',`${r.slope.toFixed(1)}°`,r.slope>10)}
  ${row('Boulders',r.bhit?'Yes, under the LM':'Clear',r.bhit)}
  ${row('Fuel remaining',`${r.pct.toFixed(1)}% &middot; ${Math.max(0,r.fuel).toFixed(0)} s of hover (${(r.fuel-20).toFixed(0)} s to bingo)`,r.fuel<20)}
  ${row('Distance from planned site',`${r.dist.toFixed(0)} m (${(r.dist*FT).toFixed(0)} ft)`)}</table>
  <p style="font-size:13px;color:#b9b5a6">For reference: Armstrong flew Eagle long, past West crater's boulder field, and touched down with roughly 25&ndash;45 seconds of usable fuel left (estimates vary).</p>
  ${radioRecapHTML()}${failSummaryHTML()}<div class="go"><span class="kbonly">PRESS R</span><span class="touchonly">TAP</span> TO FLY AGAIN</div>`;
  $('debrief').classList.remove('hidden');
}

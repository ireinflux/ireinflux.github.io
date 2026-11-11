
// ---------------- aborts: P70 (DPS abort) and P71 (APS abort / ABORT STAGE) ----------------
// Masses: DRY (6900 kg) is descent stage dry + fully fuelled ascent stage. Ascent stage ~2180 kg dry + ~2350 kg APS propellant.
const ASC_DRY=2180, ASC_FUEL0=2350, APS_T=15570, APS_ISP=311, ASC_BASE=2.95;
const DOWNRANGE=new V3(1,0,0.04).normalize();           // orbital direction of travel (east, along the ground track)
const DS={active:false,done:false,pos:new V3(),vel:new V3(),q:new THREE.Quaternion(),w:new V3(),fate:null,impact:0,anim:null};
const debris=[];
function apsPct(){return S.apsFuel/ASC_FUEL0*100;}
function abortInfo(mode){const o=originPt();return {mode,t:S.t,get:GET0+S.t,alt:altitude(),vs:S.vel.y,hs:Math.hypot(S.vel.x,S.vel.z),dpsPct:fuelPct(),hover:hoverSec(),range:Math.hypot(o.x-TARGET.x,o.z-TARGET.z)};}
function abortSay(at,who,text,clip){S.abortEv.push({t:S.t+at,fn:()=>clip?sayClip(clip,true):say(who,text)});S.abortEv.sort((a,b)=>a.t-b.t);}

function doAbort(){
  if(S.mode!=='fly'||S.abort)return;
  S.abort='P70';S.prog=70;S.auto=true;S.events=[];S.alarm=null;S.alarmAck=true;S.master=false;S.info=abortInfo('P70');
  if(S.fuel>0){S.engineOn=true;S.thrCmd=1;}
  banner('ABORT · P70 DPS ABORT','#ff7a4a',3.5);
  say('ARMSTRONG','Abort.');shake=Math.max(shake,0.15);
  abortSay(1.6,'CAPCOM',null,'duke_roger');
  abortSay(3.4,'CAPCOM',"Eagle, Houston. We copy the abort. Descent engine abort, you're looking good.");
  if(S.fuel<=0)abortSay(2.4,'CAPCOM','Eagle, your descent engine is out. Abort stage. Abort stage.');
}
function doAbortStage(){
  if(S.mode!=='fly'||S.staged)return;
  const first=!S.abort;S.abort='P71';S.prog=71;S.auto=true;S.events=[];S.alarm=null;S.alarmAck=true;S.master=false;
  if(first)S.info=abortInfo('P71');S.info.staged={t:S.t,alt:altitude(),vs:S.vel.y,dpsPct:fuelPct()};
  // pyros fire, descent stage goes free, ascent engine lights ("fire in the hole")
  const sepPt=worldPt(new V3(0,ASC_BASE,0).sub(COM));
  DS.active=true;DS.done=false;DS.fate=null;DS.anim=null;DS.pos.copy(S.pos);DS.q.copy(S.q);
  DS.vel.copy(S.vel).addScaledVector(upVec(),-1.2);DS.w.set((Math.random()-0.5)*0.12,(Math.random()-0.5)*0.05,(Math.random()-0.5)*0.12);
  dsRoot.add(dsG);dsG.position.copy(COM).negate();dsRoot.visible=true;dsRoot.position.copy(DS.pos);dsRoot.quaternion.copy(DS.q);
  freezeBingo();
  S.staged=true;S.engineOn=false;S.thr=0;S.thrCmd=0;S.apsOn=true;S.vel.addScaledVector(upVec(),0.4);
  stageFx(sepPt);
  banner('ABORT STAGE · P71 APS ABORT','#ff5a3a',3.5);
  say('ALDRIN',first?'Abort stage!':'Staging.');
  abortSay(0.9,'ARMSTRONG','Staging. Ascent engine on.');
  abortSay(2.6,'CAPCOM',null,'duke_we_copy');
  abortSay(4.4,'CAPCOM',"Eagle, Houston. We copy staging. You're climbing on the ascent engine.");
}
// abort guidance: arrest the sink rate upright, then pitch over downrange to build orbital velocity
function abortGuidance(){const alt=altitude();let tilt=clamp((alt-40)/350,0,1)*40*DEG;if(S.vel.y<-2)tilt=Math.min(tilt,6*DEG);
  const side=new V3(-DOWNRANGE.z,0,DOWNRANGE.x);const vs=S.vel.dot(side);
  return new V3(0,Math.cos(tilt),0).addScaledVector(DOWNRANGE,Math.sin(tilt)).addScaledVector(side,-clamp(vs*0.03,-0.15,0.15)).normalize();}
// called from simStep while an abort is in progress
function abortStep(dt){
  while(S.abortEv.length&&S.abortEv[0].t<=S.t){const e=S.abortEv.shift();if(S.mode==='fly')e.fn();}
  if(S.abort==='P70'&&!S.staged&&S.fuel<=0&&!S.saidStageNow){S.saidStageNow=true;S.master=true;S.alarmAck=false;S.alarmT=S.t;
    banner('DPS DEPLETED · ABORT STAGE!','#ff5a4a',4);say('CAPCOM','Eagle, Houston. Abort stage! Abort stage!');}
  const alt=altitude();
  if(S.mode==='fly'&&S.t-S.info.t>6&&alt>=Math.max(350,S.info.alt+120)&&S.vel.y>4)abortSuccess();
}
function abortSuccess(){
  S.mode='abortok';S.post=[];S.postT=0;
  S.result={res:'abort',abort:S.info,t:S.t,get:GET0+S.t,alt:altitude(),vs:S.vel.y,hs:Math.hypot(S.vel.x,S.vel.z),dpsPct:fuelPct(),apsPct:apsPct(),staged:S.staged};
  banner('CREW SAFE · CLIMBING TO ORBIT','#7dff8a',5);
  const P=(at,fn)=>S.post.push({at,fn});
  P(0.6,()=>say('CAPCOM',"Eagle, Houston. Trajectory looks good. You're on your way back up to Columbia."));
  P(4.5,()=>say('ARMSTRONG',"Roger. We'll get her next time."));
  const wait=()=>{if(DS.done||!DS.active||S.postT>40)showDebrief();else P(S.postT+1,wait);};P(8,wait);
}
function ascentCrash(){
  const vs=-S.vel.y,hs=Math.hypot(S.vel.x,S.vel.z),o=originPt();
  S.result={res:'crash',abort:S.info,why:[`The ascent stage hit the surface at ${vs.toFixed(1)} m/s (${(vs*FT).toFixed(0)} ft/s) down, ${hs.toFixed(1)} m/s sideways.`,
    'The abort came too late: the ascent engine (15.6 kN) could not arrest the sink rate in the height that was left.'],vs,hs,alt:0,t:S.t,get:GET0+S.t,staged:true};
  S.mode='crashed';S.apsOn=false;S.thr=0;S.w.set(0,0,0);S.master=true;S.alarmAck=false;S.alarmT=S.t;S.post=[];S.postT=0;S.anim=null;
  for(let i=0;i<320;i++){const a=Math.random()*6.283,sp=5+Math.random()*18;emitDust(o.x,H(o.x,o.z)+0.4,o.z,Math.cos(a)*sp,Math.random()*7,Math.sin(a)*sp,1+Math.random()*2,1.6,0.6);}
  stageFx(o,0.6);shake=1.4;banner('CRASH','#ff5a4a',5);if(AC&&au){radioStop();noiseBurst(AC.currentTime,2.2,0.12,1200);}
  const P=(at,fn)=>S.post.push({at,fn});
  P(1.5,()=>say('CAPCOM','Eagle, Houston. Do you read? Over.'));P(4.5,()=>say('CAPCOM','Eagle, Houston...'));P(6.5,showDebrief);
}
// separation flash, debris and pyro bang
function stageFx(p,big=1){fxLight.position.copy(p);fxLight.intensity=900*big;
  for(let i=0;i<90*big;i++){const a=Math.random()*6.283,sp=6+Math.random()*12;emitDust(p.x,p.y,p.z,S.vel.x+Math.cos(a)*sp,S.vel.y+(Math.random()-0.3)*6,S.vel.z+Math.sin(a)*sp,0.25+Math.random()*0.45,0.5+Math.random()*0.7,0.6);}
  for(let i=0;i<14;i++){const m=new THREE.Mesh(debrisGeo,Math.random()<0.6?debrisMat[0]:debrisMat[1]);m.position.copy(p);m.scale.setScalar(0.4+Math.random()*0.9);scene.add(m);
    const a=Math.random()*6.283,sp=4+Math.random()*10;debris.push({m,v:new V3(Math.cos(a)*sp,1+Math.random()*6,Math.sin(a)*sp).add(S.vel),w:new V3(Math.random()*9,Math.random()*9,Math.random()*9),life:5+Math.random()*3});}
  shake=Math.max(shake,0.5*big);bang(big);}
function bang(big=1){if(!AC||!au)return;const t=AC.currentTime;noiseBurst(t,0.6*big,0.35*big,300);noiseBurst(t,0.25,0.15*big,2500);
  const o=AC.createOscillator(),g=AC.createGain();o.frequency.setValueAtTime(90,t);o.frequency.exponentialRampToValueAtTime(30,t+0.4);g.gain.setValueAtTime(0.5*big,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.5);o.connect(g).connect(au.master);o.start(t);o.stop(t+0.55);}
const debrisGeo=new THREE.BoxGeometry(0.35,0.05,0.25),debrisMat=[new THREE.MeshStandardMaterial({color:0xd8a43a,metalness:0.7,roughness:0.35}),new THREE.MeshStandardMaterial({color:0xb7bbbf,metalness:0.5,roughness:0.4})];
const fxLight=new THREE.PointLight(0xffd6a0,0,120,1.6);scene.add(fxLight);
function updateDebris(dt){fxLight.intensity*=Math.exp(-dt*7);
  for(let i=debris.length-1;i>=0;i--){const d=debris[i];d.life-=dt;d.v.y-=GM*dt;d.m.position.addScaledVector(d.v,dt);d.m.rotation.x+=d.w.x*dt;d.m.rotation.y+=d.w.y*dt;
    const gy=H(d.m.position.x,d.m.position.z);if(d.m.position.y<gy+0.05){d.m.position.y=gy+0.05;d.v.set(0,0,0);d.w.set(0,0,0);}
    if(d.life<=0){scene.remove(d.m);debris.splice(i,1);}}}
function clearDebris(){for(const d of debris)scene.remove(d.m);debris.length=0;fxLight.intensity=0;}
// free-falling descent stage after ABORT STAGE
function dsPt(local,out=new V3()){return out.copy(local).applyQuaternion(DS.q).add(DS.pos);}
function updateDS(dt){
  if(!DS.active)return;
  if(DS.anim){const a=DS.anim;if(a.ang<a.max){a.ang=Math.min(a.max,a.ang+dt*(0.4+a.ang*2.2));const qr=new THREE.Quaternion().setFromAxisAngle(a.axis,a.ang);DS.q.copy(qr).multiply(a.q0);DS.pos.copy(a.p0).sub(a.pivot).applyQuaternion(qr).add(a.pivot);}return;}
  if(DS.done)return;
  DS.vel.y-=GM*dt;DS.pos.addScaledVector(DS.vel,dt);const ang=DS.w.length()*dt;if(ang>1e-9){tq.setFromAxisAngle(tv.copy(DS.w).normalize(),ang);DS.q.multiply(tq).normalize();}
  let hit=null;for(const p of PADS.concat(HULL_D)){dsPt(p,tv);if(tv.y<=H(tv.x,tv.z)){hit=p;break;}}
  if(!hit)return;
  const vs=-DS.vel.y,hs=Math.hypot(DS.vel.x,DS.vel.z),tilt=Math.acos(clamp(new V3(0,1,0).applyQuaternion(DS.q).y,-1,1))/DEG;
  const padHit=PADS.includes(hit);DS.done=true;DS.impact=vs;DS.impactH=hs;
  const o=dsPt(new V3().sub(COM));DS.fate=(padHit&&vs<3.5&&hs<2&&tilt<15)?'landed':'crashed';
  for(let i=0;i<(DS.fate==='crashed'?300:120);i++){const a=Math.random()*6.283,sp=3+Math.random()*(DS.fate==='crashed'?16:5);emitDust(o.x,H(o.x,o.z)+0.3,o.z,Math.cos(a)*sp,Math.random()*(DS.fate==='crashed'?6:1),Math.sin(a)*sp,1+Math.random()*1.8,1.4,0.5);}
  if(DS.fate==='crashed'){const pw=PADS.map(p=>dsPt(p)),low=pw.reduce((a,b)=>a.y<b.y?a:b);let pv=new V3(low.x-o.x,0,low.z-o.z).add(new V3(DS.vel.x,0,DS.vel.z).multiplyScalar(0.5));if(pv.lengthSq()<1e-4)pv.set(1,0,0);pv.normalize();
    DS.anim={axis:new V3(0,1,0).cross(pv).normalize(),pivot:low.clone(),ang:0,max:vs>8?1.5:1.2,q0:DS.q.clone(),p0:DS.pos.clone()};if(vs>8)stageFx(o,0.5);else bang(0.4);}
  DS.vel.set(0,0,0);DS.w.set(0,0,0);
  if(S.mode==='fly'||S.mode==='abortok')say('ALDRIN',DS.fate==='crashed'?'Descent stage just hit, pretty hard.':'Descent stage is down. Looks like she landed on her legs.');
}
function dsFateText(){if(!S.staged)return 'Still attached (descent-engine abort, no staging)';if(!DS.done)return 'Still falling when the debrief was called';
  return DS.fate==='landed'?`Landed on its legs at ${DS.impact.toFixed(1)} m/s; a lunar monument`:`Crashed at ${DS.impact.toFixed(1)} m/s (${(DS.impact*FT).toFixed(0)} ft/s)`;}
function showAbortDebrief(r){
  const a=r.abort,ok=r.res==='abort';const fmtGET=g=>{const hh=Math.floor(g/3600),mm=Math.floor(g%3600/60),ss=(g%60).toFixed(1).padStart(4,'0');return `${hh}:${String(mm).padStart(2,'0')}:${ss}`;};
  const row=(k,v,bad)=>`<tr><td>${k}</td><td style="color:${bad?'#ff8a6a':'#e2ddcc'}">${v}</td></tr>`;
  const mode=a.mode==='P70'?(r.staged?'P70 DPS abort, then ABORT STAGE (P71)':'P70 · descent-engine abort'):'P71 · ABORT STAGE (ascent-engine abort)';
  let verdict;if(ok)verdict=r.staged?'The ascent stage climbed away on its own engine. Eagle is heading back up to rendezvous with Columbia; the landing will have to wait.':'The descent engine had enough propellant to climb back toward orbit. A clean abort, with the ascent stage untouched.';
  else verdict='Abort initiated, but too late to save the vehicle.';
  $('debriefCard').innerHTML=`<h1 class="${ok?'res-hard':'res-bad'}" style="font-size:34px;letter-spacing:5px">${ok?'ABORT · MISSION ABORTED, CREW SAFE':'ABORT FAILED · MISSION LOST'}</h1>
  <h2>${mode.toUpperCase()} &middot; INITIATED AT GET ${fmtGET(a.get)}</h2><p>${verdict}</p>${r.why&&r.why.length?`<p style="color:#ffb090">${r.why.join('<br>')}</p>`:''}
  <table>${row('Altitude at abort',`${(a.alt*FT).toFixed(0)} ft (${a.alt.toFixed(0)} m)`)}
  ${row('Vertical speed at abort',`${(a.vs*FT).toFixed(1)} ft/s (${a.vs.toFixed(1)} m/s)`,a.vs<-6)}
  ${row('Descent fuel at abort',`${a.dpsPct.toFixed(1)}% &middot; ${Math.max(0,a.hover).toFixed(0)} s of hover`)}
  ${r.staged&&S.info.staged?row('Staged at',`${(S.info.staged.alt*FT).toFixed(0)} ft, ${(S.info.staged.vs*FT).toFixed(1)} ft/s`,S.info.staged.vs<-6):''}
  ${ok?row('Altitude when declared safe',`${(r.alt*FT).toFixed(0)} ft, climbing ${(r.vs*FT).toFixed(0)} ft/s`):row('Impact',`${(r.vs*FT).toFixed(0)} ft/s down`,true)}
  ${row(ok?'Fuel left when safe':'Fuel left',r.staged?`Ascent ${(ok?r.apsPct:apsPct()).toFixed(0)}% (${(ASC_FUEL0*(ok?r.apsPct:apsPct())/100).toFixed(0)} kg)`:`Descent ${(ok?r.dpsPct:fuelPct()).toFixed(1)}%`,ok?false:true)}
  ${row('Descent stage',dsFateText(),DS.fate==='crashed')}</table>
  <p style="font-size:13px;color:#b9b5a6">For reference: Apollo 11 never needed either button, but the crew rehearsed both aborts in the simulator. Abort charts marked a region of low altitude and high sink rate (the "dead man's zone") where even an abort stage could not stop the LM reaching the surface.</p>
  ${radioRecapHTML()}${failSummaryHTML()}<div class="go"><span class="kbonly">PRESS R</span><span class="touchonly">TAP</span> TO FLY AGAIN</div>`;
  $('debrief').classList.remove('hidden');}

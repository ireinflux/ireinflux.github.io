
// ---------------- camera ----------------
const camState={mode:0,yaw:Math.PI-0.5,pitch:0.22,dist:30};
const CAMNAMES=['CHASE CAMERA','LM WINDOW (LEFT SEAT)','TV CAMERA'];
const tvPos=new V3(260,0,140);tvPos.y=H(tvPos.x,tvPos.z)+1.8;
let shake=0;
function updateCamera(dt){
  const tgt=S.pos.clone();
  if(camState.mode===0){const cp=Math.cos(camState.pitch),sp=Math.sin(camState.pitch);
    camera.position.set(tgt.x+Math.cos(camState.yaw)*cp*camState.dist,tgt.y+sp*camState.dist,tgt.z+Math.sin(camState.yaw)*cp*camState.dist);
    const gh=H(camera.position.x,camera.position.z)+1.2;if(camera.position.y<gh)camera.position.y=gh;
    camera.up.set(0,1,0);camera.lookAt(tgt);camera.fov=55;camera.near=0.3;
  }else if(camState.mode===1){camera.position.copy(worldPt(new V3(1.75,4.35,-0.5).sub(COM)));
    const d=new V3(Math.cos(28*DEG),-Math.sin(28*DEG),0.05).applyQuaternion(S.q);camera.up.copy(upVec());camera.lookAt(camera.position.clone().add(d));camera.fov=62;camera.near=0.05;
  }else{camera.position.copy(tvPos);camera.up.set(0,1,0);camera.lookAt(tgt);const dd=camera.position.distanceTo(tgt);camera.fov=clamp(2*Math.atan(18/dd)/DEG,1.5,50);camera.near=0.5;}
  if(shake>0){camera.position.x+=(Math.random()-0.5)*shake;camera.position.y+=(Math.random()-0.5)*shake;shake=Math.max(0,shake-dt*0.8);}
  camera.updateProjectionMatrix();sky.position.copy(camera.position);
}

// ---------------- visuals per frame ----------------
function updateVisuals(dt){
  if(S.anim&&!paused){const a=S.anim;a.t+=dt;
    if(a.type==='settle'){const k=clamp(a.t/0.6,0,1),e=k*k*(3-2*k);S.q.copy(a.q0).slerp(a.q1,e);S.pos.copy(a.p0).lerp(a.p1,e);}
    else{a.ang=Math.min(1.35,a.ang+dt*(0.4+a.ang*2.2));const qr=new THREE.Quaternion().setFromAxisAngle(a.axis,a.ang);
      S.q.copy(qr).multiply(a.q0);S.pos.copy(a.p0).sub(a.pivot).applyQuaternion(qr).add(a.pivot);if(a.t<0.05)shake=1.2;}
  }
  if((S.mode==='landed'||S.mode==='crashed'||S.mode==='abortok')&&!paused){S.postT+=dt;while(S.post.length&&S.post[0].at<=S.postT)S.post.shift().fn();}
  if(!paused){if(S.mode!=='fly'&&S.mode!=='abortok')updateDS(dt);updateDebris(dt);}
  if(DS.active){dsRoot.position.copy(DS.pos);dsRoot.quaternion.copy(DS.q);}
  const flying=S.mode==='fly'||S.mode==='abortok',apsLit=S.staged&&S.apsOn&&flying;
  lmRoot.position.copy(S.pos);lmRoot.quaternion.copy(S.q);
  const thr=S.thr;plume.visible=thr>0.02;
  if(plume.visible){const fl=0.85+Math.random()*0.3;plume.scale.set(0.8+thr*0.5,(0.5+thr*0.9)*fl,0.8+thr*0.5);plume.children[0].material.opacity=0.12+0.28*thr;plume.children[1].material.opacity=0.25+0.4*thr;}
  aplume.visible=apsLit;if(apsLit){const fl=0.85+Math.random()*0.3;aplume.scale.set(1,fl,1);}
  engLight.intensity=apsLit?40:thr*60;engLight.position.copy(worldPt(new V3(0,apsLit?1.4:-1.5,0).sub(COM)));
  // RCS: only the jets whose torque matches the commanded attitude change fire (plus a stuck-on jet), as brief soft wisps
  const spf=stuckPuff();
  if(!paused){const cm=S.rcsCmd.length(),cn=cm>1e-6?S.rcsCmd.clone().divideScalar(cm):null;const rate=(LOW?200:340)*dt;
    puffs.forEach((j,i)=>{let f=0;if(flying&&S.rcs>0){if(i===spf)f=1.3;else if(cn&&cm>0.15){const s=j.tq.dot(cn);if(s>0.55)f=Math.min(1,cm)*(s-0.55)/0.45*0.6+0.4;}}
      j.on=f;if(f>0)emitRcs(j,Math.floor(rate*f+Math.random()),f,S.q,S.pos,S.vel);});
    updateRcsFx(dt);}
  const eff=apsLit?0.45:thr;
  if(!paused){const alt=altitude();
    if(flying&&eff>0.05&&alt<42){const u=upVec();const o=originPt();const t=alt/Math.max(0.35,u.y);
      const gx=o.x-u.x*t,gz=o.z-u.z*t,gy=H(gx,gz);const inten=eff*Math.pow(1-alt/42,1.6);const nE=Math.floor((LOW?1300:2600)*inten*dt+Math.random());
      for(let i=0;i<nE;i++){const a=Math.random()*6.283,r0=0.5+Math.random()*3,sp=14+Math.random()*28;emitDust(gx+Math.cos(a)*r0,gy+0.15+Math.random()*0.4,gz+Math.sin(a)*r0,Math.cos(a)*sp,0.3+Math.random()*1.6,Math.sin(a)*sp,0.6+Math.random()*1.1,1.1+Math.random()*1.8,0.55);}}
    updateDust(dt);}
  const o=originPt();const alt=Math.max(0,o.y-H(o.x,o.z));const focus=new V3(o.x,H(o.x,o.z),o.z);
  const sz=clamp(70+alt*0.55,70,700);const sc=sun.shadow.camera;if(Math.abs(sc.right-sz)>1){sc.left=-sz;sc.right=sz;sc.top=sz;sc.bottom=-sz;sc.updateProjectionMatrix();}
  sun.position.copy(focus).addScaledVector(sunDir,1500);sun.target.position.copy(focus);sun.target.updateMatrixWorld();
  updateCamera(dt);
  dustMat.uniforms.uScale.value=renderer.domElement.height/(2*Math.tan(camera.fov*DEG/2));rcsMat.uniforms.uScale.value=dustMat.uniforms.uScale.value;
  if(bannerTimer>0){bannerTimer-=dt;if(bannerTimer<=0)$('banner').style.opacity=0;}
  restyleComms();
}

// ---------------- audio ----------------
let AC=null,au=null;
function initAudio(){if(AC)return;try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){return;}
  const master=AC.createGain();master.gain.value=muted?0:0.7;master.connect(AC.destination);
  const len=AC.sampleRate*2,bb=AC.createBuffer(1,len,AC.sampleRate),wb=AC.createBuffer(1,len,AC.sampleRate),d=bb.getChannelData(0),w=wb.getChannelData(0);let last=0;
  for(let i=0;i<len;i++){const r=Math.random()*2-1;last=(last+0.02*r)/1.02;d[i]=last*3.5;w[i]=r;}
  const eng=AC.createBufferSource();eng.buffer=bb;eng.loop=true;const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=200;const eg=AC.createGain();eg.gain.value=0;eng.connect(lp).connect(eg).connect(master);eng.start();
  const rs=AC.createBufferSource();rs.buffer=wb;rs.loop=true;const bp=AC.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1600;bp.Q.value=0.7;const rg=AC.createGain();rg.gain.value=0;rs.connect(bp).connect(rg).connect(master);rs.start();
  const ao=AC.createOscillator();ao.type='square';ao.frequency.value=750;const ag=AC.createGain();ag.gain.value=0;const af=AC.createBiquadFilter();af.type='lowpass';af.frequency.value=2500;ao.connect(af).connect(ag).connect(master);ao.start();
  au={master,eg,lp,rg,ag,ao,wb};decodeClips();}
function beep(f,dur,vol,at){if(!AC||!au)return;at=Math.max(at||0,AC.currentTime);const o=AC.createOscillator(),g=AC.createGain();o.frequency.value=f;g.gain.value=vol;o.connect(g).connect(au.master);o.start(at);o.stop(at+dur);}
function updateAudio(){if(!AC||!au)return;const t=AC.currentTime;const on=(S.mode==='fly'||S.mode==='abortok')&&!paused;const aps=S.staged&&S.apsOn,lvl=aps?0.75:S.thr;
  au.master.gain.setTargetAtTime(muted?0:0.7,t,0.05);
  au.eg.gain.setTargetAtTime(on&&lvl>0.02?(0.12+0.55*lvl)*(radioBusy()?0.55:1):0,t,0.08);au.lp.frequency.setTargetAtTime(aps?780:140+380*S.thr,t,0.1);
  au.rg.gain.setTargetAtTime(on?Math.max(S.rcsAct*0.05,stuckPuff()>=0?0.04:0):0,t,0.03);
  const alarmOn=S.master&&!S.alarmAck&&!paused&&(performance.now()%600<300);au.ag.gain.setTargetAtTime(alarmOn?0.025:0,t,0.01);au.ao.frequency.value=(performance.now()%1200<600)?750:1000;}

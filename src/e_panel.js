
// ---------------- instrument panel (2D canvas) ----------------
const pc=$('panel'),px=pc.getContext('2d'),ov=$('overlay'),ox=ov.getContext('2d');
const bg=document.createElement('canvas');let PS=1,PH=200,POX=0,DPR=1,VIEWH=0;
const NB=150,nbC=document.createElement('canvas');nbC.width=nbC.height=NB;const nbX=nbC.getContext('2d'),nbImg=nbX.createImageData(NB,NB);
const FONT='"Arial Narrow","Helvetica Neue",Arial,sans-serif';
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function screw(c,x,y){const g=c.createRadialGradient(x-1,y-1,0,x,y,4);g.addColorStop(0,'#d4d7cf');g.addColorStop(1,'#5b6058');c.fillStyle=g;c.beginPath();c.arc(x,y,3.6,0,7);c.fill();c.strokeStyle='#33362f';c.lineWidth=1;c.beginPath();c.moveTo(x-2.4,y-1);c.lineTo(x+2.4,y+1);c.stroke();}
function plate(c,x,y,w,h,lab){const g=c.createLinearGradient(0,y,0,y+h);g.addColorStop(0,'#59615a');g.addColorStop(1,'#454c45');rr(c,x,y,w,h,6);c.fillStyle=g;c.fill();
  c.strokeStyle='#1d211c';c.lineWidth=2.5;c.stroke();rr(c,x+2,y+2,w-4,h-4,5);c.strokeStyle='rgba(255,255,255,0.12)';c.lineWidth=1;c.stroke();
  screw(c,x+8,y+8);screw(c,x+w-8,y+8);screw(c,x+8,y+h-8);screw(c,x+w-8,y+h-8);
  if(lab)label(c,lab,x+w/2,y+15,11);}
function label(c,t,x,y,size=10,col='#ece8d8',align='center'){c.font=`bold ${size}px ${FONT}`;c.fillStyle=col;c.textAlign=align;c.fillText(t,x,y);}
function bezel(c,cx,cy,r){const g=c.createLinearGradient(cx-r,cy-r,cx+r,cy+r);g.addColorStop(0,'#c9ccc4');g.addColorStop(0.5,'#6c706a');g.addColorStop(1,'#2c2f2a');c.fillStyle=g;c.beginPath();c.arc(cx,cy,r+6,0,7);c.fill();c.fillStyle='#0e0f0e';c.beginPath();c.arc(cx,cy,r,0,7);c.fill();}
function gaugeFace(c,cx,cy,r,max,step,zones){bezel(c,cx,cy,r);
  for(const z of zones){c.strokeStyle=z.c;c.lineWidth=7;c.beginPath();c.arc(cx,cy,r-9,(135+270*z.a/max)*DEG,(135+270*z.b/max)*DEG);c.stroke();}
  for(let v=0;v<=max+1e-6;v+=step/2){const a=(135+270*v/max)*DEG,maj=Math.abs(v/step-Math.round(v/step))<1e-6;c.strokeStyle='#e9e5d6';c.lineWidth=maj?2.4:1.1;
    c.beginPath();c.moveTo(cx+Math.cos(a)*(r-(maj?16:10)),cy+Math.sin(a)*(r-(maj?16:10)));c.lineTo(cx+Math.cos(a)*(r-3),cy+Math.sin(a)*(r-3));c.stroke();
    if(maj)label(c,String(Math.round(v)),cx+Math.cos(a)*(r-24),cy+Math.sin(a)*(r-24)+4,11);}
}
const L={s7:{x:1398,y:8,w:114,h:234},s1:{x:8,y:8,w:250,h:234},s2:{x:264,y:8,w:212,h:234},s3:{x:482,y:8,w:160,h:234},s4:{x:648,y:8,w:200,h:234},s5:{x:854,y:8,w:212,h:234},s6:{x:1072,y:8,w:320,h:234}};
function drawStatic(){const c=bg.getContext('2d');c.setTransform(DPR,0,0,DPR,0,0);const W=bg.width/DPR;
  const g=c.createLinearGradient(0,0,0,PH);g.addColorStop(0,'#3a403a');g.addColorStop(1,'#272b26');c.fillStyle=g;c.fillRect(0,0,W,PH);
  for(let i=0;i<W*PH/60;i++){const v=Math.random()<0.5?255:0;c.fillStyle=`rgba(${v},${v},${v},0.035)`;c.fillRect(Math.random()*W,Math.random()*PH,2,2);}
  c.fillStyle='#121411';c.fillRect(0,0,W,3);
  c.translate(POX,0);c.scale(PS,PS);
  plate(c,L.s1.x,L.s1.y,L.s1.w,L.s1.h,'MISSION TIMER · CAUTION & WARNING');
  plate(c,L.s2.x,L.s2.y,L.s2.w,L.s2.h,'FDAI · ATTITUDE');
  plate(c,L.s3.x,L.s3.y,L.s3.w,L.s3.h,'ALT / ALT RATE');
  plate(c,L.s4.x,L.s4.y,L.s4.w,L.s4.h,'X-POINTER · HORIZ VEL');
  plate(c,L.s5.x,L.s5.y,L.s5.w,L.s5.h,'DESCENT ENGINE · PRPLNT');
  plate(c,L.s6.x,L.s6.y,L.s6.w,L.s6.h,'DSKY · GUIDANCE COMPUTER');
  plate(c,L.s7.x,L.s7.y,L.s7.w,L.s7.h,'ABORT');
  for(const [x,l] of [[500,'ALT FT'],[572,'RATE FPS']]){rr(c,x-4,30,62,180,4);c.fillStyle='#1c1e1b';c.fill();label(c,l,x+27,226,10);}
  {const x=670,y=30,s=156;rr(c,x-4,y-4,s+8,s+8,5);c.fillStyle='#1c1e1b';c.fill();c.fillStyle='#0d0e0d';c.fillRect(x,y,s,s);c.strokeStyle='#5f655b';c.lineWidth=1;
   for(let i=1;i<10;i++){const t=x+i*s/10;c.beginPath();c.moveTo(t,y+s/2-(i%5?3:6));c.lineTo(t,y+s/2+(i%5?3:6));c.stroke();c.beginPath();c.moveTo(x+s/2-(i%5?3:6),y+i*s/10);c.lineTo(x+s/2+(i%5?3:6),y+i*s/10);c.stroke();}
   c.strokeStyle='#8a9185';c.beginPath();c.moveTo(x+s/2,y);c.lineTo(x+s/2,y+s);c.moveTo(x,y+s/2);c.lineTo(x+s,y+s/2);c.stroke();
   label(c,'FWD',x+s/2-14,y+12,9,'#aab0a2');label(c,'AFT',x+s/2-14,y+s-5,9,'#aab0a2');label(c,'L',x+8,y+s/2-5,9,'#aab0a2');label(c,'R',x+s-8,y+s/2-5,9,'#aab0a2');}
  gaugeFace(c,906,90,46,100,20,[{a:10,b:60,c:'#2f7d3a'},{a:60,b:100,c:'#8a6a1c'}]);
  gaugeFace(c,1014,90,46,15,3,[{a:0,b:5.6,c:'#9a2a20'}]);
  label(c,'THROTTLE %',906,154,11);
  label(c,'PRPLNT QTY',1014,148,10);
  label(c,'% DES',1014,160,10);
  {const x=1084,y=26;rr(c,x,y,298,206,6);c.fillStyle='#6b6f69';c.fill();c.strokeStyle='#2a2d29';c.lineWidth=2;c.stroke();
   rr(c,x+8,y+8,96,190,4);c.fillStyle='#3c3f3b';c.fill();rr(c,x+112,y+8,178,190,4);c.fillStyle='#070a07';c.fill();}
  bezel(c,370,112,78);
}
const S7={'0':'abcdef','1':'bc','2':'abdeg','3':'abcdg','4':'bcfg','5':'acdfg','6':'acdefg','7':'abc','8':'abcdefg','9':'abcdfg','-':'g','+':'gp',' ':''};
function seg7digit(c,ch,x,y,w,h,on,off){const t=Math.max(2,w*0.18);
  const sg={a:[x+t*0.6,y,w-t*1.2,t],d:[x+t*0.6,y+h-t,w-t*1.2,t],g:[x+t*0.6,y+h/2-t/2,w-t*1.2,t],f:[x,y+t*0.6,t,h/2-t*0.9],b:[x+w-t,y+t*0.6,t,h/2-t*0.9],e:[x,y+h/2+t*0.3,t,h/2-t*0.9],c:[x+w-t,y+h/2+t*0.3,t,h/2-t*0.9],p:[x+w/2-t/2,y+h*0.22,t,h*0.56]};
  const lit=S7[ch]??'';c.shadowBlur=0;c.fillStyle=off;for(const k of 'abcdefg')if(!lit.includes(k))c.fillRect(...sg[k]);
  c.fillStyle=on;c.shadowColor=on;c.shadowBlur=6;for(const k of lit)c.fillRect(...sg[k]);c.shadowBlur=0;}
function seg7(c,str,x,y,w,h,on,off,gap=4){for(const ch of str){if(ch===':'){c.fillStyle=on;const t=Math.max(2,w*0.18);c.fillRect(x+1,y+h*0.28,t,t);c.fillRect(x+1,y+h*0.66,t,t);x+=t+gap;continue;}seg7digit(c,ch,x,y,w,h,on,off);x+=w+gap;}}
function lamp(c,x,y,w,h,txt,on,col){rr(c,x,y,w,h,3);c.fillStyle=on?col:'#262822';c.fill();c.strokeStyle='#121410';c.lineWidth=1.5;c.stroke();
  if(on){c.shadowColor=col;c.shadowBlur=14;c.fill();c.shadowBlur=0;}
  const ink=on?'#1a1206':'#6e7266',parts=txt.split(/\s+/);
  if(parts.length>=2&&w<70){label(c,parts[0],x+w/2,y+h/2-3,8,ink);label(c,parts.slice(1).join(' '),x+w/2,y+h/2+8,8,ink);}
  else label(c,txt,x+w/2,y+h/2+4,txt.length>11?9:(w<50?8:10),ink);}
function needle(c,cx,cy,r,v,max,col,w=3){
  const a=(135+270*clamp(v,0,max)/max)*DEG,ca=Math.cos(a),sa=Math.sin(a),px=-sa,py=ca;
  const tip=r-5,tail=11,hw=Math.max(2.2,w*0.7);
  c.save();c.fillStyle=col;c.strokeStyle='rgba(0,0,0,0.45)';c.lineWidth=0.8;c.beginPath();
  c.moveTo(cx+ca*tip,cy+sa*tip);
  c.lineTo(cx+px*hw-ca*3,cy+py*hw-sa*3);
  c.lineTo(cx-ca*tail+px*hw*0.65,cy-sa*tail+py*hw*0.65);
  c.lineTo(cx-ca*tail-px*hw*0.65,cy-sa*tail-py*hw*0.65);
  c.lineTo(cx-px*hw-ca*3,cy-py*hw-sa*3);c.closePath();c.fill();c.stroke();c.restore();}
function needleHub(c,cx,cy){c.beginPath();c.arc(cx,cy,7,0,7);c.fillStyle='#2a2d29';c.fill();
  c.beginPath();c.arc(cx,cy,5,0,7);c.fillStyle='#c5c9c0';c.fill();
  c.beginPath();c.arc(cx,cy,2.1,0,7);c.fillStyle='#3a3d38';c.fill();}
function tape(c,x,y,w,h,val,span,major,minor,fmt){c.save();c.beginPath();c.rect(x,y,w,h);c.clip();
  const g=c.createLinearGradient(x,0,x+w,0);g.addColorStop(0,'#1a1a18');g.addColorStop(0.5,'#36362f');g.addColorStop(1,'#1a1a18');c.fillStyle=g;c.fillRect(x,y,w,h);
  const pp=h/span;for(let v=Math.ceil((val-span/2)/minor)*minor;v<=val+span/2;v+=minor){const yy=y+h/2-(v-val)*pp;const maj=Math.abs(v/major-Math.round(v/major))<1e-6;
    c.strokeStyle='#e9e5d6';c.lineWidth=maj?2:1;c.beginPath();c.moveTo(x+w-(maj?14:7),yy);c.lineTo(x+w,yy);c.stroke();if(maj){const s=fmt(v);if(s)label(c,s,x+w-17,yy+4,11,'#e9e5d6','right');}}
  const sh=c.createLinearGradient(0,y,0,y+h);sh.addColorStop(0,'rgba(0,0,0,.85)');sh.addColorStop(0.2,'rgba(0,0,0,0)');sh.addColorStop(0.8,'rgba(0,0,0,0)');sh.addColorStop(1,'rgba(0,0,0,.85)');c.fillStyle=sh;c.fillRect(x,y,w,h);
  c.restore();c.fillStyle='#ff8a1c';c.fillRect(x-4,y+h/2-1.5,w+8,3);}
function renderNavball(){const m=new THREE.Matrix4().makeRotationFromQuaternion(S.q).elements,d=nbImg.data,R=NB/2;
  for(let y=0;y<NB;y++)for(let x=0;x<NB;x++){const u=(x+0.5-R)/R,v=(R-(y+0.5))/R,r2=u*u+v*v,i=(y*NB+x)*4;if(r2>1){d[i+3]=0;continue;}
    const bx=Math.sqrt(1-r2),by=v,bz=u;const wx=m[0]*bx+m[4]*by+m[8]*bz,wy=m[1]*bx+m[5]*by+m[9]*bz,wz=m[2]*bx+m[6]*by+m[10]*bz;
    const el=Math.asin(clamp(wy,-1,1))/DEG,az=Math.atan2(wz,wx)/DEG;let r,g,b;if(wy>=0){r=64;g=128;b=200;}else{r=158;g=104;b=56;}
    const tol=1.1/Math.max(0.3,bx);const de=Math.abs(el-Math.round(el/15)*15),da=Math.abs(az-Math.round(az/45)*45)*Math.cos(el*DEG);
    if(Math.abs(el)<tol*1.3){r=g=b=245;}else if(de<tol*(Math.round(el/15)%2?0.45:0.8)||da<tol*0.7){r=r*0.55+110;g=g*0.55+110;b=b*0.55+110;}
    const sh=0.45+0.55*bx;d[i]=r*sh;d[i+1]=g*sh;d[i+2]=b*sh;d[i+3]=255;}
  nbX.putImageData(nbImg,0,0);}
function ballMarker(c,cx,cy,R,dirW,col,kind){if(dirW.lengthSq()<1e-6)return;const qi=S.q.clone().invert();const b=dirW.clone().normalize().applyQuaternion(qi);if(b.x<=0.02)return;const x=cx+b.z*R,y=cy-b.y*R;
  c.strokeStyle=col;c.lineWidth=2;
  if(kind==='pro'){c.beginPath();c.arc(x,y,7,0,7);c.moveTo(x-12,y);c.lineTo(x-7,y);c.moveTo(x+7,y);c.lineTo(x+12,y);c.moveTo(x,y-7);c.lineTo(x,y-12);c.stroke();}
  else if(kind==='retro'){c.beginPath();c.arc(x,y,7,0,7);c.moveTo(x-5,y-5);c.lineTo(x+5,y+5);c.moveTo(x+5,y-5);c.lineTo(x-5,y+5);c.stroke();}
  else{c.strokeRect(x-8,y-8,16,16);}}
function drawPanel(){
  const c=px;c.setTransform(1,0,0,1,0,0);c.drawImage(bg,0,0);c.setTransform(DPR,0,0,DPR,0,0);c.translate(POX,0);c.scale(PS,PS);
  const now=performance.now(),blink=(now%700)<350;const alt=altitude(),altFt=Math.max(0,alt*FT),vs=S.vel.y*FT,h=hvel(),e=eulers();const fly=S.mode==='fly'||S.mode==='abortok';
  // s1: timer & caution/warning lights
  const get=GET0+S.t,hh=Math.floor(get/3600),mm=Math.floor(get%3600/60),ss=Math.floor(get%60);
  rr(c,20,26,226,44,4);c.fillStyle='#0b0c0a';c.fill();label(c,'GET',36,52,10,'#aab0a2');
  seg7(c,`${hh}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`,56,33,16,28,'#ffae3a','#2a1a08',4);
  const lights=[['PROG',S.alarm&&!S.alarmAck&&S.master,'#ffb32c'],['LOW LEVEL',S.lowLevel,'#ffb32c'],['LUNAR CONTACT',S.contact,'#6fb2ff'],['ENG ARM',(S.staged?S.apsOn:S.engineOn)&&fly,'#f3efe0'],
    [S.abort?S.abort+' ABORT':'P64 AUTO',S.abort?fly:S.auto&&S.mode!=='landed',S.abort?'#ff8a5a':'#86f28f'],['P66 MANUAL',!S.auto&&fly&&!S.abort,'#86f28f'],['RCS',S.rcsAct>0.3&&fly,'#ffb32c'],['FTP',S.thr>0.95,'#f3efe0']];
  lights.forEach((l,i)=>lamp(c,20+(i%2)*114,78+Math.floor(i/2)*28,108,23,l[0],!!l[1],l[2]));
  const ma=S.master&&!S.alarmAck;rr(c,20,194,110,40,5);c.fillStyle=ma&&blink?'#ff2a1a':'#4a1410';c.fill();if(ma&&blink){c.shadowColor='#ff2a1a';c.shadowBlur=20;c.fill();c.shadowBlur=0;}
  c.strokeStyle='#160806';c.lineWidth=2;c.stroke();label(c,'MASTER',75,210,11,ma&&blink?'#fff':'#a86a60');label(c,'ALARM',75,224,11,ma&&blink?'#fff':'#a86a60');
  const bingo=indTimeToBingo();label(c,'TO BINGO',142,205,9,'#aab0a2','left');label(c,'M:S',246,205,9,'#aab0a2','right');rr(c,140,208,106,26,3);c.fillStyle='#0b0c0a';c.fill();
  const bs=Math.max(0,Math.ceil(bingo));const bon=bingo<30?(blink?'#ff4a3a':'#5a1a10'):'#ffae3a';
  seg7(c,`${Math.floor(bs/60)}:${String(bs%60).padStart(2,'0')}`,168,212,11,18,bon,'#2a1a08',4);
  // s2: FDAI / navball
  renderNavball();const R=78;c.save();c.beginPath();c.arc(370,112,R,0,7);c.clip();c.drawImage(nbC,370-R,112-R,R*2,R*2);
  ballMarker(c,370,112,R,S.vel,'#ffe14a','pro');ballMarker(c,370,112,R,S.vel.clone().negate(),'#ffe14a','retro');
  {const o=originPt();ballMarker(c,370,112,R,new V3(TARGET.x-o.x,H(TARGET.x,TARGET.z)-o.y,TARGET.z-o.z),'#ff5ad0','tgt');}
  c.restore();c.strokeStyle='#ff8a1c';c.lineWidth=3;c.beginPath();c.moveTo(340,112);c.lineTo(358,112);c.lineTo(364,118);c.lineTo(370,112);c.lineTo(376,118);c.lineTo(382,112);c.lineTo(400,112);c.stroke();
  label(c,`PITCH ${e.pitch>=0?'+':''}${e.pitch.toFixed(0)}°`,276,232,11,'#ece8d8','left');label(c,`ROLL ${e.roll>=0?'+':''}${e.roll.toFixed(0)}°`,464,232,11,'#ece8d8','right');
  label(c,'○ PROGRADE  ⊗ RETRO  □ SITE',370,214,9,'#aab0a2');
  // s3: tapes
  const td=tapeData(),tA=Math.max(0,td.alt);  let span,maj,mi;if(tA>2000){span=2000;maj=500;mi=100;}else if(tA>500){span=600;maj=100;mi=20;}else if(tA>100){span=200;maj=50;mi=10;}else{span=60;maj=10;mi=2;}
  tape(c,500,34,54,172,tA,span,maj,mi,v=>v<0?'':String(v));tape(c,572,34,54,172,td.vs,40,10,2,v=>String(v));
  if(td.flag==='NO TRACK'&&fly){for(const x of [500,572]){c.save();rr(c,x+4,92,46,56,3);c.clip();c.fillStyle='#e8e2d0';c.fillRect(x+4,92,46,56);c.strokeStyle='#c0201a';c.lineWidth=7;for(let k=-60;k<60;k+=14){c.beginPath();c.moveTo(x+k,150);c.lineTo(x+k+60,90);c.stroke();}c.restore();rr(c,x+8,108,38,26,2);c.fillStyle='#e8e2d0';c.fill();label(c,'NO',x+27,119,10,'#111');label(c,'TRACK',x+27,131,9,'#111');}}
  if(td.flag==='PGNS')label(c,'TAPES: PGNS',563,30,9,'#ffb32c');
  // s4: cross pointer
  {const x=670,y=30,s=156;const fw=h.fwd*FT,lt=h.lat*FT,hi=Math.max(Math.abs(fw),Math.abs(lt))>20,sc=hi?200:20;
   const nx=x+s/2+clamp(lt/sc,-1,1)*s/2,ny=y+s/2-clamp(fw/sc,-1,1)*s/2;c.strokeStyle='#ff4a2a';c.lineWidth=3;c.shadowColor='#ff4a2a';c.shadowBlur=4;
   c.beginPath();c.moveTo(nx,y+3);c.lineTo(nx,y+s-3);c.moveTo(x+3,ny);c.lineTo(x+s-3,ny);c.stroke();c.shadowBlur=0;
   label(c,hi?'SCALE HI (200 FPS)':'SCALE LO (20 FPS)',x+s/2,y+s+16,9,hi?'#ffae3a':'#aab0a2');
   label(c,`FWD ${fw>=0?'+':''}${fw.toFixed(1)}   LAT ${lt>=0?'+':''}${lt.toFixed(1)} FPS`,x+s/2,y+s+30,11);
   const o=originPt();label(c,`RANGE TO PLANNED SITE ${Math.hypot(o.x-TARGET.x,o.z-TARGET.z).toFixed(0)} M`,x+s/2,y+s+44,9,'#ff9ad8');}
  // s5: throttle + fuel
  needle(c,906,90,46,S.thrCmd*100,100,'#4a8bff',2.2);needle(c,906,90,46,S.thr*100,100,'#ff3a24',3.4);
  needle(c,1014,90,46,indFuelPct(),15,'#ff3a24',3.4);
  needleHub(c,906,90);needleHub(c,1014,90);
  rr(c,868,174,186,28,3);c.fillStyle='#0b0c0a';c.fill();
  c.font='bold 15px "Courier New",monospace';c.fillStyle='#8dff7a';c.shadowColor='#8dff7a';c.shadowBlur=6;c.textAlign='left';
  c.fillText(S.staged?`APS ${S.apsOn?' ON':'OFF'}  ASC PRP ${apsPct().toFixed(0)}%`:`THR ${(S.thr*100).toFixed(0).padStart(3)}%  FUEL ${indFuelPct().toFixed(1)}%`,874,193);c.shadowBlur=0;
  label(c,'RCS QTY',870,220,9,'#aab0a2','left');rr(c,920,212,134,10,2);c.fillStyle='#111';c.fill();c.fillStyle=S.rcs<20?'#ff5a3a':'#7fbf6a';c.fillRect(922,214,130*S.rcs/100,6);
  label(c,'RED ACTUAL · BLUE COMMANDED',961,234,8.5,'#aab0a2');
  // s6: DSKY
  {const x=1084,y=26;const alarmShow=S.alarm&&!S.alarmAck&&S.master;
   const lp=[['UPLINK ACTY',0],['TEMP',0],['NO ATT',0],['GIMBAL LOCK',0],['STBY',0],['PROG',alarmShow],['KEY REL',0],['RESTART',S.t<S.dskyBlank],['OPR ERR',0],['TRACKER',0],['ALT',fly&&!lrValid()],['VEL',fly&&!lrValid()]];
   lp.forEach((l,i)=>lamp(c,x+12+(i%2)*45,y+10+Math.floor(i/2)*30,42,28,l[0],!!l[1],'#ffb32c'));
   const ex=x+120,on='#7dff6a',off='#0f1f0d';const blank=S.t<S.dskyBlank&&fly;
   const ca=fly&&(Math.sin(now*0.013)+Math.sin(now*0.0071)>0.6);rr(c,ex,y+14,40,32,3);c.fillStyle=ca?'#5aff4a':'#123010';c.fill();label(c,'COMP',ex+20,y+28,8,ca?'#062006':'#2f5a2a');label(c,'ACTY',ex+20,y+39,8,ca?'#062006':'#2f5a2a');
   label(c,'PROG',ex+130,y+22,9,'#7dff6a');label(c,'VERB',ex+30,y+60,9,'#7dff6a');label(c,'NOUN',ex+130,y+60,9,'#7dff6a');
   const prog=S.mode==='landed'?'68':String(S.prog);const verb=alarmShow?'05':'06',noun=alarmShow?'09':(S.abort?'62':S.auto?'64':'60');
   let r1,r2,r3;const sgn=(v,n=5)=>(v<0?'-':'+')+String(Math.min(99999,Math.abs(Math.round(v)))).padStart(n,'0');
   if(alarmShow){r1='+0'+S.alarm;r2='+00000';r3='+00000';}
   else if(S.auto&&!S.abort){const o=originPt();const d=Math.hypot(TARGET.x-o.x,TARGET.z-o.z);const tg=Math.min(99,Math.round(d/Math.max(1,Math.hypot(S.vel.x,S.vel.z))));const lpd=Math.min(99,Math.round(Math.atan2(Math.max(0,alt),d)/DEG));
     r1='+'+String(tg).padStart(2,'0')+' '+String(lpd).padStart(2,'0');r2=sgn(pgnsVs()*FT*10);r3=sgn(Math.max(0,pgnsAlt()*FT));}
   else{r1=sgn(h.fwd*FT*10);r2=sgn(pgnsVs()*FT*10);r3=sgn(Math.max(0,pgnsAlt()*FT));}
   if(blank){r1=r2=r3='      ';}
   seg7(c,blank?'  ':prog,ex+110,y+28,16,26,on,off,4);seg7(c,blank?'  ':verb,ex+10,y+66,16,26,on,off,4);seg7(c,blank?'  ':noun,ex+110,y+66,16,26,on,off,4);
   [r1,r2,r3].forEach((r,i)=>{const yy=y+102+i*32;c.fillStyle='#1d4a18';c.fillRect(ex+6,yy-4,166,2);seg7(c,r,ex+8,yy+2,16,24,on,off,8);});
   }
  // s7: abort pushbuttons (panel components)
  PANEL.draw(c,now);
}
function drawOverlay(){const W=ov.width,Hh=ov.height;ox.clearRect(0,0,W,Hh);if(camState.mode!==1)return;
  const P=[[0.1,0.06],[0.9,0.06],[0.84,0.5],[0.52,0.8],[0.16,0.56]];
  ox.save();ox.beginPath();ox.rect(0,0,W,Hh);ox.moveTo(P[0][0]*W,P[0][1]*Hh);for(const p of P.slice(1))ox.lineTo(p[0]*W,p[1]*Hh);ox.closePath();
  const g=ox.createLinearGradient(0,0,W,Hh);g.addColorStop(0,'#4a514a');g.addColorStop(1,'#2a2f2a');ox.fillStyle=g;ox.fill('evenodd');
  ox.beginPath();ox.moveTo(P[0][0]*W,P[0][1]*Hh);for(const p of P.slice(1))ox.lineTo(p[0]*W,p[1]*Hh);ox.closePath();ox.strokeStyle='#15180f';ox.lineWidth=10;ox.stroke();
  ox.strokeStyle='rgba(255,90,60,0.8)';ox.fillStyle='rgba(255,120,90,0.9)';ox.lineWidth=2;ox.font='bold 13px monospace';const cx=W*0.5;ox.beginPath();ox.moveTo(cx,Hh*0.1);ox.lineTo(cx,Hh*0.78);ox.stroke();
  for(let a=0;a<=70;a+=10){const y=Hh*0.5+Math.tan((a-28)*DEG)/Math.tan(31*DEG)*Hh*0.5;if(y<Hh*0.1||y>Hh*0.78)continue;ox.beginPath();ox.moveTo(cx-12,y);ox.lineTo(cx+12,y);ox.stroke();ox.textAlign='left';ox.fillText(String(a),cx+16,y+4);}
  ox.restore();label(ox,'LPD',cx,Hh*0.09,12,'rgba(255,120,90,0.9)');}

// ---------------- layout ----------------
const PANEL_W=1520;
let SAB=0;const saProbe=document.createElement('div');saProbe.style.cssText='position:fixed;visibility:hidden;pointer-events:none;padding:var(--sa-t) var(--sa-r) var(--sa-b) var(--sa-l)';document.body.appendChild(saProbe);
function safeArea(){const cs=getComputedStyle(saProbe);return {t:parseFloat(cs.paddingTop)||0,r:parseFloat(cs.paddingRight)||0,b:parseFloat(cs.paddingBottom)||0,l:parseFloat(cs.paddingLeft)||0};}
function layout(){DPR=Math.min(2,devicePixelRatio||1);const SA=safeArea();SAB=SA.b;const W=innerWidth,HH=innerHeight-SA.b,WE=W-SA.l-SA.r;document.body.style.height=innerHeight+'px';
  PS=Math.min(WE/PANEL_W,1.15,HH*0.34/250);PH=Math.round(250*PS);POX=SA.l+(WE-PANEL_W*PS)/2;pc.style.bottom=SA.b+'px';
  pc.width=Math.round(W*DPR);pc.height=Math.round(PH*DPR);pc.style.height=PH+'px';bg.width=pc.width;bg.height=pc.height;drawStatic();
  VIEWH=HH-PH;$('view').style.height=VIEWH+'px';renderer.setSize(W,VIEWH);camera.aspect=W/VIEWH;camera.updateProjectionMatrix();ov.width=W;ov.height=VIEWH;ov.style.width=W+'px';ov.style.height=VIEWH+'px';layoutSW();layoutTouch();}
if(window.visualViewport)visualViewport.addEventListener('resize',()=>layout());addEventListener('orientationchange',()=>setTimeout(layout,200));
addEventListener('resize',layout);

// ---------------- input ----------------
function helpHTML(){return showHelp?`<kbd>W</kbd><kbd>S</kbd> throttle &middot; <kbd>Z</kbd> full &middot; <kbd>X</kbd> cut<br><kbd>↑</kbd><kbd>↓</kbd> pitch &middot; <kbd>←</kbd><kbd>→</kbd> roll &middot; <kbd>Q</kbd><kbd>E</kbd> yaw<br><kbd>Space</kbd> ack alarm &middot; <kbd>C</kbd> camera (drag / scroll)<br><kbd>B</kbd> ABORT &middot; <kbd>N</kbd> ABORT STAGE (hold, or click guard twice)<br><kbd>F</kbd> switch panel: <kbd>G</kbd> LDG RDR &middot; <kbd>Y</kbd> MODE SEL &middot; <kbd>T</kbd> MAN THROT &middot; <kbd>1</kbd>&ndash;<kbd>4</kbd> QUAD ISOL &middot; <kbd>U</kbd> QTY MON<br><kbd>P</kbd> pause &middot; <kbd>R</kbd> restart &middot; <kbd>M</kbd> ${muted?'unmute':'mute'} &middot; <kbd>V</kbd> radio: ${VOICE_NAMES[voiceMode]} &middot; <kbd>H</kbd> hide`:'<kbd>H</kbd> help';}
function refreshHelp(){$('help').innerHTML=helpHTML();$('camlabel').textContent=CAMNAMES[camState.mode];}
function begin(){initAudio();if(AC&&AC.state==='suspended')AC.resume();if(S.mode!=='ready')return;$('start').classList.add('hidden');S.mode='fly';banner('P64: APPROACH PHASE','#ffc04a',3);}
function restart(){if(AC&&AC.state==='suspended')AC.resume();reset();S.mode='fly';$('start').classList.add('hidden');$('pause').classList.add('hidden');paused=false;banner('P64: APPROACH PHASE','#ffc04a',3);}
addEventListener('keydown',e=>{
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)||false)e.preventDefault();
  keys[e.code]=true;if(e.repeat)return;
  initAudio();if(AC&&AC.state==='suspended')AC.resume();
  if(S.mode==='ready'){if(e.code==='Space'||e.code==='Enter')begin();else if(e.code==='KeyF')cycleFailSetting();return;}
  if(!paused&&PANEL.keyDown(e.code))return;
  switch(e.code){
    case 'Space':if(S.master){S.alarmAck=true;S.master=false;}break;
    case 'KeyX':if(S.mode==='fly')S.cutReq=true;break;
    case 'KeyZ':if(S.mode==='fly')S.ftpReq=true;break;
    case 'KeyP':if(S.mode==='fly'){paused=!paused;$('pause').classList.toggle('hidden',!paused);if(AC){paused?AC.suspend():AC.resume();}}break;
    case 'KeyR':restart();break;
    case 'KeyC':camState.mode=(camState.mode+1)%3;refreshHelp();break;
    case 'KeyM':muted=!muted;if(au){au.master.gain.cancelScheduledValues(AC.currentTime);au.master.gain.setValueAtTime(muted?0:0.7,AC.currentTime);}refreshHelp();break;
    case 'KeyV':voiceMode=(voiceMode+1)%3;if(voiceMode===0)radioStop();refreshHelp();banner('RADIO VOICES: '+VOICE_NAMES[voiceMode].toUpperCase(),'#cfd6c4',1.5);break;
    case 'KeyF':toggleSwitchPanel();break;
    case 'KeyH':showHelp=!showHelp;refreshHelp();break;
  }});
addEventListener('keyup',e=>{keys[e.code]=false;PANEL.keyUp(e.code);});
// mouse on the instrument panel: physical controls
{const toPanel=e=>{const r=pc.getBoundingClientRect();return [(e.clientX-r.left-POX)/PS,(e.clientY-r.top)/PS];};
 pc.addEventListener('pointerdown',e=>{if(paused||S.mode==='ready')return;initAudio();const [x,y]=toPanel(e);if(PANEL.click(x,y))e.preventDefault();});
 pc.addEventListener('mousemove',e=>{const [x,y]=toPanel(e);pc.style.cursor=PANEL.at(x,y)?'pointer':'default';});}
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;});
$('start').addEventListener('click',begin);
$('failset').addEventListener('click',e=>{e.stopPropagation();const k=e.target.dataset&&e.target.dataset.k;if(k)setFailSetting(k);});
{const toSW=e=>{const r=swc.getBoundingClientRect();return [(e.clientX-r.left)/PS+swOffX(),(e.clientY-r.top)/PS];};
 swc.addEventListener('pointerdown',e=>{e.preventDefault();if(paused||S.mode==='ready')return;initAudio();const [x,y]=toSW(e);if(x>=SWW-SWTABW&&y<=SWTAB+4)toggleSwitchPanel();else PANEL.click(x,y,'sw');});
 swc.addEventListener('mousemove',e=>{const [x,y]=toSW(e);swc.style.cursor=(x>=SWW-SWTABW&&y<=SWTAB+4)||PANEL.at(x,y,'sw')?'pointer':'default';});}
{let drag=null;const el=renderer.domElement;
 el.addEventListener('mousedown',e=>{drag={x:e.clientX,y:e.clientY};});addEventListener('mouseup',()=>drag=null);
 addEventListener('mousemove',e=>{if(!drag)return;camState.yaw+=(e.clientX-drag.x)*0.006;camState.pitch=clamp(camState.pitch+(e.clientY-drag.y)*0.005,-0.15,1.5);drag={x:e.clientX,y:e.clientY};});
 el.addEventListener('wheel',e=>{e.preventDefault();camState.dist=clamp(camState.dist*Math.exp(e.deltaY*0.001),7,1500);},{passive:false});}

// ---------------- main loop ----------------
const DT=1/120;let acc=0,last=performance.now();
function frame(now){requestAnimationFrame(frame);const dt=Math.min(0.05,Math.max(0,(now-last)/1000));last=now;
  if(S.mode==='ready')camState.yaw+=dt*0.04;
  if((S.mode==='fly'||S.mode==='abortok')&&!paused){acc+=dt;let n=0;const m0=S.mode;while(acc>=DT&&n<12){simStep(DT);acc-=DT;n++;if(S.mode!==m0){acc=0;break;}}}
  if(!paused)PANEL.update(now);
  updateVisuals(dt);renderer.render(scene,camera);drawPanel();drawSW(now);touchFrame();drawOverlay();updateAudio();}

// test hooks
window.__game={S,H,TARGET,CLEAR,boulders,camState,keys,reset,restart,begin,altitude,hoverSec,fuelPct,timeToBingo,indTimeToBingo,say,showDebrief,touchdown,freezeBingo,displayBingo(){return Math.max(0,Math.ceil(indTimeToBingo()));},jetsOn(){return puffs.filter(j=>j.on>0).length;},rcsLive(){let n=0;for(let i=0;i<rcsP.life.length;i++)if(rcsP.life[i]>0)n++;return n;},lowLevelBingo(){return 5.6/100*TANK/hoverRate()-20;},
  step(sec){const n=Math.round(sec/DT);for(let i=0;i<n&&(S.mode==='fly'||S.mode==='abortok');i++)simStep(DT);},
  get touchIn(){return touchIn;},get PS(){return PS;},tapSize(id){const k=PANEL.byId[id];let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(let x=k.x-100;x<k.x+k.w+100;x++)for(let y=k.y-100;y<k.y+k.h+100;y++)if(k.hit(x,y)){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}return [Math.round((x1-x0)*PS),Math.round((y1-y0)*PS)];},get TOUCH_UI(){return TOUCH_UI;},GFX,
  get fails(){return S.fails;},sw,setSwitch(id,p){PANEL.byId[id].set(p);},lrValid,indFuelPct,tapeData,caution,toggleSwitchPanel,get swOpen(){return swOpen;},setFailSetting,get failSetting(){return failSetting;},
  swXY(id){const k=PANEL.byId[id],r=swc.getBoundingClientRect();return {x:r.left+(k.x+k.w/2-swOffX())*PS,y:r.top+(k.y+k.h/2)*PS};},
  PANEL,DS,ctrlXY(id){const k=PANEL.byId[id],r=pc.getBoundingClientRect();return {x:r.left+POX+(k.x+k.w/2)*PS,y:r.top+(k.y+k.h/2)*PS};},abortBtn,abortStageBtn,get debris(){return debris.length;},altFt(){return altitude()*FT;},
  autoland(x,z){S.apTarget={x,z};},
  radioLog,RADIO,setVoice(m){voiceMode=m;},get au(){return au;},get voiceMode(){return voiceMode;},
  warm(n){for(let i=0;i<n;i++){if(S.mode==='fly'||S.mode==='abortok'){simStep(DT);simStep(DT);}updateVisuals(1/60);}}};

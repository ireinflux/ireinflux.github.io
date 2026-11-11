
// ---------------- failures: setting, scheduling, effects ----------------
const FAIL_SETTINGS=[['off','Off','No failures and no program alarms'],['historical','Historical','Only the real 1201 / 1202 program alarms'],
  ['random','Random','Historical alarms + 1\u20132 random failures'],['hard','Hard','Historical alarms + 2\u20133 random failures']];
const URLQ=new URLSearchParams(location.search);
let failSetting='random';try{const v=URLQ.get('failset')||localStorage.getItem('eagle.failSetting');if(FAIL_SETTINGS.some(f=>f[0]===v))failSetting=v;}catch(e){}
const FORCED=(URLQ.get('fail')||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean).map(s=>s==='fuel'?'slosh':s);
const FAILS={
  radar:{name:'Landing radar dropout',remedy:'Cycle LDG RDR (OFF, then ON) to reacquire; MODE SEL to PGNS to fly the computed tapes meanwhile'},
  throttle:{name:'Descent engine throttle stuck',remedy:'MAN THROT to LMP (the other throttle channel); X / Z still cut or fire full'},
  rcs:{name:'RCS thruster stuck on',remedy:'Counter by hand, then close the failed RCS QUAD ISOL valve'},
  slosh:{name:'Propellant slosh: gauge reads low',remedy:'Cross-check with Houston; PRPLNT QTY MON to DES 2'},
  fuelstuck:{name:'Propellant gauge stuck',remedy:'Cross-check with Houston; PRPLNT QTY MON to DES 2'},
};
function setFailSetting(v){if(!FAIL_SETTINGS.some(f=>f[0]===v))return;failSetting=v;try{localStorage.setItem('eagle.failSetting',v);}catch(e){}renderFailSetting();if(S.mode==='ready')reset();}
function cycleFailSetting(){const i=FAIL_SETTINGS.findIndex(f=>f[0]===failSetting);setFailSetting(FAIL_SETTINGS[(i+1)%FAIL_SETTINGS.length][0]);}
function failSettingName(){return FORCED.length?'Debug ('+FORCED.join(', ')+')':FAIL_SETTINGS.find(f=>f[0]===failSetting)[1];}
function renderFailSetting(){const el=$('failset');if(!el)return;
  el.innerHTML=FAIL_SETTINGS.map(([k,n,d])=>`<span class="fs${k===failSetting?' on':''}" data-k="${k}" title="${d}">${n}</span>`).join('')+
  `<span class="fsd">${FORCED.length?'Debug URL: forced '+FORCED.join(', '):FAIL_SETTINGS.find(f=>f[0]===failSetting)[2]}</span>`;}
function rnd(a,b){return a+Math.random()*(b-a);}
function mkFail(id,t,forced){const f={id,t,on:false,fixed:false,tOn:null,tFix:null,d:{},said:{}};
  if(id==='throttle')f.d.stuck=forced?0.5:(Math.random()<0.5?rnd(0.16,0.22):rnd(0.45,0.58));
  if(id==='rcs')f.d.q=forced?+(URLQ.get('quad')||3)-1:Math.floor(Math.random()*4);
  return f;}
function scheduleFailures(){
  S.fails=[];
  if(FORCED.length){const t0=+(URLQ.get('failt')||16);FORCED.filter(i=>FAILS[i]).forEach((id,i)=>S.fails.push(mkFail(id,t0+i*14,true)));return;}
  if(failSetting!=='random'&&failSetting!=='hard')return;
  const n=failSetting==='random'?1+(Math.random()<0.5?1:0):2+(Math.random()<0.5?1:0);
  const pool=['radar','throttle','rcs',Math.random()<0.6?'slosh':'fuelstuck'].sort(()=>Math.random()-0.5).slice(0,n);
  const win=(72-22)/n;pool.forEach((id,i)=>S.fails.push(mkFail(id,22+i*win+Math.random()*Math.max(0,win-12),false)));
}
function historicalAlarms(){return FORCED.length?true:failSetting!=='off';}
const failOf=id=>S.fails.find(f=>f.id===id&&f.on);
function sw(id){return PANEL.state[id].pos;}
// ----- live effects (queried by the sim and the panel) -----
function lrValid(){return sw('ldgRadar')===0&&!(failOf('radar')&&!failOf('radar').fixed)&&S.t>=S.lr.reacqT;}
function rcsStuck(){const f=failOf('rcs');return f&&sw('quad'+(f.d.q+1))===0?f:null;}
function thrStuck(){const f=failOf('throttle');return f&&sw('manThrot')===0?f.d.stuck:null;}
function fuelSensorBad(){const f=S.fails.find(f=>(f.id==='slosh'||f.id==='fuelstuck')&&f.on);return f&&sw('qtyMon')===0?f:null;}
function indFuelPct(){const f=fuelSensorBad(),p=fuelPct();if(!f)return p;if(f.id==='slosh')return Math.max(0,p-1.7-0.6*Math.sin(S.t*1.9));return f.d.frozen;}
function indHoverSec(){return indFuelPct()/100*TANK/hoverRate();}
function pgnsAlt(){return altitude()+S.lr.ea;}
function pgnsVs(){return S.vel.y+S.lr.ev;}
// what the ALT / ALT RATE tapes show (MODE SEL: LDG RDR or PGNS)
function tapeData(){if(sw('modeSel')===1)return {alt:pgnsAlt()*FT,vs:pgnsVs()*FT,flag:'PGNS'};
  if(lrValid())return {alt:altitude()*FT,vs:S.vel.y*FT,flag:null};return {alt:S.lr.fa*FT,vs:S.lr.fv*FT,flag:'NO TRACK'};}
function attAuthority(pilotIn){let a=1-0.2*[1,2,3,4].filter(i=>sw('quad'+i)===1).length;if(rcsStuck())a*=pilotIn?0.95:0.55;return a;}
function rcsDisturb(){const f=rcsStuck();if(!f)return null;const sx=f.d.q>=2?1:-1,sz=f.d.q%2?1:-1;return new V3(-1.95*sz,1.15*sx*sz,0).normalize().multiplyScalar(0.7*ANGACC);}
function stuckPuff(){const f=rcsStuck();return f?f.d.q*4+3:-1;}
function caution(){const f=S.fails;return {lr:S.mode!=='ready'&&!lrValid(),thr:thrStuck()!=null&&(S.engineOn||S.auto),rcs:!!rcsStuck(),qty:!!(fuelSensorBad()&&S.t-fuelSensorBad().tOn>6)};}
function failAlarm(master){if(master){S.master=true;S.alarmAck=false;S.alarmT=S.t;}if(AC&&au){beep(1200,0.12,0.05);beep(900,0.12,0.05,AC.currentTime+0.15);}}
function failSay(f,key,delay,fn){if(f.said[key])return;if(S.t-f.tOn>=delay){f.said[key]=true;fn();}}
function startFail(f){f.on=true;f.tOn=S.t;S.failsSeen=true;openSwitchPanel();
  if(f.id==='radar'){S.lr.fa=altitude();S.lr.fv=S.vel.y;failAlarm(false);if(!radioBusy())sayClip('altvel_lights');else say('ALDRIN','Altitude-velocity lights.');banner('ALT / VEL LIGHTS: RADAR DATA LOST','#ffc04a',3);}
  if(f.id==='throttle'){failAlarm(true);say('ARMSTRONG',`Throttle's not responding. It's stuck at about ${Math.round(f.d.stuck*100)} percent.`);banner('THROTTLE STUCK','#ff7a3a',3);}
  if(f.id==='rcs'){failAlarm(true);say('ALDRIN',"We've got a thruster firing. She's rolling!");banner('RCS JET STUCK ON','#ff7a3a',3);}
  if(f.id==='slosh'){/* gauge starts reading low; usually trips LOW LEVEL early */}
  if(f.id==='fuelstuck'){f.d.frozen=fuelPct();}
  console.info('[fail] start',f.id,S.t.toFixed(1));}
function failStep(dt){
  // landing radar / PGNS estimate
  const valid=lrValid();
  if(valid){S.lr.fa=altitude();S.lr.fv=S.vel.y;const k=Math.exp(-dt/2.5);S.lr.ea*=k;S.lr.ev*=k;}
  else{S.lr.ev+=S.lr.drift*dt;S.lr.ea+=(S.lr.ev+0.15)*dt;}
  if(S.mode!=='fly')return;
  for(const f of S.fails){
    if(!f.on){if(S.t>=f.t&&!S.contact&&!S.staged)startFail(f);continue;}
    const fix=(how)=>{if(f.fixed)return;f.fixed=true;f.tFix=S.t;f.how=how;console.info('[fail] fixed',f.id,S.t.toFixed(1),how);};
    if(f.id==='radar'){
      if(sw('ldgRadar')===1)f.d.wasOff=f.d.wasOff||S.t;
      if(sw('ldgRadar')===0&&f.d.wasOff&&S.t-f.d.wasOff>=0){S.lr.reacqT=S.t+2.5;fix('LDG RDR cycled');f.d.wasOff=0;}
      failSay(f,'cap',5,()=>say('CAPCOM',"Eagle, Houston. We see the radar data drop out. Suggest you cycle the landing radar. You can fly the PGNS tapes meanwhile."));
      if(f.fixed&&lrValid())failSay(f,'back',0.1+(f.tFix-f.tOn),()=>say('ALDRIN','Radar is back. ALT and VEL lights are out.'));
    }
    if(f.id==='throttle'){if(sw('manThrot')===1)fix('MAN THROT to LMP');
      failSay(f,'cap',5,()=>{if(!f.fixed)say('CAPCOM',`Eagle, Houston. We see the descent engine stuck at ${Math.round(f.d.stuck*100)} percent. Recommend LMP throttle.`);});
      if(f.fixed)failSay(f,'ok',0,()=>say('ARMSTRONG',"LMP throttle. I've got the engine back."));}
    if(f.id==='rcs'){const q=f.d.q+1;if(sw('quad'+q)===1)fix(`QUAD ${q} isolated`);
      if(rcsStuck())S.rcs=Math.max(0,S.rcs-0.35*dt);
      failSay(f,'cap',6,()=>{if(!f.fixed)say('CAPCOM',`Eagle, Houston. We see a jet on in quad ${q}. Isolate quad ${q}.`);});
      if(f.fixed)failSay(f,'ok',0,()=>say('ALDRIN',`Quad ${q} isolated. Rates are steady.`));}
    if(f.id==='slosh'||f.id==='fuelstuck'){if(sw('qtyMon')===1)fix('PRPLNT QTY MON to DES 2');
      failSay(f,'cap',f.id==='slosh'?9:12,()=>{if(!f.fixed)say('CAPCOM',f.id==='slosh'?"Eagle, Houston. Our numbers show more propellant than your gauge. Looks like slosh. Recommend QTY MON to DES 2.":"Eagle, Houston. Your descent quantity looks frozen to us. Recommend QTY MON to DES 2.");});
      if(f.fixed)failSay(f,'ok',0,()=>say('ALDRIN',`DES 2 reads ${fuelPct().toFixed(1)} percent.`));}
  }
}
function failSummaryHTML(){
  const rows=(S.fails||[]).map(f=>{const name=FAILS[f.id].name+(f.id==='rcs'?` (quad ${f.d.q+1})`:f.id==='throttle'?` at ${Math.round(f.d.stuck*100)}%`:'');
    const st=!f.on?'Did not occur (you were down first)':f.fixed?`Fixed after ${(f.tFix-f.tOn).toFixed(0)} s: ${f.how}`:'Not fixed';
    return `<tr><td>${name}${f.on?` <span style="color:#aab0a2">at T+${f.tOn.toFixed(0)} s</span>`:''}</td><td style="color:${f.on&&!f.fixed?'#ff8a6a':'#e2ddcc'}">${st}</td></tr>`;}).join('');
  return `<p style="margin:10px 0 2px;font-size:13px;letter-spacing:2px;color:#e9b43a">FAILURES &middot; SETTING: ${failSettingName().toUpperCase()}</p>`+
    (rows?`<table style="margin-top:2px">${rows}</table>`:`<p style="font-size:13.5px;color:#b9b5a6;margin:2px 0">${historicalAlarms()?'Only the historical 1201 / 1202 program alarms.':'None.'}</p>`);}

// ---------------- fold-out switch panel (failure remedies; groundwork for the manual-switch cockpit) ----------------
const SWW=780,SWH=156,SWTAB=24,SWTABW=176;let swOpen=false;
function openSwitchPanel(){if(!swOpen){swOpen=true;layoutSW();}}
function toggleSwitchPanel(){swOpen=!swOpen;layoutSW();}
const SY=SWTAB+44;
new ToggleSwitch({id:'ldgRadar',surface:'sw',x:26,y:SY,w:22,h:52,labels:['ON','OFF'],title:'LDG RDR',key:'KeyG',keyLabel:'G',
  onChange:p=>{if(p===0)S.lr.reacqT=Math.max(S.lr.reacqT,S.t+2.5);}});
new ToggleSwitch({id:'modeSel',surface:'sw',x:100,y:SY,w:22,h:52,labels:['LDG RDR','PGNS'],title:'MODE SEL',key:'KeyY',keyLabel:'Y'});
new ToggleSwitch({id:'manThrot',surface:'sw',x:204,y:SY,w:22,h:52,labels:['CDR','LMP'],title:'MAN THROT',key:'KeyT',keyLabel:'T'});
for(let i=1;i<=4;i++)new ToggleSwitch({id:'quad'+i,surface:'sw',x:296+(i-1)*64,y:SY,w:22,h:52,labels:['OPEN','CLOSE'],title:'QUAD '+i,key:'Digit'+i,keyLabel:String(i),
  flag:()=>{const f=rcsStuck();return f&&f.d.q===i-1?'JET':null;}});
new ToggleSwitch({id:'qtyMon',surface:'sw',x:574,y:SY,w:22,h:52,labels:['DES 1','DES 2'],title:'QTY MON',key:'KeyU',keyLabel:'U'});
const swc=$('swpanel'),swx=swc.getContext('2d');
function swOffX(){return swOpen?0:SWW-SWTABW;}
function layoutSW(){const w=(swOpen?SWW:SWTABW)*PS,h=(swOpen?SWH:SWTAB)*PS;swc.width=Math.round(w*DPR);swc.height=Math.round(h*DPR);swc.style.width=w+'px';swc.style.height=h+'px';
  swc.style.left=((TOUCH_UI?(innerWidth-SWW*PS)/2:POX+(PANEL_W-SWW)*PS)+swOffX()*PS)+'px';swc.style.bottom=(PH+SAB)+'px';}
function drawSW(now){const c=swx;c.setTransform(DPR*PS,0,0,DPR*PS,-swOffX()*DPR*PS,0);c.clearRect(swOffX(),0,SWW,SWH);
  // tab
  const tx=SWW-SWTABW;rr(c,tx,0,SWTABW,SWTAB+8,6);c.fillStyle=caution().lr||caution().thr||caution().rcs||caution().qty?((now%800<400)?'#6a3a1a':'#4a4f48'):'#4a4f48';c.fill();c.strokeStyle='#1d211c';c.lineWidth=2;c.stroke();
  label(c,(swOpen?'\u25BC':'\u25B2')+(TOUCH_UI?' SWITCH PANEL':' SWITCH PANEL  [F]'),tx+SWTABW/2,16,10.5);
  if(!swOpen)return;
  const g=c.createLinearGradient(0,SWTAB,0,SWH);g.addColorStop(0,'#3d433c');g.addColorStop(1,'#2b302a');rr(c,0,SWTAB,SWW,SWH-SWTAB,6);c.fillStyle=g;c.fill();c.strokeStyle='#121410';c.lineWidth=2;c.stroke();
  const y=SWTAB+4,h=SWH-SWTAB-8;
  plate(c,6,y,170,h,'LANDING RADAR · ALT/RATE');plate(c,182,y,92,h,'THROTTLE');plate(c,280,y,268,h,'RCS QUAD ISOL');plate(c,554,y,98,h,'PRPLNT QTY');plate(c,658,y,116,h,'CAUTION');
  const cw=caution();
  [['LDG RDR',cw.lr],['THRUST',cw.thr],['RCS TCA',cw.rcs],['PRPLNT QTY',cw.qty]].forEach((l,i)=>lamp(c,666+(i%2)*52,y+26+Math.floor(i/2)*30,48,24,l[0],!!l[1],'#ffb32c'));
  label(c,'TAPES: '+(sw('modeSel')?'PGNS':'LDG RDR'),716,y+h-14,8.5,'#aab0a2');
  PANEL.draw(c,now,'sw');}

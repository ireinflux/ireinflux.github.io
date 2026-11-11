// LOW LEVEL light plays the real FD-loop "Low level." clip once, then Aldrin's "Five percent" queued after it (no overlap); voice off => no clip.
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
async function run(voice){
  const page=await b.newPage({viewport:{width:1024,height:768}});const errs=[];
  page.on('pageerror',e=>errs.push(e.message));page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  await page.goto('file:///workspace/lunar-lander/index.html?failset=off');await page.waitForFunction(()=>window.__game,null,{timeout:60000});
  await page.keyboard.press('Space');
  await page.waitForFunction(()=>__game.radioLog.some(e=>e.ev.startsWith('decoded')),null,{timeout:30000});
  const r=await page.evaluate(async(voice)=>{const g=__game,S=g.S;g.setVoice(voice);
    for(let i=0;i<20;i++)g.step(0.5);                       // let the opening calls go out
    await new Promise(r=>setTimeout(r,200));
    const hold=()=>{S.engineOn=true;S.auto=false;S.contact=false;S.pos.y=g.H(S.pos.x,S.pos.z)+3000;S.vel.set(0,0,0);S.w.set(0,0,0);};
    let n=0,banner='',comms='';
    while(!S.lowLevel&&n<20000){hold();S.fuel=Math.max(0,S.fuel-2);g.step(1/60);n++;}
    banner=document.getElementById('banner').textContent;comms=document.getElementById('comms').textContent;
    for(let i=0;i<300;i++){hold();g.step(1/60);}           // keep flying: must not fire again
    const log=g.radioLog.filter(e=>e.name==='flight_lowlevel'||e.name==='lowlevel');
    return {low:S.lowLevel,banner,comms,log,decoded:g.radioLog.find(e=>e.ev.startsWith('decoded')).ev};},voice);
  console.log('voice',voice,JSON.stringify(r));
  ok(r.low&&r.banner==='LOW LEVEL',`v${voice}: LOW LEVEL banner shown`);
  ok(r.comms.includes('FLIGHT:Low level.')&&r.comms.includes('Five percent'),`v${voice}: log shows FLIGHT "Low level." and Aldrin "Five percent"`);
  ok(!/failed/.test(r.decoded),`v${voice}: all clips decoded (${r.decoded})`);
  const f=r.log.filter(e=>e.name==='flight_lowlevel'),a=r.log.filter(e=>e.name==='lowlevel');
  if(voice===0){ok(f.length===0&&a.length===0,'voice off: no clip audio played');}
  else{
    ok(f.length===1&&(f[0].ev==='play'||f[0].ev==='queued'),`v${voice}: FD "Low level." clip played exactly once (${f.map(e=>e.ev)})`);
    ok(a.length===1,`v${voice}: Aldrin "Five percent" played once`);
    ok(f.length&&a.length&&a[0].start>=f[0].end-1e-3,`v${voice}: Aldrin starts after the FD clip ends (fd ${f[0]&&f[0].start}-${f[0]&&f[0].end}, aldrin ${a[0]&&a[0].start})`);
    ok(f.length&&f[0].end-f[0].start>1.2&&f[0].end-f[0].start<1.5,`v${voice}: clip length ~1.36 s (${f[0]&&(f[0].end-f[0].start).toFixed(2)})`);
  }
  ok(errs.length===0,`v${voice}: no page errors ${errs.join('|')}`);await page.close();}
await run(1);await run(0);
console.log(fails.length?`${fails.length} FAILED`:'ALL PASS');await b.close();process.exit(fails.length?1:0);

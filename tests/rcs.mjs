// RCS plume realism + jet selection, and TO BINGO after CUT.
import { chromium } from 'playwright-core';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const ctx=await b.newContext({viewport:{width:1133,height:744}});const page=await ctx.newPage();
const errs=[];page.on('pageerror',e=>errs.push(e.message));
await page.goto('file:///workspace/lunar-lander/index.html?failset=off');
await page.waitForFunction(()=>window.__game,null,{timeout:60000});
const ev=(f,a)=>page.evaluate(f,a);
// --- timer after CUT ---
const t=await ev(()=>{const g=__game,S=g.S;g.begin();g.step(20);const r={pre:g.displayBingo(),cut:[],relit:[],cut2:[]};
  S.cutReq=true;for(let i=0;i<8;i++){g.step(0.5);r.cut.push(g.displayBingo());}
  S.ftpReq=true;for(let i=0;i<4;i++){g.step(0.3);r.relit.push(g.displayBingo());}
  S.cutReq=true;for(let i=0;i<4;i++){g.step(0.5);r.cut2.push(g.displayBingo());}
  return r;});
console.log('bingo',JSON.stringify(t));
ok(t.cut.every(v=>Math.abs(v-t.pre)<=3),'TO BINGO holds its in-flight value after CUT (no runaway)');
ok(t.relit.every(v=>v>0&&v<t.pre),'re-lit at full throttle shows a shorter, sane time');
ok(t.cut2.every(v=>Math.abs(v-t.relit[t.relit.length-1])<=2),'second CUT holds again');
// slider dragged to near-zero still sane (DPS 10% floor)
const lo=await ev(()=>{const g=__game,S=g.S;g.restart();g.begin();g.step(20);S.auto=false;S.engineOn=true;S.thrCmd=0.01;g.step(1);return {lo:g.displayBingo(),hov:Math.round(g.hoverSec()-20)};});
console.log('low throttle',JSON.stringify(lo));ok(lo.lo<=lo.hov+4,'tiny throttle reads hover time, not a runaway');
// slowly wind the slider down to ~0, CUT, fall to the surface: gauge must stay sane and not change after touchdown
const td=await ev(()=>{const g=__game,S=g.S;g.restart();g.begin();g.step(20);S.auto=false;S.prog=66;S.engineOn=true;const r={wind:[]};
  for(let c=0.5;c>0.0005;c*=0.8){S.thrCmd=c;g.step(0.2);r.wind.push(g.displayBingo());}
  S.cutReq=true;g.step(1);r.cut=g.displayBingo();let n=0;while(S.mode==='fly'&&n++<4000)g.step(0.05);r.mode=S.mode;r.land=g.displayBingo();
  for(let i=0;i<20;i++)g.warm(5);r.after=g.displayBingo();return r;});
console.log('wind-down/touchdown',JSON.stringify(td));
ok(td.wind.every(v=>v<=599)&&td.cut<300,'winding the throttle to ~0 then CUT keeps TO BINGO under 5 min');
ok(td.mode!=='fly'&&td.land===td.after&&td.land===td.cut,'TO BINGO unchanged through touchdown and after landing');
// --- jets during auto attitude hold vs manual roll ---
const j=await ev(()=>{const g=__game,S=g.S;g.restart();g.begin();g.warm(5);let idle=[];for(let i=0;i<120;i++){g.warm(1);idle.push(g.jetsOn());}
  S.auto=false;S.prog=66;for(let i=0;i<60;i++)g.warm(1);let hold=[];for(let i=0;i<120;i++){g.warm(1);hold.push(g.jetsOn());}
  g.keys.KeyD=true;let roll=[];for(let i=0;i<20;i++){g.warm(1);roll.push(g.jetsOn());}
  const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;return {idle:avg(idle),idleMax:Math.max(...idle),hold:avg(hold),holdMax:Math.max(...hold),roll:avg(roll),rollMax:Math.max(...roll),live:g.rcsLive()};});
console.log('jets',JSON.stringify(j));
ok(j.holdMax<=4,'attitude hold with no input fires at most 4 jets');
ok(j.rollMax>=2&&j.rollMax<=8,'a roll command fires a sensible subset of jets (not all 16)');
ok(j.live>0,'RCS particles are emitted');
// ground-backdrop shot during a yaw onset (closeup is in rcs_shot.mjs)
await ev(()=>{const g=__game;g.keys.KeyD=false;g.warm(30);g.camState.mode=0;g.camState.dist=16;g.camState.pitch=0.55;g.camState.yaw=Math.PI-1.4;g.keys.KeyQ=true;g.warm(3);});
await page.screenshot({path:'/workspace/lunar-lander/shot-rcs-yaw.png'});
ok(errs.length===0,'no page errors '+errs.join(';'));
console.log(fails.length?`${fails.length} FAILED`:'ALL PASS');await b.close();process.exit(fails.length?1:0);

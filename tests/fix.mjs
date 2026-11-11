// Headless checks for: 2–3 line radio log, CUT resets throttle/slider, 60s callout, phone notch layout.
import { chromium } from 'playwright-core';
const UA='Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1';
const PHONE_UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1';
const browser = await chromium.launch({ executablePath:'/usr/bin/google-chrome', headless:true,
  args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
const fails=[]; const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m); if(!c)fails.push(m);};
const ev=(page,f,a)=>page.evaluate(f,a);

async function openPage({width,height,touch=false,ua,qs='failset=historical'}){
  const ctx=await browser.newContext({
    viewport:{width,height}, deviceScaleFactor:touch?2:1, isMobile:!!touch, hasTouch:!!touch,
    userAgent:ua||(touch?UA:undefined)
  });
  const page=await ctx.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push('pageerror: '+e.message));
  await page.goto('file:///workspace/lunar-lander/index.html?'+qs);
  await page.waitForFunction(()=>window.__game,null,{timeout:60000});
  return {ctx,page,errs};
}

// ---------------- 1. radio log + iPad mid-descent screenshot ----------------
{
  const {ctx,page}=await openPage({width:1133,height:744,touch:true,ua:UA});
  await ev(page,()=>{document.body.classList.add('touch'); /* already on */});
  await ev(page,()=>{__game.begin(); __game.warm(2); __game.step(16);});
  // flood well past the old 7-line cap; the log must still show at most 3
  const count=await ev(page,()=>{
    const lines=['2000 feet.','700 feet, 21 down.','400 feet, down at 9.','300 feet, down 3½.','200 feet, 4½ down.','100 feet, 3½ down.','60 feet, down 2½.','Contact light.'];
    for(const s of lines)__game.say('ALDRIN',s);
    const nodes=[...document.querySelectorAll('#comms div')];
    return {n:nodes.length, texts:nodes.map(d=>d.textContent), h:document.getElementById('comms').getBoundingClientRect().height};
  });
  console.log('comms after 22s', JSON.stringify(count));
  ok(count.n<=3, `radio log has at most 3 lines after mid-descent (got ${count.n})`);
  const box=await ev(page,()=>{
    const c=document.getElementById('comms').getBoundingClientRect();
    const tbar=document.getElementById('tbar').getBoundingClientRect();
    const thr=document.getElementById('thr').getBoundingClientRect();
    const view=document.getElementById('view').getBoundingClientRect();
    return {c:{l:c.left,r:c.right,t:c.top,b:c.bottom,h:c.height,w:c.width}, tbarL:tbar.left, thrT:thr.top, viewH:view.height, viewW:view.width};
  });
  console.log('comms box', JSON.stringify(box));
  ok(box.c.r < box.tbarL-4, 'log does not cover the top-right button row');
  ok(box.c.b < box.thrT-4, 'log stays above the throttle / does not run down over left controls');
  ok(box.c.b < box.viewH*0.45, 'log stays in the top of the view, not the central scene');
  await ev(page,()=>__game.warm(2));
  await page.waitForTimeout(400);
  await page.screenshot({path:'/workspace/lunar-lander/shot-fix-log.png'});
  console.log('saved shot-fix-log.png');
  await ctx.close();
}

// ---------------- 2. CUT resets slider (touch + keyboard X) ----------------
{
  const {ctx,page}=await openPage({width:1133,height:744,touch:true,ua:UA});
  const cdp=await ctx.newCDPSession(page);
  const touch=async (type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts.map((p,i)=>({x:p.x,y:p.y,id:p.id??i,radiusX:8,radiusY:8,force:1}))});
  const tap=async (x,y)=>{await touch('touchStart',[{x,y,id:9}]); await page.waitForTimeout(40); await touch('touchEnd',[]); await page.waitForTimeout(80);};
  await ev(page,()=>{__game.begin(); __game.step(1);});
  const T=await ev(page,()=>{const b=document.querySelector('#thr .track').getBoundingClientRect();return {x:b.x+b.width/2,top:b.top,h:b.height,bot:b.bottom};});
  await touch('touchStart',[{x:T.x,y:T.top+3,id:1}]);
  await ev(page,()=>__game.step(0.25));
  ok(await ev(page,()=>__game.S.thrCmd===1),'precondition: slider FULL -> thrCmd 1');
  await touch('touchEnd',[]);
  const cut=await ev(page,()=>{const b=document.getElementById('cutb').getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2};});
  await tap(cut.x,cut.y);
  await ev(page,()=>__game.step(0.2));
  const after=await ev(page,()=>({eng:__game.S.engineOn,cmd:__game.S.thrCmd,thr:__game.S.thr,fill:document.querySelector('#thr .fill').style.height}));
  console.log('touch CUT', JSON.stringify(after));
  ok(!after.eng && after.cmd===0, 'touch CUT zeros commanded throttle and kills the engine');
  ok(after.fill==='0%'||after.fill==='0', 'touch CUT drops the on-screen slider to the bottom');
  // can throttle up gradually from the bottom
  await touch('touchStart',[{x:T.x,y:T.bot-T.h*0.25,id:1}]);
  await ev(page,()=>__game.step(0.2));
  await touch('touchEnd',[]);
  const up=await ev(page,()=>({eng:__game.S.engineOn,cmd:__game.S.thrCmd}));
  console.log('throttle up after CUT', JSON.stringify(up));
  ok(up.eng && up.cmd>0.1 && up.cmd<0.6, `can throttle up gradually after CUT (cmd=${up.cmd})`);
  await ctx.close();
}
{
  // keyboard X on a desktop (non-touch) page
  const {ctx,page}=await openPage({width:1280,height:800,touch:false,qs:'failset=historical&touch=off'});
  await page.keyboard.press('Space');
  await ev(page,()=>__game.step(0.5));
  await page.keyboard.press('KeyZ');
  await ev(page,()=>__game.step(0.3));
  const full=await ev(page,()=>({eng:__game.S.engineOn,cmd:__game.S.thrCmd}));
  console.log('after Z', JSON.stringify(full));
  ok(full.eng && full.cmd===1, 'Z goes to full throttle (keyboard precondition)');
  await page.keyboard.press('KeyX');
  await ev(page,()=>__game.step(0.2));
  const after=await ev(page,()=>({eng:__game.S.engineOn,cmd:__game.S.thrCmd}));
  console.log('keyboard X', JSON.stringify(after));
  ok(!after.eng && after.cmd===0, 'keyboard X cuts the engine and resets thrCmd to 0');
  await ctx.close();
}

// ---------------- 3. 60 seconds callout ----------------
{
  const {ctx,page}=await openPage({width:1280,height:800,touch:false,qs:'failset=off&touch=off'});
  await page.keyboard.press('Space');
  const park=()=>ev(page,()=>{
    if(__game.S.mode!=='fly'){__game.reset();__game.begin();}
    __game.S.pos.y=__game.H(__game.S.pos.x,__game.S.pos.z)+4000;
    __game.S.vel.set(0,0,0); __game.S.w.set(0,0,0);
    __game.S.engineOn=false; __game.S.thrCmd=0; __game.S.thr=0; __game.S.contact=false;
  });
  await ev(page,()=>__game.step(0.4));
  const start=await ev(page,()=>({t:__game.S.t,bingo:__game.indTimeToBingo(),fuel:__game.fuelPct(),said:__game.S.said60,banner:document.getElementById('banner').textContent,hover:__game.hoverSec()-20}));
  console.log('start bingo', JSON.stringify(start));
  ok(start.bingo>60 && !start.said, 'at P64 start, displayed TO BINGO is above 60s and the call has not fired');

  // plenty of fuel, but mission elapsed time is already past 60 s — must not call "60 seconds"
  await park();
  const late=await ev(page,()=>{
    __game.S.t=70; __game.S.said60=false; __game.S.said30=false; __game.S.saidBingo=false;
    __game.S.engineOn=false; __game.S.thrCmd=0; __game.S.thr=0;
    __game.step(0.4);
    return {t:__game.S.t,bingo:__game.indTimeToBingo(),said60:__game.S.said60,said30:__game.S.said30,mode:__game.S.mode,fuel:__game.fuelPct(),banner:document.getElementById('banner').textContent};
  });
  console.log('t≈70s with fuel held', JSON.stringify(late));
  ok(late.mode==='fly' && late.t>=60 && late.bingo>60 && !late.said60, '60s call does not fire on mission elapsed time when plenty of fuel remains');

  // Slow-drain the displayed (throttle-dependent) TO BINGO timer at a fixed thrust.
  // 60 / 30 / bingo must fire within 1–2 s of the displayed timer crossing, and never early.
  await park();
  const sweep=await ev(page,()=>{
    const THR=0.45;
    const arm=()=>{__game.S.engineOn=true;__game.S.thrCmd=THR;__game.S.thr=THR;__game.S.auto=false;__game.S.contact=false;
      __game.S.pos.y=__game.H(__game.S.pos.x,__game.S.pos.z)+5000; __game.S.vel.set(0,0,0); __game.S.w.set(0,0,0);};
    const fuelFor=target=>{
      arm();
      let lo=1,hi=2000;
      for(let i=0;i<50;i++){const mid=(lo+hi)/2;__game.S.fuel=mid;const b=__game.indTimeToBingo();if(b>target)hi=mid;else lo=mid;}
      __game.S.fuel=(lo+hi)/2; arm(); return __game.S.fuel;
    };
    __game.S.lowLevel=false; __game.S.said60=false; __game.S.said30=false; __game.S.saidBingo=false;
    fuelFor(130);
    __game.step(0.05);
    const fire={}, crossed={};
    let prev=__game.indTimeToBingo();
    for(let target=129.5; target>=-2; target-=0.25){
      fuelFor(target);
      const shown0=__game.indTimeToBingo(), t0=__game.S.t;
      const live={'60':60,'30':30,bingo:0};
      for(const name of Object.keys(live)){const th=live[name];if(crossed[name]==null && prev>th && shown0<=th) crossed[name]={t:t0,shown:shown0,th};}
      if(crossed.low==null && !__game.S.lowLevel && __game.indFuelPct()<=5.6) crossed.low={t:t0,fuel:__game.indFuelPct(),th:5.6};
      __game.step(1/120);
      const shown=__game.indTimeToBingo(), t=__game.S.t;
      const banner=document.getElementById('banner').textContent;
      if(fire.low==null && __game.S.lowLevel) fire.low={t,fuel:__game.indFuelPct(),prevFuel:null,banner,th:5.6};
      if(fire['60']==null && __game.S.said60) fire['60']={t,shown,prev,banner,disp:__game.displayBingo(),th:60};
      if(fire['30']==null && __game.S.said30) fire['30']={t,shown,prev,banner,disp:__game.displayBingo(),th:30};
      if(fire.bingo==null && __game.S.saidBingo) fire.bingo={t,shown,prev,banner,disp:__game.displayBingo(),th:0};
      prev=shown;
    }
    return {fire,crossed,mode:__game.S.mode};
  });
  console.log('fuel sweep', JSON.stringify(sweep,null,2));
  ok(sweep.mode==='fly', 'slow-drain sweep stayed in flight');
  for(const name of ['60','30','bingo']){
    const f=sweep.fire[name], c=sweep.crossed[name];
    ok(!!f, `${name} callout fired during the drain`);
    if(!f) continue;
    ok(f.prev>f.th, `${name} callout was not early (previous displayed TO BINGO ${f.prev.toFixed(2)}s > ${f.th})`);
    ok(f.shown<=f.th, `${name} callout fired at or after the threshold (displayed ${f.shown.toFixed(2)}s <= ${f.th})`);
    const late=f.th-f.shown;
    ok(late<=2, `${name} callout fired within 2s of the displayed timer crossing ${f.th} (shown ${f.shown.toFixed(2)}s, ${late.toFixed(2)}s past)`);
    if(c) ok(Math.abs(f.t-c.t)<=2, `${name} game-time delay ${Math.abs(f.t-c.t).toFixed(2)}s is within 2s of the crossing`);
  }
  ok(sweep.fire.low && sweep.fire.low.fuel<=5.6+0.15, `low level fires at the 5.6% quantity mark (fuel=${sweep.fire.low && sweep.fire.low.fuel})`);
  ok(sweep.fire['60'] && /60/.test(sweep.fire['60'].banner), '60s banner shown at the 60s call');
  ok(sweep.fire['30'] && /30/.test(sweep.fire['30'].banner), '30s banner shown at the 30s call');
  await ctx.close();
}
{
  // stuck quantity gauge must not show "60 SECONDS" while TO BINGO still reads high
  const {ctx,page}=await openPage({width:1280,height:800,touch:false,qs:'failset=historical&fail=fuelstuck&failt=1&touch=off'});
  await page.keyboard.press('Space');
  await ev(page,()=>__game.step(2)); // failure starts at t=1
  const pre=await ev(page,()=>({fails:(__game.S.fails||[]).map(f=>({id:f.id,on:f.on,frozen:f.d&&f.d.frozen})),ind:__game.indTimeToBingo(),real:__game.timeToBingo()}));
  console.log('fuelstuck pre', JSON.stringify(pre));
  const stuck=await ev(page,()=>{
    // drain real fuel to ~50s bingo; indicated should stay frozen high
    let lo=10,hi=700;
    for(let i=0;i<40;i++){const mid=(lo+hi)/2;__game.S.fuel=mid;const b=__game.timeToBingo();if(b>50)hi=mid;else lo=mid;}
    __game.S.fuel=lo; __game.S.said60=false; __game.S.said30=false; __game.S.saidBingo=false;
    __game.step(0.25);
    return {real:__game.timeToBingo(),ind:__game.indTimeToBingo(),said:__game.S.said60,banner:document.getElementById('banner').textContent,fuel:__game.fuelPct(),indFuel:__game.indFuelPct()};
  });
  console.log('fuelstuck at real ~50s bingo', JSON.stringify(stuck));
  ok(stuck.real<=60 && stuck.ind>90 && !stuck.said, '60s call withheld when the TO BINGO gauge still shows plenty of fuel');
  await ctx.close();
}

// ---------------- 3b. TO BINGO must not increase after touchdown / engine cutoff ----------------
{
  const {ctx,page}=await openPage({width:1280,height:800,touch:false,qs:'failset=off&touch=off'});
  await page.keyboard.press('Space');
  const r=await ev(page,()=>{
    // Choose fuel so hover-time-to-bingo is about 1:08, and a high throttle so the live (burn-rate) clock is about 38 s.
    __game.S.auto=false; __game.S.engineOn=true; __game.S.thrCmd=0.55; __game.S.thr=0.55;
    __game.S.pos.y=__game.H(__game.S.pos.x,__game.S.pos.z)+4000; __game.S.vel.set(0,0,0); __game.S.w.set(0,0,0); __game.S.q.identity();
    const hoverTarget=68; // ~1:08
    let lo=80,hi=2000;
    for(let i=0;i<40;i++){const mid=(lo+hi)/2;__game.S.fuel=mid;const h=__game.hoverSec()-20;if(h>hoverTarget)hi=mid;else lo=mid;}
    __game.S.fuel=(lo+hi)/2; __game.S.thr=0.55; __game.S.thrCmd=0.55;
    __game.step(0.05);
    const before={ind:__game.indTimeToBingo(),hover:__game.hoverSec()-20,thr:__game.S.thr,fuel:__game.fuelPct(),held:__game.S.bingoHeld,frozen:__game.S.bingoFrozen};
    // Engine cutoff mid-flight must not let the clock jump up toward hover time
    __game.S.engineOn=false; __game.S.thrCmd=0; __game.S.thr=0;
    __game.step(0.4);
    const afterCut={ind:__game.indTimeToBingo(),hover:__game.hoverSec()-20,frozen:__game.S.bingoFrozen,held:__game.S.bingoHeld};
    // Relight and take a snapshot, then touch down — the gauge must freeze at the in-flight reading
    __game.S.engineOn=true; __game.S.thrCmd=0.55; __game.S.thr=0.55; __game.step(0.15);
    const preLand={ind:__game.indTimeToBingo(),hover:__game.hoverSec()-20,mode:__game.S.mode};
    __game.touchdown('pad');
    const post=[];
    for(let i=0;i<8;i++){
      post.push({i,ind:__game.indTimeToBingo(),hover:__game.hoverSec()-20,thr:__game.S.thr,mode:__game.S.mode,frozen:__game.S.bingoFrozen});
    }
    return {before,afterCut,preLand,post};
  });
  console.log('bingo freeze', JSON.stringify(r,null,2));
  ok(r.before.hover>r.before.ind+15, `in-flight hover remainder (${r.before.hover.toFixed(0)}s) is well above the throttle-dependent clock (${r.before.ind.toFixed(0)}s)`);
  ok(r.afterCut.ind<=r.before.ind+0.6, `CUT must not increase TO BINGO (before ${r.before.ind.toFixed(1)}s, after ${r.afterCut.ind.toFixed(1)}s)`);
  ok(r.afterCut.ind<r.afterCut.hover-10, 'after CUT the gauge has not jumped up to hover time');
  const land0=r.preLand.ind, landed=r.post.map(p=>p.ind);
  ok(r.post[0].mode==='landed'||r.post[0].mode==='crashed', `touchdown set a terminal mode (${r.post[0].mode})`);
  ok(Math.abs(r.post[0].ind-land0)<1.2, `frozen at touchdown (${r.post[0].ind.toFixed(1)}s) matches last in-flight reading (${land0.toFixed(1)}s)`);
  ok(landed.every(v=>v<=land0+0.2), `TO BINGO never increases after touchdown (landed values ${landed.map(v=>v.toFixed(1)).join(', ')})`);
  ok(r.post.every(p=>p.ind<p.hover-10), 'after landing the gauge does not jump toward the higher hover remainder');
  await ctx.close();
}

// ---------------- 4. iPhone landscape + Dynamic Island (left notch) ----------------
{
  const {ctx,page}=await openPage({width:852,height:393,touch:true,ua:PHONE_UA});
  // emulate landscape Dynamic Island on the left + home indicator at the bottom
  await ev(page,()=>{
    const r=document.documentElement.style;
    r.setProperty('--sa-l','59px'); r.setProperty('--sa-r','21px'); r.setProperty('--sa-b','21px'); r.setProperty('--sa-t','0px');
  });
  await ev(page,()=>{__game.begin(); /* force layout after inset change */ window.dispatchEvent(new Event('resize'));});
  await page.waitForTimeout(200);
  await ev(page,()=>__game.step(8));
  const geo=await ev(page,()=>{
    const g=s=>document.querySelector(s).getBoundingClientRect();
    const cs=getComputedStyle(document.documentElement);
    const sa={l:parseFloat(cs.getPropertyValue('--sa-l'))||0,r:parseFloat(cs.getPropertyValue('--sa-r'))||0,b:parseFloat(cs.getPropertyValue('--sa-b'))||0};
    const ov=(a,b)=>!(a.right<=b.left+0.5||b.right<=a.left+0.5||a.bottom<=b.top+0.5||b.bottom<=a.top+0.5);
    const comm=g('#comms'),thr=g('#thr'),cut=g('#cutb'),yl=g('#yawl'),yr=g('#yawr'),tbar=g('#tbar'),panel=document.getElementById('panel').getBoundingClientRect();
    return {
      sa, compact:document.getElementById('touchui').classList.contains('compact'),
      n:document.querySelectorAll('#comms div').length, commH:comm.height,
      comm,thr,cut,yl,yr,tbar,
      throttleClearsNotch:thr.left>=sa.l+8,
      commClearsNotch:comm.left>=sa.l+8,
      yawOverlap:ov(yl,yr),
      cutThrOverlap:ov(cut,thr),
      cutCommsOverlap:ov(cut,comm),
      commThrOverlap:ov(comm,thr),
      commTbarOverlap:ov(comm,tbar),
      abovePanel:thr.bottom<=panel.top+1 && cut.bottom<=panel.top+1 && yr.bottom<=panel.top+1,
      yawGap:yr.top-yl.bottom
    };
  });
  console.log('iphone notched', JSON.stringify(geo,null,2));
  ok(geo.compact, 'phone landscape uses compact left-column layout');
  ok(geo.throttleClearsNotch, `throttle clears the left notch (left=${geo.thr.left}, inset=${geo.sa.l})`);
  ok(geo.commClearsNotch, `radio log clears the left notch (left=${geo.comm.left})`);
  ok(!geo.yawOverlap && geo.yawGap>=6, `YAW buttons do not overlap (gap=${geo.yawGap.toFixed(1)}px)`);
  ok(!geo.cutThrOverlap, 'CUT does not overlap the throttle slider');
  ok(!geo.cutCommsOverlap && !geo.commThrOverlap, 'radio log does not overlap CUT or the throttle');
  ok(!geo.commTbarOverlap, 'radio log does not cover the top-right buttons');
  ok(geo.n<=3, `phone radio log has <=3 messages (got ${geo.n})`);
  ok(geo.abovePanel, 'touch controls sit above the instrument panel');
  await page.screenshot({path:'/workspace/lunar-lander/shot-iphone-notch-fix.png'});
  await ctx.close();
}

console.log(fails.length?`FAILED ${fails.length}: ${fails.join('; ')}`:'ALL FIX CHECKS PASSED');
await browser.close();
process.exit(fails.length?1:0);

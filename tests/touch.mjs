// iPad mini (landscape 1133x744 @2x) touch test. WebKit is preferred but can't run on this box (missing system libs),
// so this uses Chromium with mobile + touch emulation and an iPadOS UA; multi-touch goes through CDP touch events.
import { chromium, webkit } from 'playwright-core';
const UA='Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1';
let browser, engine='webkit';
try { browser = await webkit.launch(); } catch (e) { engine='chromium (iPad emulation)';
  browser = await chromium.launch({ executablePath:'/usr/bin/google-chrome', headless:true, args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] }); }
console.log('engine:', engine);
const ctx = await browser.newContext({ viewport:{width:1133,height:744}, deviceScaleFactor:2, isMobile:engine!=='webkit', hasTouch:true, userAgent:UA });
const page = await ctx.newPage();
const errs=[]; page.on('console',m=>{if(m.type()==='error')errs.push(m.text());}); page.on('pageerror',e=>errs.push('pageerror: '+e.message));
const ev=(f,a)=>page.evaluate(f,a);
const cdp = engine==='webkit'?null:await ctx.newCDPSession(page);
const touch = async (type, pts) => cdp.send('Input.dispatchTouchEvent',{type, touchPoints:pts.map((p,i)=>({x:p.x,y:p.y,id:p.id??i,radiusX:8,radiusY:8,force:1}))});
const tap = async (x,y) => { await touch('touchStart',[{x,y,id:9}]); await page.waitForTimeout(40); await touch('touchEnd',[]); await page.waitForTimeout(80); };
const shot = async n => { await ev(()=>__game.warm(2)); await page.waitForTimeout(1200); await page.screenshot({path:`/workspace/lunar-lander/${n}.png`}); console.log('saved', n+'.png'); };
const fails=[]; const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m); if(!c)fails.push(m);};
await page.goto('file:///workspace/lunar-lander/index.html?failset=historical');
await page.waitForFunction(()=>window.__game,null,{timeout:60000});
const env = await ev(()=>({touch:document.body.classList.contains('touch'),ui:__game.TOUCH_UI,gfx:__game.GFX,pr:__game.renderer?null:null,dpr:devicePixelRatio,vw:innerWidth,vh:innerHeight,
  help:getComputedStyle(document.getElementById('help')).display,tbl:getComputedStyle(document.querySelector('#start table')).display}));
console.log('env', JSON.stringify(env));
ok(env.touch && env.ui, 'touch UI auto-enabled on iPad'); ok(env.gfx==='low','auto graphics -> LOW on touch device'); ok(env.tbl==='none','keyboard table hidden in touch mode');
await shot('shot-ipad-start');
// tap the GRAPHICS/CONTROLS rows must not start the game
let r = await ev(()=>{const b=document.querySelector('#ctlset .fs[data-k="auto"]').getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2};});
await tap(r.x,r.y); ok(await ev(()=>!document.getElementById('start').classList.contains('hidden')),'settings row tap keeps start screen');
await tap(560,120); await page.waitForTimeout(300);
ok(await ev(()=>document.getElementById('start').classList.contains('hidden') && __game.S.mode==='fly'),'tap starts the game');
await ev(()=>__game.warm(2)); await ev(()=>__game.step(5));
// tap-target sizes (CSS px)
const sizes = await ev(()=>{const q=s=>{const b=document.querySelector(s).getBoundingClientRect();return [Math.round(b.width),Math.round(b.height)];};
  const P=__game.PANEL.byId,ps=__game.PS??null;return {thr:q('#thr'),stick:q('#stick'),cut:q('#cutb'),yaw:q('#yawl'),tbar:q('#tbar b'),abort:__game.tapSize('abort'),abortStage:__game.tapSize('abortStage'),sw:__game.tapSize('ldgRadar')};});
console.log('sizes', JSON.stringify(sizes));
for (const k of ['cut','yaw','tbar','abort','abortStage','sw']) ok(Math.min(...sizes[k])>=44, `${k} tap target >=44px (${sizes[k]})`);
// geometry: throttle and stick must not overlap the instrument panel or each other
const geo = await ev(()=>{const g=s=>document.querySelector(s).getBoundingClientRect();return {pTop:document.getElementById('panel').getBoundingClientRect().top,thr:g('#thr'),st:g('#stick'),y:g('#yawl'),comms:g('#comms')};});
ok(geo.thr.bottom<=geo.pTop+1 && geo.st.bottom<=geo.pTop+1, 'touch controls sit above the instrument panel');
// multi-touch: throttle at ~45% and stick pushed right + forward, simultaneously
const T = await ev(()=>{const b=document.querySelector('#thr .track').getBoundingClientRect();return {x:b.x+b.width/2,top:b.top,h:b.height,bot:b.bottom};});
const Sx = await ev(()=>{const b=document.getElementById('stick').getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2,R:b.width/2};});
const w0 = await ev(()=>__game.S.w.toArray());
const thrA={x:T.x,y:T.bot-T.h*0.1,id:1}, stA={x:Sx.x,y:Sx.y,id:2};
await touch('touchStart',[thrA]); await touch('touchStart',[thrA,stA]);
const thrB={...thrA,y:T.bot-T.h*0.5}, stB={x:Sx.x+Sx.R*0.6,y:Sx.y-Sx.R*0.3,id:2};
for (let i=1;i<=5;i++) { await touch('touchMove',[{...thrA,y:thrA.y+(thrB.y-thrA.y)*i/5},{x:stA.x+(stB.x-stA.x)*i/5,y:stA.y+(stB.y-stA.y)*i/5,id:2}]); await page.waitForTimeout(30); }
const ti = await ev(()=>({...__game.touchIn}));
console.log('touchIn while held', JSON.stringify(ti));
await ev(()=>__game.step(1.5));
let st = await ev(()=>({auto:__game.S.auto,cmd:__game.S.thrCmd,eng:__game.S.engineOn,w:__game.S.w.toArray()}));
console.log('after 1.5 s held', JSON.stringify(st));
ok(!st.auto, 'touch input takes over from auto'); ok(Math.abs(st.cmd-(0.1+0.5/0.8*0.5))<0.03, `throttle slider mid -> thrCmd ${st.cmd.toFixed(3)}`);
ok(Math.hypot(...st.w.map((v,i)=>v-w0[i]))>0.01 && ti.roll>0.3 && ti.pitch<-0.1, 'stick drives roll + pitch rates');
await shot('shot-ipad-descent-touch');
// slide into the FULL zone
await touch('touchMove',[{...thrA,y:T.top+3},stB]); await ev(()=>__game.step(0.2));
ok(await ev(()=>__game.S.thrCmd)===1, 'throttle FULL zone -> 100%');
// release both: stick springs back, throttle stays
await touch('touchEnd',[]); await page.waitForTimeout(50);
const rel = await ev(()=>({...__game.touchIn,knob:document.querySelector('#stick .knob').style.transform,cmd:__game.S.thrCmd}));
ok(rel.roll===0 && rel.pitch===0 && rel.knob==='', 'stick springs back to centre on release'); ok(rel.cmd===1, 'throttle holds setting after release');
// yaw button
r = await ev(()=>{const b=document.getElementById('yawl').getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2};});
await touch('touchStart',[{...r,id:3}]); const yv=await ev(()=>__game.touchIn.yaw); await touch('touchEnd',[]); ok(yv===1 && await ev(()=>__game.touchIn.yaw)===0,'yaw button press/release');
// CUT
r = await ev(()=>{const b=document.getElementById('cutb').getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2};}); await tap(r.x,r.y); await ev(()=>__game.step(0.2));
const cutSt=await ev(()=>({eng:__game.S.engineOn,cmd:__game.S.thrCmd,fill:document.querySelector('#thr .fill').style.height,p:document.querySelector('#thr .knob').style.bottom}));
console.log('after CUT', JSON.stringify(cutSt));
ok(!cutSt.eng,'CUT stops engine');
ok(cutSt.cmd===0,'CUT resets commanded throttle to 0');
ok(cutSt.fill==='0%'||cutSt.fill==='0','CUT drops the slider fill to 0');
await touch('touchStart',[{x:T.x,y:T.bot-T.h*0.3,id:1}]); await touch('touchEnd',[]); await ev(()=>__game.step(0.2)); ok(await ev(()=>__game.S.engineOn),'throttle touch relights engine');
// top bar: camera + pause
const cam0=await ev(()=>__game.camState.mode); r=await ev(()=>{const b=document.querySelector('#tbar b[data-k="KeyC"]').getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2};});
await tap(r.x,r.y); ok(await ev(()=>__game.camState.mode)!==cam0,'CAM button cycles camera');
// switch panel: open via SWITCHES button, flip radar switch by tap
r=await ev(()=>{const b=document.querySelector('#tbar b[data-k="KeyF"]').getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2};});
await tap(r.x,r.y); await page.waitForTimeout(600); ok(await ev(()=>__game.swOpen),'SWITCHES button opens failure switch panel');
const sw0=await ev(()=>JSON.stringify(__game.PANEL.state.ldgRadar)); const sp=await ev(()=>__game.swXY('ldgRadar')); await tap(sp.x,sp.y);
const sw1=await ev(()=>JSON.stringify(__game.PANEL.state.ldgRadar)); console.log('switches', sw0, '->', sw1); ok(sw0!==sw1,'tap flips a switch on the panel');
await ev(()=>{__game.camState.mode=0;__game.camState.dist=30;}); await shot('shot-ipad-failure-panel');
await tap(r.x,r.y); await page.waitForTimeout(600);
// abort guard: tap lifts guard, second tap fires
const ap=await ev(()=>__game.ctrlXY('abort')); await tap(ap.x,ap.y); const cov=await ev(()=>__game.PANEL.state.abort.cover);
await tap(ap.x,ap.y); await ev(()=>__game.step(0.3)); const ab=await ev(()=>({abort:__game.S.abort,mode:__game.S.mode}));
console.log('abort', cov, JSON.stringify(ab)); ok(cov && ab.abort,'ABORT guard: tap 1 lifts guard, tap 2 aborts');
// portrait -> rotate hint
await page.setViewportSize({width:744,height:1133}); await page.waitForTimeout(300);
ok(await ev(()=>getComputedStyle(document.getElementById('rotate')).display==='flex'),'portrait shows rotate-to-landscape hint');
await page.setViewportSize({width:1133,height:744}); await page.waitForTimeout(300);
ok(await ev(()=>getComputedStyle(document.getElementById('rotate')).display==='none'),'landscape hides hint');
// phone landscape sanity
await page.setViewportSize({width:844,height:390}); await page.waitForTimeout(300);
const ph=await ev(()=>{const g=s=>document.querySelector(s).getBoundingClientRect();return {pTop:document.getElementById('panel').getBoundingClientRect().top,thrTop:g('#thr').top,thrB:g('#thr').bottom,stB:g('#stick').bottom,tbarB:g('#tbar').bottom,stL:g('#stick').left,yawL:g('#yawl').left};});
console.log('phone', JSON.stringify(ph)); ok(ph.thrB<=ph.pTop+1 && ph.stB<=ph.pTop+1 && ph.thrTop>ph.tbarB-60,'iPhone landscape layout fits');
await page.screenshot({path:'/workspace/lunar-lander/shot-iphone-landscape.png'});
console.log('ERRORS:', errs.length?errs.join('\n'):'none');
console.log(fails.length?`FAILED ${fails.length}: ${fails.join('; ')}`:'ALL TOUCH CHECKS PASSED');
await browser.close(); process.exit(fails.length?1:0);

import { chromium } from 'playwright-core';
const scen = process.argv[2] || 'p70';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 860 } });
const errs = [];
page.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
await page.goto('file:///workspace/lunar-lander/index.html?failset=historical');
await page.waitForFunction(() => window.__game, null, { timeout: 60000 });
const ev = (f, a) => page.evaluate(f, a);
const st = () => ev(()=>({t:+__game.S.t.toFixed(1),mode:__game.S.mode,abort:__game.S.abort,staged:__game.S.staged,altFt:Math.round(__game.altFt()),vs:+(__game.S.vel.y*3.28).toFixed(1),dps:+__game.fuelPct().toFixed(1),aps:Math.round(__game.S.apsFuel),prog:__game.S.prog,ds:{a:__game.DS.active,done:__game.DS.done,fate:__game.DS.fate}}));
const shot = async (name, clip) => { await ev(()=>__game.warm(2)); await page.waitForTimeout(1500); await page.screenshot({ path: `/workspace/lunar-lander/${name}.png`, clip }); console.log('saved', name); };
await page.keyboard.press('Space'); await ev(()=>__game.warm(3));
const flyUntil = async (cond, max=200) => { for (let i=0;i<max;i++){ const s=await st(); if (await ev(cond) || (s.mode!=='fly' && s.mode!=='abortok')) return s; await ev(()=>__game.step(0.5)); } return st(); };
if (scen==='p70') {
  await flyUntil(()=>__game.S.t>=26);
  console.log('before abort', await st());
  // keyboard path: short tap only lifts the guard, a hold presses
  await page.keyboard.down('KeyB'); await page.waitForTimeout(150); await page.keyboard.up('KeyB');
  console.log('after tap, abort engaged?', await ev(()=>__game.S.abort), 'guard', await ev(()=>__game.PANEL.state.abort.cover));
  await page.keyboard.down('KeyB'); await page.waitForTimeout(1100); await page.keyboard.up('KeyB');
  console.log('after hold', await st());
  await ev(()=>{__game.camState.mode=0;__game.camState.dist=40;});
  await flyUntil(()=>__game.S.t>=__game.S.info.t+4); await shot('shot-abort-p70-climb');
} else if (scen==='p71') {
  await ev(()=>__game.autoland(__game.CLEAR.x, __game.CLEAR.z));
  await flyUntil(()=>__game.altFt()<420);
  // mouse path: first click lifts the guard on ABORT (panel shot), then ABORT STAGE gets two clicks
  let p = await ev(()=>__game.ctrlXY('abort')); await page.mouse.click(p.x,p.y);
  await shot('shot-abort-panel', { x: 1100, y: 860-320, width: 300, height: 320 });
  await shot('shot-abort-panel-full');
  p = await ev(()=>__game.ctrlXY('abortStage')); await page.mouse.click(p.x,p.y);
  console.log('after 1 click: staged?', await ev(()=>__game.S.staged), 'guard', await ev(()=>__game.PANEL.state.abortStage.cover), 'abort guard', await ev(()=>__game.PANEL.state.abort.cover));
  await page.mouse.click(p.x,p.y);
  console.log('after 2 clicks', await st(), 'debris', await ev(()=>__game.debris));
  await ev(()=>{__game.camState.mode=0;__game.camState.dist=26;__game.camState.pitch=0.12;});
  await ev(()=>__game.warm(40));
  await shot('shot-abort-staging');
  await ev(()=>{__game.camState.dist=60;});
  await ev(()=>__game.warm(140));
  await shot('shot-abort-staging-2');
} else if (scen==='late') {
  await ev(()=>__game.autoland(__game.CLEAR.x, __game.CLEAR.z));
  await flyUntil(()=>__game.altFt()<330);
  await page.keyboard.press('KeyX');  // cut the engine -> P66 manual, falling
  await flyUntil(()=>__game.altFt()<60);
  console.log('falling, abort stage now', await st());
  await ev(()=>{__game.PANEL.byId.abortStage.open(performance.now());__game.PANEL.byId.abortStage.press(performance.now());});
}
// run to the end
for (let i=0;i<400;i++){ const s=await st(); if (s.mode!=='fly' && s.mode!=='abortok') break; if (s.mode==='abortok' && i%10==0) {} await ev(()=>__game.step(0.5)); if (await ev(()=>__game.S.mode)==='abortok') break; }
console.log('outcome', await st());
for (let i=0;i<60 && !(await ev(()=>!document.getElementById('debrief').classList.contains('hidden'))); i++) await ev(()=>__game.warm(60));
console.log('final', await st(), 'debrief:', await ev(()=>document.getElementById('debriefCard').innerText.replace(/\n+/g,' | ')));
console.log('panel log', JSON.stringify(await ev(()=>__game.PANEL.log)));
console.log('comms', await ev(()=>[...document.querySelectorAll('#comms div')].map(d=>(d.classList.contains('real')?'[REAL] ':'')+d.textContent).join(' || ')));
console.log('radio', JSON.stringify(await ev(()=>__game.radioLog.filter(e=>e.name.startsWith('duke')))));
if (scen!=='p70' || true) await shot(`shot-abort-debrief-${scen}`);
console.log('ERRORS:', errs.length ? errs.join('\n') : 'none');
await browser.close();

import { chromium } from 'playwright-core';
const mode = process.argv[2] || 'basic';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on('console', m => { if (m.type() === 'error' || m.type()==='warning') errs.push(m.type()+': '+m.text()); });
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
const t0=Date.now();
await page.goto('file:///workspace/lunar-lander/index.html?failset=historical');
await page.waitForFunction(() => window.__game, null, { timeout: 60000 });
console.log('loaded in', Date.now()-t0, 'ms; boulders', await page.evaluate(()=>__game.boulders.length));
await page.waitForTimeout(1500);
const ev = (f, a) => page.evaluate(f, a);
if (mode === 'basic') {
  await page.screenshot({ path: 'shot-1-start.png' });
  await page.keyboard.press('Space');
  await page.waitForTimeout(3000);
  console.log(await ev(() => ({ t: __game.S.t, alt: __game.altitude(), mode: __game.S.mode })));
  // fast-forward under autopilot
  await ev(() => __game.step(12));
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-alarm.png' });
  // take over: pitch forward a bit, throttle
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(700); await page.keyboard.up('ArrowUp');
  await page.keyboard.down('KeyW'); await page.waitForTimeout(500); await page.keyboard.up('KeyW');
  await page.waitForTimeout(1500);
  console.log(await ev(() => ({ t: __game.S.t, alt: __game.altitude(), auto: __game.S.auto, thr: __game.S.thrCmd, fuel: __game.fuelPct(), hover: __game.hoverSec() })));
  await page.screenshot({ path: 'test-manual.png' });
} else if (mode === 'auto') {
  // autopilot to planned (boulder) site
  await page.keyboard.press('Space');
  const r = await ev(() => { const g=__game; const log=[]; for(let i=0;i<200&&g.S.mode==='fly';i++){ g.step(1); if(i%10==0) log.push([g.S.t.toFixed(0), g.altitude().toFixed(0), g.S.vel.x.toFixed(1), g.S.vel.y.toFixed(1), g.fuelPct().toFixed(1), g.hoverSec().toFixed(0), g.S.thr.toFixed(2)]); } return {log, res:g.S.result && {...g.S.result}}; });
  console.log(JSON.stringify(r.log)); console.log(JSON.stringify(r.res));
  await page.waitForTimeout(8000);
  await page.screenshot({ path: 'test-auto-end.png' });
} else if (mode === 'clear') {
  await page.keyboard.press('Space');
  const r = await ev(() => { const g=__game; g.autoland(g.CLEAR.x, g.CLEAR.z); const log=[]; for(let i=0;i<260&&g.S.mode==='fly';i++){ g.step(1); if(i%10==0) log.push([g.S.t.toFixed(0), g.altitude().toFixed(0), g.S.vel.x.toFixed(1), g.S.vel.y.toFixed(1), g.fuelPct().toFixed(1), g.hoverSec().toFixed(0)]); } return {log,res:g.S.result && {...g.S.result}}; });
  console.log(JSON.stringify(r.log)); console.log(JSON.stringify(r.res));
}
console.log('ERRORS:', errs.length ? errs.join('\n') : 'none');
await browser.close();

import { chromium } from 'playwright-core';
const target = process.argv[2] || 'clear';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 800, height: 500 } });
const errs = [];
page.on('console', m => { if (m.type()==='error'||m.type()==='warning') errs.push(m.type()+': '+m.text()); });
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
await page.goto('file:///workspace/lunar-lander/index.html?failset=historical');
await page.waitForFunction(() => window.__game, null, { timeout: 60000 });
const ev = (f, a) => page.evaluate(f, a);
await page.keyboard.press('Space');
await page.waitForFunction(() => __game.radioLog.some(e=>e.ev.startsWith('decoded')), null, {timeout:30000});
if (target==='clear') await ev(()=>__game.autoland(__game.CLEAR.x, __game.CLEAR.z));
const t0=Date.now();
while (await ev(()=>__game.S.mode)==='fly' && Date.now()-t0<240000) { await ev(()=>__game.step(0.5)); await page.waitForTimeout(450); }
for (let i=0;i<46;i++){ await ev(()=>__game.warm(30)); await page.waitForTimeout(400); }
const r = await ev(()=>({log:__game.radioLog, res:__game.S.result&&__game.S.result.res, comms:[...document.querySelectorAll('#comms div')].map(d=>d.textContent), deb:!document.getElementById('debrief').classList.contains('hidden')}));
for (const e of r.log) console.log(String(e.t).padStart(7), e.ev, e.name);
console.log('result', r.res, 'debrief shown', r.deb); console.log('last comms:', r.comms.join(' | '));
console.log('ERRORS:', errs.length? errs.join('\n') : 'none');
await browser.close();

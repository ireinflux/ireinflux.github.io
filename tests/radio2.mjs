import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
const errs = [];
page.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
await page.goto('file:///workspace/lunar-lander/index.html?failset=historical');
await page.waitForFunction(() => window.__game);
await page.evaluate(()=>{ __game.RADIO.capcom_go_landing.d='QUJDREVGRw=='; }); // corrupt one clip on purpose
await page.keyboard.press('Space');
await page.waitForFunction(() => __game.radioLog.some(e=>e.ev.startsWith('decoded')));
for (let i=0;i<4;i++){ await page.evaluate(()=>__game.step(0.5)); await page.waitForTimeout(300);}
await page.keyboard.press('KeyM'); await page.evaluate(()=>__game.warm(30)); await page.waitForTimeout(300);
const mutedGain = await page.evaluate(()=>__game.au.master.gain.value);
await page.keyboard.press('KeyM'); await page.evaluate(()=>__game.warm(30));
const modes=[]; for(let i=0;i<3;i++){ await page.keyboard.press('KeyV'); modes.push(await page.evaluate(()=>__game.voiceMode)); }
console.log(JSON.stringify(await page.evaluate(()=>__game.radioLog)));
console.log('master gain while muted', mutedGain, 'V cycles', modes, 'errors', errs.length?errs:'none');
await browser.close();

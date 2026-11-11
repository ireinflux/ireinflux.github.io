import { chromium } from 'playwright-core';
const scen = process.argv[2] || 'radar';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 860 } });
const errs = [];
page.on('console', m => { if (m.type()==='error') errs.push(m.text()); if (m.text().startsWith('[fail]')) console.log('  console:', m.text()); });
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
const url = 'file:///workspace/lunar-lander/index.html' + (scen==='start'||scen==='settings' ? '' : scen==='hard' ? '?failset=hard' : `?fail=${scen}&failt=18`);
await page.goto(url);
await page.waitForFunction(() => window.__game, null, { timeout: 60000 });
const ev = (f, a) => page.evaluate(f, a);
const shot = async (name) => { await ev(()=>__game.warm(2)); await page.waitForTimeout(1500); await page.screenshot({ path: `/workspace/lunar-lander/${name}.png` }); console.log('saved', name); };
if (scen==='start') {
  await page.keyboard.press('KeyF'); await page.keyboard.press('KeyF');   // cycle Random -> Hard -> Off
  console.log('after 2x F:', await ev(()=>__game.failSetting));
  await page.click('#failset .fs[data-k="random"]');
  console.log('after click Random:', await ev(()=>__game.failSetting), 'start hidden?', await ev(()=>document.getElementById('start').classList.contains('hidden')));
  await shot('shot-fail-start-setting');
  console.log('ERRORS:', errs.length ? errs.join('\n') : 'none'); await browser.close(); process.exit(0);
}
if (scen==='settings') {
  const r = await ev(()=>{const out={};for(const k of ['off','historical','random','hard']){out[k]=[];for(let i=0;i<20;i++){__game.setFailSetting(k);out[k].push(__game.fails.length+':'+__game.S.events.length);}out[k]=[...new Set(out[k])].join(' ');}__game.setFailSetting('random');return out;});
  console.log('fails:events per setting', JSON.stringify(r));
  console.log('ERRORS:', errs.length ? errs.join('\n') : 'none'); await browser.close(); process.exit(0);
}
const st = () => ev(()=>({t:+__game.S.t.toFixed(1),mode:__game.S.mode,altFt:Math.round(__game.altFt()),vs:+(__game.S.vel.y*3.28).toFixed(1),thr:+__game.S.thr.toFixed(2),cmd:+__game.S.thrCmd.toFixed(2),
  w:__game.S.w.toArray().map(v=>+(v*57.3).toFixed(1)),rcs:+__game.S.rcs.toFixed(1),fuel:+__game.fuelPct().toFixed(2),ind:+__game.indFuelPct().toFixed(2),low:__game.S.lowLevel,lr:__game.lrValid(),tape:__game.tapeData(),
  caution:__game.caution(),sw:__game.swOpen,fails:__game.fails.map(f=>({id:f.id,on:f.on,fixed:f.fixed,how:f.how}))}));
await page.keyboard.press('Space'); await ev(()=>__game.warm(3));
await ev(()=>__game.autoland(__game.CLEAR.x, __game.CLEAR.z));
const step = async (sec) => { for (let i=0;i<sec*2;i++){ if (!['fly','abortok'].includes(await ev(()=>__game.S.mode))) return; await ev(()=>__game.step(0.5)); } };
if (scen==='hard') { await step(120); } else await step(18 + (scen==='rcs'?3:scen==='slosh'?6:scen==='fuelstuck'?10:5) - 0.0);
console.log('SYMPTOM', JSON.stringify(await st()));
await ev(d=>{__game.camState.mode=0;__game.camState.dist=d;},scen==='rcs'?22:32);
await shot(`shot-fail-${scen}`);
await step(2);
// remedy through the real keyboard shortcuts
const key = async k => { await page.keyboard.press(k); await ev(()=>__game.warm(1)); };
if (scen==='radar') { await ev(()=>__game.step(0.5)); await key('KeyY'); console.log('MODE SEL PGNS tape', JSON.stringify(await ev(()=>__game.tapeData())));
  await key('KeyG'); await step(1); await key('KeyG'); await step(3.5); await key('KeyY'); }
if (scen==='throttle') await key('KeyT');
if (scen==='rcs') await key('Digit3');
if (scen==='slosh' || scen==='fuelstuck') await key('KeyU');
await step(1);
console.log('AFTER REMEDY', JSON.stringify(await st()));
await step(200);
for (let i=0;i<40 && !(await ev(()=>!document.getElementById('debrief').classList.contains('hidden'))); i++) await ev(()=>__game.warm(60));
const fin = await st();
console.log('FINAL', fin.mode, JSON.stringify(fin.fails), 'result', await ev(()=>__game.S.result&&__game.S.result.res));
console.log('debrief failures:', await ev(()=>{const t=document.getElementById('debriefCard').innerText;return t.slice(t.indexOf('FAILURES')).split('PRESS')[0].replace(/\n+/g,' | ');}));
console.log('comms', await ev(()=>[...document.querySelectorAll('#comms div')].map(d=>(d.classList.contains('real')?'[REAL] ':'')+d.textContent).join(' || ')));
console.log('panel log', JSON.stringify(await ev(()=>__game.PANEL.log.filter(e=>!['abort','abortStage'].includes(e.id)))));
console.log('ERRORS:', errs.length ? errs.join('\n') : 'none');
await browser.close();

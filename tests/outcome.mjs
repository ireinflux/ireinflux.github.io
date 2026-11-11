// Full outcome radio exchange (soft / hard / crash) is readable in the log and repeated in full on the results card.
import { chromium } from 'playwright-core';
const UA='Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const want={ok:['Shutdown.','We copy you down, Eagle.','Tranquility Base here','turn blue'],hard:['Shutdown.','hard one','structure data. Stand by.'],crash:['Do you read? Over.']};
for(const kind of ['ok','hard','crash']){
  const ctx=await b.newContext({viewport:{width:1133,height:744},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:UA});const page=await ctx.newPage();
  const errs=[];page.on('pageerror',e=>errs.push(e.message));
  await page.goto('file:///workspace/lunar-lander/index.html?failset=off');await page.waitForFunction(()=>window.__game,null,{timeout:60000});
  const r=await page.evaluate((kind)=>{const g=__game,S=g.S;g.begin();g.autoland(g.CLEAR.x,g.CLEAR.z);
    while(S.mode==='fly'&&g.altitude()>(kind==='ok'?0:1.2))g.step(0.1);
    if(kind!=='ok'&&S.mode==='fly'){S.vel.set(0,kind==='hard'?-3.6:-9,0);S.w.set(0,0,0);while(S.mode==='fly')g.step(0.02);}
    const seen=[];let clipped=false;const deb=document.getElementById('debrief');
    for(let i=0;i<1800&&deb.classList.contains('hidden');i++){g.warm(1);const box=document.getElementById('comms');
      for(const d of box.querySelectorAll('div')){const t=d.textContent;if(!seen.includes(t))seen.push(t);if(d.getBoundingClientRect().bottom>box.getBoundingClientRect().bottom+1||box.scrollHeight>box.clientHeight+1)clipped=true;}}
    const recap=[...document.querySelectorAll('#debriefCard .recap div')].map(d=>d.textContent);
    return {res:S.result&&S.result.res,seen,clipped,recap,deb:!deb.classList.contains('hidden')};},kind);
  console.log(kind,JSON.stringify(r));
  ok(r.res===kind,`${kind}: outcome reached (${r.res})`);ok(r.deb,`${kind}: results card shown`);ok(!r.clipped,`${kind}: no log line clipped`);
  for(const w of want[kind]){ok(r.seen.some(t=>t.includes(w)),`${kind}: log showed "${w}"`);ok(r.recap.some(t=>t.includes(w)),`${kind}: results card repeats "${w}"`);}
  ok(errs.length===0,`${kind}: no page errors`);
  await page.waitForTimeout(200);await page.screenshot({path:`/workspace/lunar-lander/shot-outcome-${kind}.png`});await ctx.close();}
console.log(fails.length?`${fails.length} FAILED`:'ALL PASS');await b.close();process.exit(fails.length?1:0);

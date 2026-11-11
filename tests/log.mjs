// Radio log never clips long messages (hard-landing CAPCOM line etc.), on iPad and phone.
import { chromium } from 'playwright-core';
const UA='Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1';
const PUA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
for(const [name,vp,ua] of [['ipad',{width:1133,height:744},UA],['iphone',{width:844,height:390},PUA],['desktop',{width:1133,height:744},null]]){
  const ctx=await b.newContext({viewport:vp,deviceScaleFactor:2,isMobile:!!ua,hasTouch:!!ua,...(ua?{userAgent:ua}:{})});const page=await ctx.newPage();
  await page.goto('file:///workspace/lunar-lander/index.html?failset=off');await page.waitForFunction(()=>window.__game,null,{timeout:60000});
  const r=await page.evaluate(()=>{const g=__game;g.begin();g.step(2);
    const seq=[['ARMSTRONG','Shutdown.'],['CAPCOM','We copy you down, Eagle.'],['ALDRIN','That was a hard one, Neil.'],['CAPCOM',"Eagle, Houston. We're looking at your gear and structure data. Stand by."],
      ['CAPCOM',"Eagle, Houston. We copy the abort. Descent engine abort, you're looking good."],['ALDRIN','Descent stage is down. Looks like she landed on her legs.'],['CAPCOM','Bingo. Eagle, you need to be on the ground.']];
    const out=[];for(const [w,t] of seq){g.say(w,t);const box=document.getElementById('comms'),bb=box.getBoundingClientRect();const divs=[...box.querySelectorAll('div')];const last=divs[divs.length-1];
      out.push({t,shown:last.textContent.includes(t),clipped:box.scrollHeight>box.clientHeight+1||last.getBoundingClientRect().bottom>bb.bottom+1,n:divs.length,h:bb.height,vh:innerHeight});}
    return out;});
  for(const x of r){ok(x.shown&&!x.clipped,`${name}: full text visible: "${x.t.slice(0,40)}..." (lines kept ${x.n}, box ${x.h.toFixed(0)}px)`);ok(x.h<x.vh*0.45,`${name}: log stays in top part of view`);}
  if(name==='ipad')await page.screenshot({path:'/workspace/lunar-lander/shot-log-hard.png'});
  await ctx.close();}
console.log(fails.length?`${fails.length} FAILED`:'ALL PASS');await b.close();process.exit(fails.length?1:0);

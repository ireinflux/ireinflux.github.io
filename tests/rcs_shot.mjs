import { chromium } from 'playwright-core';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await (await b.newContext({viewport:{width:1133,height:744}})).newPage();
await page.goto('file:///workspace/lunar-lander/index.html?failset=off');
await page.waitForFunction(()=>window.__game,null,{timeout:60000});
const r=await page.evaluate(()=>{const g=__game,S=g.S;g.begin();g.step(20);S.auto=false;S.prog=66;g.warm(30);g.camState.mode=0;g.camState.dist=12;g.camState.pitch=0.12;g.camState.yaw=Math.PI-0.7;
 g.keys.KeyD=true;g.warm(3);return {j:g.jetsOn(),live:g.rcsLive(),cmd:S.rcsCmd.toArray()};});
console.log(JSON.stringify(r));
await page.screenshot({path:'/workspace/lunar-lander/shot-rcs-closeup.png'});await b.close();

import { makeLessonScene } from "../../公共资源/感知与识别/src/4-2.scene.mjs";
import * as A from "../../公共资源/anatomy/audit.mjs";
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';
const {chromium}=createRequire(import.meta.url)(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--do-not-de-elevate','--allow-file-access-from-files']});
const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
const reports=[];
try{
 await page.goto(new URL("../index.html",import.meta.url).href);
 for(const width of [.7,.9])for(const height of [.12,.4,1.05])for(const azimuth of [10,43,90,170]){
  await page.locator('#widths button').filter({has:undefined}).evaluateAll((buttons,value)=>buttons.find(b=>Number(b.dataset.value)===value).click(),width);
  for(const [selector,value] of [['#scan-height',height],['#camera-angle',azimuth]])await page.locator(selector).evaluate((input,value)=>{input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));},value);
  const runtime=await page.evaluate(()=>({order:[...document.querySelectorAll('#machine .machine-part')].map(p=>p.dataset.name),error:document.querySelector('#machine svg').dataset.orderError||null,config:lessonState().config}));
  const scene=makeLessonScene(runtime.config),R=A.recorder(scene.P);
  for(const p of scene.parts){
   const meta={name:p.name,owner:p.owner};
   const shape=p.type==='box'?A.slab(p.plan,p.z,p.h,meta,5):p.type==='cyl'?A.cylinder(p.x,p.y,p.r,p.z,p.h,meta):A.orientedBox(p.center,p.axes,p.size.map(v=>v/2),meta);
   R.put({name:p.name,key:runtime.order.indexOf(p.name),at:p.center,svg:scene.draw(p),shapes:[R.solid(shape)]});
  }
  const result=A.depthOrder(R.items,scene.P);
  reports.push({config:runtime.config,orderError:runtime.error,missing:result.missing,problems:result.problems});
  console.log(JSON.stringify({...runtime.config,problems:result.problems.length,orderError:runtime.error}));
  writeFileSync(new URL("./4-2-live-depth.json",import.meta.url),JSON.stringify(reports,null,2));
 }
 process.exitCode=reports.some(r=>r.orderError||r.missing.length||r.problems.length)?1:0;
}finally{await browser.close()}

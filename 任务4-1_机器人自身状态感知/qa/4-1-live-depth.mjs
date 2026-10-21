import { fixture } from "../../公共资源/感知与识别/src/geometry.mjs";
import * as A from "../../公共资源/anatomy/audit.mjs";
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';
const require=createRequire(import.meta.url);
const {chromium}=require(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--do-not-de-elevate','--allow-file-access-from-files']});
const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
const reports=[];
try{
 await page.goto(new URL("../index.html",import.meta.url).href);
 for(const angle of [0,5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90]){
  await page.locator('#angle').evaluate((input,value)=>{input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));},angle);
  await page.waitForFunction(value=>Math.abs(lessonState().angle-value)<.001,angle);
  const runtime=await page.evaluate(()=>({order:[...document.querySelectorAll('#machine .machine-part')].map(p=>p.dataset.name),error:document.querySelector('#machine svg').dataset.orderError||null,angle:lessonState().angle}));
  const scene=fixture(angle),R=A.recorder(scene.P);
  for(const p of scene.parts){
   const meta={name:p.name,owner:p.owner};
   const shape=p.type==='box'?A.slab(p.plan,p.z,p.h,meta,5):p.type==='cyl'?A.cylinder(p.x,p.y,p.r,p.z,p.h,meta):A.orientedBox(p.center,p.axes,p.size.map(v=>v/2),meta);
   R.put({name:p.name,key:runtime.order.indexOf(p.name),at:p.center,svg:scene.draw(p),shapes:[R.solid(shape)]});
  }
  const result=A.depthOrder(R.items,scene.P);
  reports.push({angle:runtime.angle,orderError:runtime.error,missing:result.missing,problems:result.problems});
  console.log(angle+'° live DOM depth problems: '+result.problems.length+'; orderError='+runtime.error);
 }
 writeFileSync(new URL("./4-1-live-depth.json",import.meta.url),JSON.stringify(reports,null,2));
 process.exitCode=reports.some(r=>r.orderError||r.missing.length||r.problems.length)?1:0;
}finally{await browser.close()}

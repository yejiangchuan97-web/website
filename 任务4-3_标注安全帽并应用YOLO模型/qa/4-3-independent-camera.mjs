import {fileURLToPath as __taskFileURL} from 'node:url';
const __taskFile=p=>__taskFileURL(new URL(p,import.meta.url));
import {createRequire} from 'node:module';
import {writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {homedir} from 'node:os';
import {pathToFileURL} from 'node:url';
import * as A from "../../公共资源/感知与识别/assets/kit/audit.mjs";
import {makeLessonScene} from "../../公共资源/感知与识别/src/4-3.scene.mjs";
const require=createRequire(import.meta.url),{chromium}=require(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const {LINE_ENDS}=await import(pathToFileURL(join(homedir(),'.agents/skills/anatomy/scripts/line-ends.mjs')));
const root=__taskFile("../../公共资源/感知与识别"),qa=__taskFile("../../公共资源/感知与识别/qa"),url=pathToFileURL(__taskFile("../index.html")).href;
const report={checks:[],poses:[],frames:[],errors:[],shots:[]},check=(name,pass,actual=null)=>{report.checks.push({name,pass:Boolean(pass),actual});console.log(pass?'PASS':'FAIL',name,actual===null?'':JSON.stringify(actual));};
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--do-not-de-elevate','--allow-file-access-from-files']});
const ctx=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'}),page=await ctx.newPage();
page.on('pageerror',e=>report.errors.push(e.message));await page.goto(url);await page.locator('#machine').scrollIntoViewIfNeeded();
async function input(sel,v){await page.locator(sel).evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},String(v));}
for(const azimuth of [15,43,90,155]){
await input('#camera-view',azimuth);
for(const camera of [-60,-30,0,35,70]){
await input('#camera-position',camera);
const order=await page.locator('#machine .machine-part').evaluateAll(xs=>xs.map(x=>x.dataset.name));
const scene=makeLessonScene({camera,azimuth}),R=A.recorder(scene.P);
for(const p of scene.parts){const meta={name:p.name,owner:p.owner},shape=p.type==='box'?A.slab(p.plan,p.z,p.h,meta,5):p.type==='cyl'?A.cylinder(p.x,p.y,p.r,p.z,p.h,meta):A.orientedBox(p.center,p.axes,p.size.map(v=>v/2),meta);R.put({key:order.indexOf(p.name),name:p.name,at:p.center,svg:scene.draw(p),shapes:[R.solid(shape)]});}
const depth=A.depthOrder(R.items,scene.P),lines=await page.evaluate('('+LINE_ENDS+')({select:"#machine",show:false})');
const cycle=await page.locator('#machine svg').getAttribute('data-order-error');
const item={azimuth,camera,depthProblems:depth.problems,missing:depth.missing,lineProblems:lines.problems,lineEnds:lines.ends,cycle};
report.poses.push(item);check('pose '+azimuth+'° / '+camera+' depth and line ends',depth.problems.length===0&&depth.missing.length===0&&lines.problems.length===0&&!cycle,{depth:depth.problems.length,lines:lines.problems.length,cycle});
if(depth.problems.length||lines.problems.length){const out=join(qa,'4-3-independent-pose-'+azimuth+'-'+camera+'.png');await page.locator('.iso-plate').screenshot({path:out});report.shots.push(out);}
}
}
await ctx.close();
const normal=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'no-preference'}),p=await normal.newPage();p.on('pageerror',e=>report.errors.push(e.message));await p.goto(url);await p.locator('#machine').scrollIntoViewIfNeeded();await p.waitForTimeout(100);
await p.evaluate(()=>{window.__cameraNodes=[...document.querySelectorAll('#machine .machine-part')];window.__cameraPaths=[...document.querySelectorAll('#machine .machine-part path')];});
await p.locator('#camera-position').evaluate(e=>{e.value=-60;e.dispatchEvent(new Event('input',{bubbles:true}));});
const frames=await p.evaluate(async()=>{const a=[];for(let i=0;i<70;i++){await new Promise(r=>requestAnimationFrame(r));const s=lessonState();a.push({camera:s.camera,target:s.cameraTarget,cycle:document.querySelector('#machine svg').dataset.orderError||null,sameNodes:window.__cameraNodes.every(x=>x.isConnected&&document.getElementById('machine').contains(x)),samePaths:window.__cameraPaths.every(x=>x.isConnected)});}return a;});
report.frames=frames;check('normal animation preserves every original solid node and path',frames.every(f=>f.sameNodes&&f.samePaths));check('normal animation has no order cycle at 70 consecutive frames',frames.every(f=>!f.cycle));check('normal motion interpolates instead of snapping',frames.some(f=>f.camera>-59&&f.camera<47));check('normal motion converges monotonically within 0.05 units',Math.abs(frames.at(-1).camera+60)<.05&&frames.slice(1).every((f,i)=>f.camera<=frames[i].camera+1e-6),{first:frames[0].camera,last:frames.at(-1).camera});
await p.setViewportSize({width:1440,height:650});await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(200);await p.locator('#camera-position').evaluate(e=>{e.value=70;e.dispatchEvent(new Event('input',{bubbles:true}));});const before=await p.evaluate(()=>lessonState().camera);await p.waitForTimeout(250);const after=await p.evaluate(()=>lessonState().camera);check('offscreen camera animation stays paused',Math.abs(after-before)<1e-9,{before,after});await p.locator('#machine').scrollIntoViewIfNeeded();await p.waitForTimeout(1400);const resumed=await p.evaluate(()=>lessonState());check('camera resumes on entering viewport',Math.abs(resumed.camera-70)<.05,resumed.camera);
await normal.close();await browser.close();report.finished=new Date().toISOString();writeFileSync(__taskFile("./4-3-independent-camera-report.json"),JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,failed:report.checks.filter(c=>!c.pass).length,errors:report.errors,shots:report.shots}));process.exitCode=report.checks.some(c=>!c.pass)||report.errors.length?1:0;
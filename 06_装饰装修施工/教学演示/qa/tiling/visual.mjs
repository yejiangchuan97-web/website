import {createRequire} from 'node:module';import {homedir} from 'node:os';import {join,dirname} from 'node:path';import {fileURLToPath} from 'node:url';import {writeFileSync} from 'node:fs';
import {LINE_ENDS} from 'file:///C:/Users/maquefighting/.agents/skills/anatomy/scripts/line-ends.mjs';
const HERE=dirname(fileURLToPath(import.meta.url));const {chromium}=createRequire(import.meta.url)(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--do-not-de-elevate','--allow-file-access-from-files']});const results=[];
try{for(const theme of ['light','dark']){const page=await browser.newPage({viewport:{width:1440,height:810},reducedMotion:'reduce',deviceScaleFactor:1});await page.goto(new URL('../../6-2.html',import.meta.url).href);await page.waitForFunction(()=>window.tilingLab);await page.evaluate(t=>document.body.dataset.theme=t,theme);
for(const [label,phase]of [['vision',null],['approach',0],['contact',1],['lift',2],['target',3],['placed',4],['released',5]]){
 if(phase!==null){await page.locator('[data-tab="vacuum"]').click();await page.locator('#cycleReset').click();for(let i=0;i<phase;i++)await page.locator('#cycleStep').click()}
 const r=await page.evaluate(`(${LINE_ENDS})({show:true})`);results.push({theme,label,ends:r.ends,lines:r.lines,problems:r.problems});console.log(theme+' '+label+' line ends: '+r.problems.length);if(r.problems.length)console.log(r.problems);
 if(label==='vision'||label==='lift'||label==='placed'){await page.locator('#stage').screenshot({path:join(HERE,`lines-${theme}-${label}.png`)});await page.evaluate(()=>document.querySelector('[data-line-ends]')?.remove());
 const box=await page.locator('#stage').boundingBox();await page.screenshot({path:join(HERE,`detail-${theme}-${label}.png`),clip:{x:box.x+box.width*.38,y:box.y+box.height*.35,width:box.width*.32,height:box.height*.5},scale:'css'});
 }else await page.evaluate(()=>document.querySelector('[data-line-ends]')?.remove());
}
await page.close()}
}finally{await browser.close();writeFileSync(join(HERE,'line-results.json'),JSON.stringify(results,null,2))}
if(results.some(r=>r.problems.length))process.exitCode=1;

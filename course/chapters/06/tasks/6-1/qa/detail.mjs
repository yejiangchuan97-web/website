import {fileURLToPath as __taskFileURL} from 'node:url';
const __taskFile=p=>__taskFileURL(new URL(p,import.meta.url));
import {createRequire} from 'node:module';import {homedir} from 'node:os';import {join,dirname} from 'node:path';import {fileURLToPath} from 'node:url';import {writeFileSync} from 'node:fs';import assert from 'node:assert/strict';
import {LINE_ENDS} from 'file:///C:/Users/maquefighting/.agents/skills/anatomy/scripts/line-ends.mjs';
const HERE=__taskFile("."),{chromium}=createRequire(import.meta.url)(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--do-not-de-elevate']});const results=[];
try{const page=await browser.newPage({viewport:{width:1440,height:810},deviceScaleFactor:4,reducedMotion:'reduce'});await page.goto(new URL("../index.html",import.meta.url).href);
for(const theme of ['light','dark']){if(theme==='dark')await page.locator('#theme').click();for(const t of [0,2,3,3.5,4.5,5,6.9]){
 await page.evaluate(t=>window.brickLab.seek(t),t);const lines=await page.evaluate(`(${LINE_ENDS})({show:false})`);results.push({theme,t,problems:lines.problems});assert.equal(lines.problems.length,0,JSON.stringify(lines.problems));
 if(t===0||t===5){const box=await page.locator('[data-name="active.brick"]').boundingBox();await page.screenshot({path:join(HERE,`detail-${theme}-${t}.png`),clip:{x:box.x-30,y:box.y-75,width:box.width+60,height:box.height+130}});}
}await page.locator('#machineScene').screenshot({path:join(HERE,`machine-4x-${theme}.png`)});}
console.log('line ends: 0 in all 14 theme/pose combinations');
}finally{await browser.close();writeFileSync(__taskFile("./line-results.json"),JSON.stringify(results,null,2));}


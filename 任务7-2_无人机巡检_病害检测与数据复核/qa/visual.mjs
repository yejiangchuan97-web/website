import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const out=p=>fileURLToPath(new URL(p,import.meta.url));
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--do-not-de-elevate','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const report={checks:[],screenshots:[]};
try {
 const p=await b.newPage({viewport:{width:1440,height:1080},deviceScaleFactor:4,reducedMotion:'reduce'});
 await p.goto(new URL('../index.html',import.meta.url).href);await p.waitForFunction(()=>uavLab?.ready);
 for(const theme of ['light','dark']){if(theme==='dark')await p.locator('#theme').click();for(const view of ['iso','drone']){await p.locator(`[data-view=${view}]`).click();await p.waitForFunction(()=>!uavLab.scene.stats().animating);await p.locator('#scene').screenshot({path:out(`./${view}-4x-${theme}.png`)});report.screenshots.push(`${view}-4x-${theme}.png`);}}await p.close();
 const q=await b.newPage({viewport:{width:1440,height:1080}});await q.goto(new URL('../index.html',import.meta.url).href);await q.waitForFunction(()=>uavLab?.ready);await q.locator('#preview-route').click();const first=await q.evaluate(()=>uavLab.snapshot());await q.waitForFunction(()=>uavLab.snapshot().selected==='A2');const moved=await q.evaluate(()=>uavLab.snapshot());assert.notDeepEqual(first.scene.validation.cameraOrigin,moved.scene.validation.cameraOrigin);assert.equal(moved.routePlaying,true);await q.locator('#scene').screenshot({path:out('./route-motion.png')});report.screenshots.push('route-motion.png');await q.locator('#preview-route').click();await q.waitForFunction(()=>!uavLab.scene.stats().animating);report.checks.push('route changes actual world position and stops');
 await q.locator('#scene').focus();const before=await q.evaluate(()=>uavLab.scene.stats().view);await q.keyboard.press('ArrowLeft');assert.notEqual(await q.evaluate(()=>uavLab.scene.stats().view),before);await q.keyboard.press('Home');assert.equal(await q.evaluate(()=>uavLab.scene.stats().view),'iso');report.checks.push('host keyboard orbit and Home reset');
 await q.locator('#preview-route').click();await q.setViewportSize({width:1440,height:600});await q.locator('footer').scrollIntoViewIfNeeded();await q.waitForFunction(()=>!uavLab.scene.stats().visible);assert.equal(await q.evaluate(()=>uavLab.scene.stats().animating),false);report.checks.push('offscreen scene stops frames');await q.close();
 report.status='passed';
}finally{await b.close();writeFileSync(out('./visual-verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}

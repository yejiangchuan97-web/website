import {fileURLToPath as __taskFileURL} from 'node:url';
const __taskFile=p=>__taskFileURL(new URL(p,import.meta.url));
import {createRequire} from 'node:module';import {homedir} from 'node:os';import {join,dirname} from 'node:path';import {fileURLToPath} from 'node:url';
const HERE=__taskFile(".");const {chromium}=createRequire(import.meta.url)(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--do-not-de-elevate','--allow-file-access-from-files']});
try{for(const theme of ['light','dark']){const page=await browser.newPage({viewport:{width:1440,height:810},deviceScaleFactor:4,reducedMotion:'reduce'});await page.goto(new URL("../index.html",import.meta.url).href);await page.waitForFunction(()=>window.tilingLab);await page.evaluate(t=>document.body.dataset.theme=t,theme);const box=await page.locator('#stage').boundingBox();
await page.screenshot({path:join(HERE,`4x-${theme}-machine.png`),clip:{x:box.x+300,y:box.y+5,width:415,height:350}});
await page.locator('[data-tab="vacuum"]').click();await page.locator('#cycleStep').click();await page.locator('#cycleStep').click();await page.screenshot({path:join(HERE,`4x-${theme}-head.png`),clip:{x:box.x+300,y:box.y+70,width:245,height:175}});
await page.close()}}finally{await browser.close()}

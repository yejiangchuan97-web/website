import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try {
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.goto(new URL('../../index.html',import.meta.url).href);
 await page.waitForSelector('[data-ready="true"]');
 await page.locator('[data-tab="robot"]').click();
 await page.locator('#fullscreen').click();
 await page.waitForFunction(()=>document.fullscreenElement);
 await page.waitForTimeout(250);
 const result=await page.evaluate(()=>({fullscreen:!!document.fullscreenElement,height:innerHeight,stage:document.getElementById('stage').getBoundingClientRect().toJSON(),card:document.querySelector('.visual-card').getBoundingClientRect().toJSON(),scroll:document.documentElement.scrollWidth,width:innerWidth}));
 assert(result.stage.height>300);
 assert(result.card.bottom<=result.height+2);
 assert(result.scroll<=result.width+1);
 await page.screenshot({path:fileURLToPath(new URL('./fullscreen.png',import.meta.url))});
 await page.locator('#fullscreen').click();
 await page.waitForFunction(()=>!document.fullscreenElement);
 console.log(JSON.stringify(result,null,2));
} finally {await browser.close();}

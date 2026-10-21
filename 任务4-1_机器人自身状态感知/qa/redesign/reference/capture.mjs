import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const {chromium}=createRequire(import.meta.url)(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--do-not-de-elevate','--allow-file-access-from-files']});
const out=new URL(".",import.meta.url);
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file:///C:/Users/maquefighting/Downloads/diesel.html');
 await page.waitForTimeout(4000);
 await page.screenshot({path:fileURLToPath(new URL('desktop-default.png',out)),fullPage:true});
 await page.locator('#lightTheme').click();
 await page.waitForTimeout(800);
 await page.screenshot({path:fileURLToPath(new URL('desktop-light.png',out)),fullPage:true});
 await page.locator('#explodeBtn').click();
 await page.waitForTimeout(2200);
 await page.screenshot({path:fileURLToPath(new URL('desktop-exploded.png',out)),fullPage:true});
 const model=await page.evaluate(()=>({title:document.title,viewport:(()=>{const r=document.querySelector('#viewport').getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}})(),controls:(()=>{const r=document.querySelector('.controls').getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}})(),buttons:[...document.querySelectorAll('button')].map(x=>x.textContent.trim()).filter(Boolean),overflow:document.documentElement.scrollWidth>innerWidth}));
 await page.setViewportSize({width:390,height:844});
 await page.locator('#explodeBtn').click();
 await page.waitForTimeout(2200);
 await page.screenshot({path:fileURLToPath(new URL('phone-light.png',out)),fullPage:true});
 console.log(JSON.stringify({errors,model,phone:await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight}))},null,2));
}finally{await browser.close()}


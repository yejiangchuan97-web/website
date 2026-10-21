import {fileURLToPath as __taskFileURL} from 'node:url';
const __taskFile=p=>__taskFileURL(new URL(p,import.meta.url));
import{createRequire}from'node:module';import{homedir}from'node:os';import{dirname,join}from'node:path';import{fileURLToPath}from'node:url';import{mkdir,writeFile}from'node:fs/promises';
const HERE=__taskFile("."),OUT=__taskFile("./visual-review");await mkdir(OUT,{recursive:true});const{chromium}=createRequire(import.meta.url)(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--do-not-de-elevate','--allow-file-access-from-files','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});const logs=[];
try{
 for(const width of[1440,390]){
  const page=await browser.newPage({viewport:{width,height:1100},isMobile:width===390,hasTouch:width===390}),log={width,errors:[]};
  page.on('pageerror',e=>log.errors.push(e.message));await page.goto(new URL("../index.html",import.meta.url).href);await page.waitForFunction(()=>!!window.__REBAR__);await page.waitForTimeout(900);await page.screenshot({path:join(OUT,'overview-'+width+'.png'),fullPage:true});
  if(width===1440){
   for(const[mode,choice]of[['process','bend'],['surface',null],['errors','angle']]){
    await page.locator('[data-mode="'+mode+'"]').click();if(choice)await page.locator('[data-'+(mode==='process'?'machine':'error')+'="'+choice+'"]').click();
    if(mode==='process')await page.locator('#progressRange').evaluate(el=>{el.value='1';el.dispatchEvent(new Event('input',{bubbles:true}))});
    await page.waitForTimeout(1600);await page.screenshot({path:join(OUT,mode+'-'+width+'.png'),fullPage:true});
   }
  }
  log.layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));log.scene=await page.evaluate(()=>({parts:__REBAR__.snapshot().scene.totalParts,drawCalls:__REBAR__.snapshot().scene.drawCalls,triangles:__REBAR__.snapshot().scene.triangles}));logs.push(log);await page.close();
 }
}finally{await browser.close()}
await writeFile(__taskFile("./visual-review/report.json"),JSON.stringify(logs,null,2));console.log(JSON.stringify(logs,null,2));

import{createRequire}from'node:module';import{join}from'node:path';import{homedir}from'node:os';import{writeFileSync}from'node:fs';
const require=createRequire(import.meta.url);const{chromium}=require(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--do-not-de-elevate','--allow-file-access-from-files','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:1024},deviceScaleFactor:1});let errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('file:///'+join(process.cwd(),'04_感知与识别/教学演示/4-1.html').replaceAll('\\','/'));await page.waitForTimeout(2200);await page.screenshot({path:join(import.meta.dirname,'desktop-v2.png'),fullPage:true});
console.log(JSON.stringify({errors,snapshot:await page.evaluate(()=>window.__SENSE__?.snapshot()),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)}));
await page.setViewportSize({width:390,height:844});await page.waitForTimeout(1000);await page.screenshot({path:join(import.meta.dirname,'phone-v2.png'),fullPage:true});await browser.close();

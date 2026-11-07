import {fileURLToPath as __taskFileURL} from 'node:url';
const __taskFile=p=>__taskFileURL(new URL(p,import.meta.url));
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {writeFileSync} from 'node:fs';
import {LINE_ENDS} from "./anatomy-line-ends.mjs";
const HERE=__taskFile(".");
const {chromium}=createRequire(import.meta.url)(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--do-not-de-elevate','--allow-file-access-from-files']});
const report=[];
try{const page=await browser.newPage({viewport:{width:1440,height:810},reducedMotion:'reduce'});await page.goto(new URL("../index.html",import.meta.url).href);
for(const theme of ['light','dark'])for(const progress of [0,25,380,999]){await page.evaluate(t=>document.body.dataset.theme=t,theme);await page.locator('#progress').fill(String(progress));await page.locator('#progress').dispatchEvent('input');const result=await page.evaluate('('+LINE_ENDS+')({select:"#scene",show:true})');report.push({theme,progress,...result});console.log('line ends: '+result.problems.length+' · '+theme+' '+progress);if(result.problems.length)console.log(JSON.stringify(result.problems));await page.screenshot({path:join(HERE,`lines-${theme}-${progress}.png`)});await page.evaluate(()=>document.querySelectorAll('[data-line-ends]').forEach(el=>el.remove()));}
}finally{await browser.close();writeFileSync(__taskFile("./line-results.json"),JSON.stringify(report,null,2));}
if(report.some(r=>r.problems.length))process.exitCode=1;

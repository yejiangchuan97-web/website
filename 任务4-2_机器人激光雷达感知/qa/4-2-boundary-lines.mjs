import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
const {chromium}=createRequire(import.meta.url)(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const {LINE_ENDS}=await import(pathToFileURL(join(homedir(),'.agents/skills/anatomy/scripts/line-ends.mjs')));
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--do-not-de-elevate','--allow-file-access-from-files']});
const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
const errors=[],results=[];
page.on('pageerror',error=>errors.push(error.stack||error.message));
try{
 await page.goto(new URL("../index.html",import.meta.url).href);
 for(const angle of[0,9]){
  await page.locator('#beam-angle').evaluate((input,value)=>{input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));},angle);
  const result=await page.evaluate(`(${LINE_ENDS})(${JSON.stringify({select:'.iso-plate',show:false})})`);
  results.push({angle,...result});
  console.log(angle+'° line ends: '+result.problems.length+' of '+result.ends);
  if(result.problems.length){await page.evaluate(`(${LINE_ENDS})(${JSON.stringify({select:'.iso-plate',show:true})})`);await page.locator('.iso-plate').screenshot({path:fileURLToPath(new URL('4-2-boundary-'+angle+'-failure.png',import.meta.url))});}
 }
 writeFileSync(new URL("./4-2-boundary-lines.json",import.meta.url),JSON.stringify({errors,results},null,2));
 console.log('console errors: '+errors.length);
 process.exitCode=errors.length||results.some(r=>r.problems.length)?1:0;
}finally{await browser.close()}

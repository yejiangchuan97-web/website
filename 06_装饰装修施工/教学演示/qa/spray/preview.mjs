import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const HERE=dirname(fileURLToPath(import.meta.url));
const {chromium}=createRequire(import.meta.url)(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--do-not-de-elevate','--allow-file-access-from-files']});
const page=await browser.newPage({viewport:{width:1440,height:810},reducedMotion:'reduce'});page.on('pageerror',e=>console.log(e.message));await page.goto(new URL('../../6-4.html',import.meta.url).href);await page.waitForTimeout(700);await page.screenshot({path:join(HERE,'preview.png')});console.log(await page.evaluate(()=>({state:window.sprayLab?.snapshot(),height:document.querySelector('.controls').scrollHeight})));await browser.close();

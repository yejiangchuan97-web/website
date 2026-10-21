import {fileURLToPath as __taskFileURL} from 'node:url';
const __taskFile=p=>__taskFileURL(new URL(p,import.meta.url));
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const HERE=__taskFile(".");
const {chromium}=createRequire(import.meta.url)(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--do-not-de-elevate','--allow-file-access-from-files']});
const page=await browser.newPage({viewport:{width:1440,height:1340}});await page.goto(new URL("../index.html",import.meta.url).href);
const groups={themes:['coverage-light','coverage-dark','opening-light','opening-dark','dose-light','dose-dark'],interactions:['gap-example','window-center','window-protected','dose-compensated','nozzle-closeup','phone-controls'],lines:['lines-light-0','lines-light-25','lines-light-380','lines-light-999','lines-dark-0','lines-dark-25','lines-dark-380','lines-dark-999']};
for(const [name,files] of Object.entries(groups)){await page.setViewportSize({width:1440,height:Math.ceil(files.length/2)*425});await page.setContent('<body style="margin:0;background:#bbc8d5;display:grid;grid-template-columns:1fr 1fr;gap:8px;font:14px sans-serif">'+files.map(n=>`<section style="height:417px;display:grid;grid-template-rows:22px 390px;background:white"><b>${n}</b><img style="width:100%;height:390px;object-fit:contain" src="${pathToFileURL(join(HERE,n+'.png')).href}"></section>`).join('')+'</body>');await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));await page.screenshot({path:join(HERE,'review-'+name+'.png')});}
await browser.close();

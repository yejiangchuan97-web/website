import {fileURLToPath as __taskFileURL} from 'node:url';
const __taskFile=p=>__taskFileURL(new URL(p,import.meta.url));
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--do-not-de-elevate','--allow-file-access-from-files']});
const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{await page.goto(new URL("../../../任务4-1_机器人自身状态感知/index.html",import.meta.url).href);await page.locator('[data-view="csv"]').click();let csv='Time (s),x,y,z\n';for(let i=0;i<100000;i++)csv+=`${(i/1000).toFixed(3)},${i===50000?1000:Math.sin(i*.03).toFixed(4)},0,9.8\n`;await page.locator('#csv-file').setInputFiles({name:'qa-100000-row-synthetic.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});await page.locator('#apply-csv').click();const result=await page.evaluate(()=>({state:lessonState(),d:[...document.querySelectorAll('#signal-chart .chart-path')].map(p=>p.getAttribute('d')),message:document.querySelector('#csv-error').textContent}));assert.equal(result.state.imported.rows,100000);assert.equal(result.d.length,3);assert.ok(result.d[0].includes('16.00'));assert.ok(result.d.every(d=>(d.match(/[ML]/g)||[]).length<=2000));assert.deepEqual(errors,[]);await page.locator('#signal-chart').screenshot({path:__taskFile("../../../任务4-1_机器人自身状态感知/qa/4-1-large-csv.png")});writeFileSync(new URL("./import-stress.json",import.meta.url),JSON.stringify({rows:100000,threeAxes:true,peakPreserved:true,plottedPoints:result.d.map(d=>(d.match(/[ML]/g)||[]).length),errors,passed:true},null,2));console.log('100000-row three-axis import passed; peak retained; graph capped at 2000 points per axis')}finally{await browser.close()}

import {spawn} from 'node:child_process';
import {mkdirSync,mkdtempSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,basename} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const HERE=fileURLToPath(new URL('./',import.meta.url)),shots=join(HERE,'shots');mkdirSync(shots,{recursive:true});
const binary=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const profile=mkdtempSync(join(tmpdir(),'tcp-workshop-'));
const chrome=spawn(binary,['--headless=new','--no-first-run','--remote-debugging-port=0','--enable-unsafe-swiftshader','--ignore-gpu-blocklist',`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe'],windowsHide:true});
let ws,id=0;const pending=new Map(),errors=[],checks=[];const delay=t=>new Promise(r=>setTimeout(r,t));
function record(name,detail){checks.push({name,passed:true,detail});console.log('PASS',name,detail?JSON.stringify(detail):'');}
try{
 const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Chrome startup timeout')),20000);chrome.stderr.on('data',d=>{const match=String(d).match(/DevTools listening on ws:\/\/[^:]+:(\d+)\//);if(match){clearTimeout(timer);resolve(+match[1]);}});chrome.on('error',reject);});
 const target=(await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t=>t.type==='page');
 ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);};
 const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id,timer=setTimeout(()=>reject(Error('CDP timeout '+method)),30000);pending.set(n,{resolve,reject,timer});ws.send(JSON.stringify({id:n,method,params}));});
 const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
 const until=async(expression,timeout=10000)=>{const end=Date.now()+timeout;while(Date.now()<end){if(await evaluate(expression))return;await delay(60);}throw Error('Timeout '+expression+'\n'+JSON.stringify(await evaluate('window.toolLab?.getState()')));};
 const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
 const state=()=>evaluate('toolLab.getState()');
 const snap=async name=>{await delay(150);const r=await call('Page.captureScreenshot',{format:'png'});writeFileSync(join(shots,name+'.png'),Buffer.from(r.data,'base64'));};
 const size=(width,height,mobile=false)=>call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
 await call('Runtime.enable');await call('Page.enable');await size(1440,960);
 await call('Page.navigate',{url:pathToFileURL(fileURLToPath(new URL('../index.html',import.meta.url))).href});await until('!!window.toolLab');
 assert(await evaluate('toolLab.diagnostics().webgl'));assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));await snap('desktop-light');record('offline single file opens, no horizontal overflow');
 for(const tool of ['gripper','vacuum','tie','grind','drill','nozzle']){
  await click(`[data-tool="${tool}"]`);await until('toolLab.getState().swapLift===0');
  const r=await evaluate('(()=>{const d=toolLab.diagnostics();return RobotModel.norm(RobotModel.sub(d.renderedTCP,d.metrics.f.p))})()');assert(r<1e-8);record('rendered TCP matches model: '+tool,r);
 }
 await click('[data-tab="pivot"]');
 for(const mode of ['flange','tcp']){
  await click(`[data-pivot="${mode}"]`);await evaluate('toolLab.setPivotAngle(22)');await until('Math.abs(toolLab.getState().angle-22)<.02');
  const r=await evaluate('(()=>{const m=toolLab.diagnostics().metrics;return {tip:m.tipTravel,flange:m.flangeTravel}})()');assert(r[mode==='tcp'?'tip':'flange']<.1);assert(r[mode==='tcp'?'flange':'tip']>60);await snap('pivot-'+mode);record('pivot around '+mode,r);
 }
 await click('#toolCloseup');await until('toolLab.view.centre.distanceTo(new THREE.Vector3(...RobotModel.mul(RobotModel.add(RobotModel.fk(toolLab.getState().q,toolLab.getState().tool).flange,RobotModel.fk(toolLab.getState().q,toolLab.getState().tool).p),.5)))<.1');await snap('tool-close-light');
 await click('#theme');await snap('tool-close-dark');await click('#theme');
 await click('[data-tool="gripper"]');await until('toolLab.getState().swapLift===0');await evaluate("toolLab.applyParameter('nozzle');toolLab.setPivotAngle(20)");await until('Math.abs(toolLab.getState().angle-20)<.02');
 let r=await evaluate('(()=>{const m=toolLab.diagnostics().metrics;return {tip:m.tipTravel,error:m.parameterError}})()');assert(r.tip>15&&r.error>63);await snap('wrong-tcp');record('wrong parameter moves the true tip while selected point holds',r);
 await click('#correctParam');await until('Math.abs(toolLab.getState().angle-20)<.02');assert((await evaluate('toolLab.diagnostics().metrics.tipTravel'))<.1);
 await click('[data-tool="drill"]');await click('[data-tab="calibrate"]');
 for(let i=0;i<4;i++){await until('!toolLab.getState().moving');await click('#align');await until('!toolLab.getState().moving');await click('#capture');}
 await click('#solve');assert((await state()).result.maxResidual<.5);await click('#validate');await until('!toolLab.getState().moving');r=(await state()).validation;assert(r.passed);assert(await evaluate("document.querySelector('#capture').disabled"));assert.equal(await evaluate('toolLab.capture()'),false);assert.equal((await state()).samples.length,4);await snap('calibration-close');record('four-point position fit and independent fifth pose',r);
 await evaluate("window.__download=null;const old=URL.createObjectURL;URL.createObjectURL=b=>{window.__download=b;return old(b)}");await click('#export');const data=JSON.parse(await evaluate('window.__download.text()'));assert(data.exerciseValid&&data.positionOnly&&data.records.length===4&&data.heldOutValidation.heldOut);record('download contains actual four flange poses and held-out validation');
 await click('#badRepeat');assert.equal((await state()).result,null);assert((await evaluate("document.querySelector('#calResult').textContent")).includes('姿态'));await click('#badPoint');assert((await state()).result.maxResidual>.5);assert(await evaluate("document.querySelector('#validate').disabled"));assert(await evaluate("document.querySelector('#export').disabled"));record('duplicate poses and a wrong reference point are rejected');
 await click('[data-tab="challenge"]');await click('#startChallenge');await click('[data-answer="speed"]');assert(await evaluate("document.querySelector('#repairChallenge').disabled"));await click('[data-answer="tcp"]');await click('#repairChallenge');await until("toolLab.getState().challenge==='passed'");await snap('challenge-passed');record('challenge needs correct decision, parameter repair and successful new pose');
 await click('#retryChallenge');await click('[data-answer="tcp"]');await click('#repairChallenge');await click('#stop');assert.equal((await state()).challenge,'idle');await click('#startChallenge');assert.equal((await state()).challenge,'fault');record('stop during verification leaves challenge restartable');
 await click('[data-tab="tools"]');await click('[data-tool="vacuum"]');await until('toolLab.getState().swapLift===0');await click('#actuate');assert.equal((await state()).contact,false);assert(await evaluate("document.querySelector('#toolActionNote').textContent.includes('不等于')"));await click('#contact');assert.equal((await state()).contact,true);await click('#stop');assert.equal((await state()).active,false);record('vacuum command and actual material contact are separate');
 await click('#home');await click('#applyTool');await click('#theme');await snap('desktop-dark');await click('#theme');
 await size(1366,768);await snap('laptop');assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));record('1366 x 768 layout');
 await size(390,844,true);await evaluate('scrollTo(0,0)');await snap('mobile');assert(await evaluate('document.documentElement.scrollWidth<=390'));record('390 px layout has no horizontal overflow');
 await click('[data-tab="calibrate"]');await evaluate("scrollTo(0,document.querySelector('.control-panel').getBoundingClientRect().top+scrollY-300)");await until("document.querySelector('.stage').classList.contains('mobile-pinned')");await click('#align');await until('!toolLab.getState().moving');assert((await evaluate('toolLab.diagnostics().metrics.pinError'))<.5);await snap('mobile-controls');record('mobile controls keep a live docked robot visible during calibration');
 await size(1440,960);await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await call('Page.reload');await until('!!window.toolLab');await click('[data-tab="pivot"]');await click('#playPivot');assert.equal((await state()).playing,false);assert.equal(Math.abs((await state()).angle),20);await snap('reduced-motion');record('reduced motion uses discrete poses');
 await click('[data-tab="tools"]');await delay(300);const before=(await state()).paintCount;await delay(350);assert.equal((await state()).paintCount,before);record('settled scene stops its animation loop');
 await call('Page.addScriptToEvaluateOnNewDocument',{source:"const old=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return /webgl/i.test(t)?null:old.call(this,t,...a)}"});await call('Page.reload');await until('!!window.toolLab',20000);assert.equal(await evaluate('toolLab.diagnostics().webgl'),false);assert((await evaluate("document.querySelectorAll('#fallback svg path').length"))>1000);await click('[data-tool="drill"]');assert.equal((await state()).tool,'drill');await snap('no-webgl');record('no WebGL uses the same geometry as an offline SVG fallback');
 assert.equal(errors.length,0,JSON.stringify(errors));record('no uncaught browser errors');
 writeFileSync(join(HERE,'verification.json'),JSON.stringify({checkedAt:new Date().toISOString(),checks,exceptions:errors},null,2));
 console.log('Finished',checks.length,'checks');
}catch(e){writeFileSync(join(HERE,'verification-failure.json'),JSON.stringify({checks,errors,error:String(e.stack)},null,2));throw e;}
finally{if(ws)ws.close();chrome.kill();await delay(300);const full=resolve(profile),temp=resolve(tmpdir());if(full.startsWith(temp+'\\')&&basename(full).startsWith('tcp-workshop-')){try{rmSync(full,{recursive:true,force:true});}catch{}}}

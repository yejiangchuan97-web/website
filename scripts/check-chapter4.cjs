/* Check navigation and retained interactions in the repo or offline Chapter 4 site. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL,fileURLToPath}=require('node:url');
const args=process.argv.slice(2),arg=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const packaged=args.includes('--packaged'),root=path.resolve(arg('--site',path.join(__dirname,'..'))),shots=arg('--screenshots',null);
const routes=packaged?{entry:'index.html',state:'lessons/state.html',lidar:'lessons/lidar.html',vision:'lessons/vision.html'}:{entry:'第四章_感知与智能识别/index.html',state:'任务4-1_机器人自身状态感知/index.html',lidar:'任务4-2_机器人激光雷达感知/index.html',vision:'任务4-3_标注安全帽并应用YOLO模型/index.html'};
const url=name=>pathToFileURL(path.join(root,routes[name])).href;
(async()=>{const browser=await chromium.launch({headless:true,channel:process.env.CHAPTER4_BROWSER||undefined});const checks=[],errors=[],external=[];
try{const page=await browser.newPage({viewport:{width:1600,height:900}});
 page.on('pageerror',e=>errors.push({url:page.url(),message:e.message}));page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url());});
 await page.goto(url('entry'));await page.waitForFunction(()=>window.ChapterEntry);
 assert.equal(await page.locator('.task-card').count(),3);assert.equal(await page.locator('.task-links a').count(),5);assert.equal(await page.evaluate(()=>ChapterEntry.state().models.models),3);
 for(const id of ['4-1','4-2','4-3']){await page.locator(`[data-task="${id}"] .task-select`).click();assert.equal(await page.evaluate(()=>ChapterEntry.state().selected),id);}
 await page.locator('#overview').click();await page.locator('#motion').click();assert(await page.evaluate(()=>ChapterEntry.state().paused));await page.locator('#motion').click();
 await page.locator('#tour').click();const first=await page.evaluate(()=>ChapterEntry.state().selected);await page.waitForFunction(first=>ChapterEntry.state().selected!==first,first,{timeout:6500});await page.locator('#tour').click();await page.locator('#overview').click();
 if(shots){fs.mkdirSync(shots,{recursive:true});await page.screenshot({path:path.join(shots,'第四章入口预览.png')});}
 await page.locator('#show-guide').click();assert(await page.locator('#entry-guide').evaluate(e=>e.open));await page.locator('#close-guide').click();
 await page.locator('#show-summary').click();assert.equal(await page.locator('.summary-links a').count(),5);if(shots)await page.screenshot({path:path.join(shots,'第四章总结预览.png')});await page.locator('#close-summary').click();
 const links=await page.locator('.task-links a').evaluateAll(els=>els.map(e=>e.href));
 checks.push('entrance: 3 models, 3 cards, 5 links, selection, tour, pause, guide and summary');
 for(let i=0;i<links.length;i++){
   // Navigate through each real entrance link, including all vision hash routes.
   await page.goto(url('entry'));await page.locator('.task-links a').nth(i).click();
   await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
   assert.equal(page.url(),links[i]);assert.equal(await page.locator('.c4-links a').count(),5);
   assert.equal(await page.locator('.c4-links [aria-current]').count(),1);
   for(const link of await page.locator('.c4-nav a').evaluateAll(es=>es.map(e=>e.href)))assert(fs.existsSync(fileURLToPath(link.split('#')[0])),link);
   if(i>=2){const key=['annotation','predict','evaluate'][i-2];const frame=page.frameLocator('#frame-'+key);await frame.locator('body').waitFor();assert.equal(await frame.locator('html').getAttribute('data-theme'),'dark');assert(!(await page.locator('#frame-'+key).isHidden()));}
   await page.locator('#c4-theme').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
   if(i>=2){const key=['annotation','predict','evaluate'][i-2];assert.equal(await page.frameLocator('#frame-'+key).locator('html').getAttribute('data-theme'),'light');}
   await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
   await page.locator('.c4-home').click();assert.equal(page.url(),url('entry'));
 }
 checks.push('5 entrance routes, shared navigation, return links and default dark after reload');
 await page.goto(url('state'));await page.waitForFunction(()=>window.__STATE_LAB__);
 for(const id of ['slope','drive','bump','turn']){await page.locator(`[data-case="${id}"]`).click();assert.equal(await page.evaluate(()=>__STATE_LAB__.snapshot().state.case),id);}
 await page.locator('#captureButton').click();assert.equal(await page.evaluate(()=>__STATE_LAB__.snapshot().records.length),1);
 await page.locator('#csvOpen').click();assert(await page.locator('#csvDialog').evaluate(e=>e.open));await page.locator('[data-close="csvDialog"]').click();
 if(shots)await page.screenshot({path:path.join(shots,'第四章状态实验.png')});
 checks.push('state: four cases, observation capture and CSV dialog');
 await page.goto(url('lidar'));await page.waitForFunction(()=>window.__LIDAR__);
 for(const id of ['beam','density','occlusion','evidence']){await page.locator(`[data-experiment="${id}"]`).click();assert.equal(await page.evaluate(()=>__LIDAR__.snapshot().state.experiment),id);}
 await page.evaluate(()=>__LIDAR__.setState({experiment:'density',step:10,channels:1}));const coarse=await page.evaluate(()=>__LIDAR__.snapshot().frame.returned);
 await page.evaluate(()=>__LIDAR__.setState({step:1,channels:16}));assert((await page.evaluate(()=>__LIDAR__.snapshot().frame.returned))>coarse);
 await page.evaluate(()=>__LIDAR__.capture());assert.equal(await page.evaluate(()=>__LIDAR__.snapshot().records.length),1);
 checks.push('lidar: four experiments, changed sampling and saved evidence');
 await page.goto(url('vision')+'#annotation');let annotation=page.frames().find(f=>f.name()==='frame-annotation');await page.frameLocator('#frame-annotation').locator('#annotationSvg').waitFor();annotation=page.frames().find(f=>f.name()==='frame-annotation');
 const before=await annotation.evaluate(()=>helmetAnnotationState());assert(before.boxes.length>0);
 await annotation.locator('#x1').fill('165');await annotation.locator('#x1').dispatchEvent('change');const edited=await annotation.evaluate(()=>helmetAnnotationState());assert.equal(edited.boxes[0].bbox[0],165);
 await page.locator('#tab-predict').click();const predict=()=>page.frameLocator('#frame-predict');await predict().locator('#prediction-threshold').waitFor();
 assert.equal(await page.locator('.c4-links [aria-current]').getAttribute('data-route'),'predict');
 await predict().locator('#prediction-threshold').fill('0.75');await predict().locator('#prediction-threshold').dispatchEvent('input');
 const pframe=page.frames().find(f=>f.name()==='frame-predict');assert.equal(await pframe.evaluate(()=>helmetPredictionState().threshold),.75);
 await page.locator('#tab-evaluate').click();await page.frameLocator('#frame-evaluate').locator('#evaluation-threshold').waitFor();
 const eframe=page.frames().find(f=>f.name()==='frame-evaluate');assert(await eframe.evaluate(()=>!!helmetEvaluationState()));
 await page.frameLocator('#frame-evaluate').locator('#evaluation-threshold').fill('0.6');await page.frameLocator('#frame-evaluate').locator('#evaluation-threshold').dispatchEvent('input');
 await page.locator('#tab-annotation').click();assert.equal((await annotation.evaluate(()=>helmetAnnotationState())).boxes[0].bbox[0],165);
 await page.locator('#tab-predict').click();assert.equal(await pframe.evaluate(()=>helmetPredictionState().threshold),.75);
 if(shots)await page.screenshot({path:path.join(shots,'第四章视觉实验.png')});
 checks.push('vision: annotation edit retained across tabs; prediction threshold and evaluation work');
 for(const viewport of [{width:1366,height:768},{width:1920,height:1080},{width:390,height:844}]){await page.setViewportSize(viewport);for(const name of Object.keys(routes)){await page.goto(url(name));await page.waitForFunction(name=>name==='entry'?window.ChapterEntry:document.querySelector('.c4-nav'),name);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),name+' horizontal overflow');assert((await page.locator(name==='entry'?'#entry-screen':'.c4-nav').boundingBox()).y>=-1);}}
 checks.push('1366, 1920 and mobile viewport: no document overflow; navigation visible');
 await page.setViewportSize({width:1600,height:900});await page.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=function(){return null;};});await page.goto(url('entry'));await page.waitForFunction(()=>window.ChapterEntry);assert(await page.locator('#fallback').isVisible());assert.equal(await page.locator('.task-links a').count(),5);
 checks.push('WebGL fallback retains all experiment links');assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log(JSON.stringify({passed:checks,errors,external},null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

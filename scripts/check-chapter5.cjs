/* Integration checks for Chapter 5; requires Playwright and Chromium. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL,fileURLToPath}=require('node:url');
const args=process.argv.slice(2),arg=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const packaged=args.includes('--packaged'),root=path.resolve(arg('--site',path.join(__dirname,'..'))),shots=arg('--screenshots',null);
const routes=packaged?{entry:'index.html',rebar:'lessons/rebar.html',tying:'lessons/tying.html',concrete:'lessons/concrete.html'}:{entry:'第五章_主体结构施工/index.html',rebar:'任务5-1_钢筋加工机械与绑扎作业面识读/index.html',tying:'任务5-2_钢筋绑扎机器人操作与人工复核/index.html',concrete:'任务5-3_混凝土泵送布料与整平抹光机器人/index.html'};
const url=name=>pathToFileURL(path.join(root,routes[name])).href;
(async()=>{const browser=await chromium.launch({headless:true,channel:process.env.CHAPTER5_BROWSER||undefined}),checks=[],errors=[],external=[];
try{const page=await browser.newPage({viewport:{width:1600,height:900},reducedMotion:'reduce'});page.setDefaultTimeout(15000);
 page.on('pageerror',e=>errors.push({url:page.url(),message:e.message}));page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url());});
 async function ready(name){await page.waitForFunction(name=>name==='entry'?window.ChapterEntry:name==='rebar'?window.__REBAR_GAME__:name==='tying'?window.__TYING_HERO__:window.ConcreteGuide,name);}
 async function shot(name){if(shots){fs.mkdirSync(shots,{recursive:true});await page.screenshot({path:path.join(shots,name+'.png')});}}
 await page.goto(url('entry'));await ready('entry');assert.equal(await page.locator('.task-card').count(),3);assert.equal(await page.locator('.task-links a').count(),3);assert.equal(await page.evaluate(()=>ChapterEntry.state().models.models),3);
 for(const id of ['5-1','5-2','5-3']){await page.locator(`[data-task="${id}"] .task-select`).click();assert.equal(await page.evaluate(()=>ChapterEntry.state().selected),id);}
 await page.locator('#overview').click();await page.locator('#motion').click();assert(!(await page.evaluate(()=>ChapterEntry.state().paused)));await page.locator('#motion').click();
 await shot('第五章入口预览');await page.locator('#show-guide').click();assert(await page.locator('#entry-guide').evaluate(e=>e.open));await page.locator('#close-guide').click();
 await page.locator('#show-summary').click();assert.equal(await page.locator('.summary-links a').count(),3);await shot('第五章总结预览');await page.locator('#close-summary').click();
 await page.locator('#tour').click();const first=await page.evaluate(()=>ChapterEntry.state().selected);await page.waitForFunction(first=>ChapterEntry.state().selected!==first,first,{timeout:6500});await page.locator('#tour').click();
 checks.push('entrance: 3 models, 3 correct task links, guide, summary, selection, pause and tour');
 for(const[name,i]of [['rebar',0],['tying',1],['concrete',2]]){
   await page.goto(url('entry'));await page.locator('.task-links a').nth(i).click();await ready(name);
   assert.equal(page.url(),url(name));assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');assert.equal(await page.locator('.c5-links [aria-current]').getAttribute('data-route'),name);
   for(const link of await page.locator('.c5-nav a').evaluateAll(es=>es.map(e=>e.href)))assert(fs.existsSync(fileURLToPath(link.split('#')[0])),link);
   await page.locator('#c5-theme').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'light');await page.reload();await ready(name);assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
   await page.locator('.c5-home').click();assert.equal(page.url(),url('entry'));
 }
 checks.push('shared navigation, return links, theme switching and default dark after reload');
 await page.goto(url('rebar'));await ready('rebar');await shot('第五章加工课堂');
 // Replay the existing task-owned game regression, preserving all original gates.
 const actions=JSON.parse(fs.readFileSync(path.join(__dirname,'../任务5-1_钢筋加工机械与绑扎作业面识读/qa/game-actions.json'),'utf8'));
 for(const[type,value,timeout]of actions){
   if(type==='eval')await page.evaluate(value);
   else if(type==='click'){const target=page.locator(value);if(await target.getAttribute('aria-disabled')==='true')await target.evaluate(e=>e.click());else await target.click();}
   else if(type==='until')await page.waitForFunction(value,null,{timeout:timeout||15000});
   else if(type==='scroll')await page.locator(value).scrollIntoViewIfNeeded();
   else if(type==='wait')await page.waitForTimeout(value);
   else if(type==='shot'&&value.endsWith('04-inspection.png'))await shot('第五章钢筋检查台');
 }
 assert.equal(await page.evaluate(()=>__REBAR_GAME__.snapshot().state.stock),0);
 checks.push('rebar: existing full regression passes, including 3 machines, site cleanup, 4 inspection tools, zones, export and restart');
 await page.goto(url('tying'));await ready('tying');await page.waitForFunction(()=>__TYING_HERO__.getDiagnostics().available);await shot('第五章绑扎课堂');
 async function aim(id){await page.locator(`[data-point="${id}"]`).click();await page.waitForFunction(()=>__TYING_HERO__.getDiagnostics().settled);}
 async function tie(id){await aim(id);await page.locator('#tie-trigger').click();await page.waitForFunction(id=>__TYING_HERO__.state.game.points.find(p=>p.id===id).tied,id);}
 async function pull(){await page.locator('#pull').click();await page.waitForFunction(()=>!__TYING_HERO__.state.game.busy);}
 async function repair(){await page.locator('#mark-repair').click();await page.locator('#repair').click();await page.waitForFunction(()=>!__TYING_HERO__.state.game.busy);assert.equal(await page.evaluate(()=>__TYING_HERO__.state.game.isolated),false);await page.locator('#review-safe').click();await pull();}
 for(const id of ['A','B','C','D'])await tie(id);
 await page.locator('#go-review').click();assert(await page.locator('#pull').isDisabled());await page.locator('#review-safe').click();
 for(const id of ['A','B','C','D']){await page.locator(`[data-review="${id}"]`).click();await pull();if(['B','C'].includes(id))await repair();}
 assert.equal(await page.evaluate(()=>__TYING_HERO__.state.game.stage),'done');await page.locator('#complete-study').click();await page.evaluate(()=>__TYING_HERO__.seek(.51));
 await page.locator('#fault-toggle').click();await page.evaluate(()=>__TYING_HERO__.seek(1));assert.equal(await page.evaluate(()=>__TYING_HERO__.state.study.p),.51);assert(await page.locator('#isolate-fault').isDisabled());await page.locator('#mark-fault').click();await page.locator('#isolate-fault').click();await page.locator('#inspect-fault').click();assert(await page.evaluate(()=>__TYING_HERO__.state.study.inspected));
 await page.evaluate(()=>__TYING_HERO__.seek(.3));assert.equal(await page.evaluate(()=>__TYING_HERO__.state.study.isolated),false);
 await page.locator('#theme').click();assert.equal(await page.locator('#c5-theme').textContent(),'切换深色');await page.locator('#c5-theme').click();assert.equal(await page.locator('body').getAttribute('data-theme'),'dark');
 checks.push('tying: 4 ties, isolation, separate review samples, repair and recheck, study and jam sequence');
 await page.goto(url('concrete'));await ready('concrete');assert((await page.locator('.guide-status').textContent()).includes('尚未制作'));for(let i=0;i<6;i++){await page.locator(`[data-process="${i}"]`).click();assert.equal(await page.evaluate(()=>ConcreteGuide.state().selected),i);}assert.equal(await page.locator('.feedback-chain article').count(),4);await page.locator('[data-process="4"]').click();await shot('第五章混凝土工序导读');
 checks.push('concrete: 6 process readings, 4 feedback stages, explicit reading-only status');
 for(const viewport of [{width:1366,height:768},{width:1920,height:1080},{width:390,height:844}]){await page.setViewportSize(viewport);for(const name of Object.keys(routes)){await page.goto(url(name));await ready(name);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),name+' document overflow');if(name!=='entry'){const box=await page.locator('.c5-nav').boundingBox();assert(box.y===0&&box.height>0);assert(await page.evaluate(()=>document.getElementById('c5-content').scrollWidth<=innerWidth+1),name+' content overflow');}if(viewport.width>900&&['rebar','tying'].includes(name)){const box=await page.locator(name==='rebar'?'#game':'.app').boundingBox();assert(box.y>=64&&box.y+box.height<=viewport.height+1,name+' desktop bounds');}}}
 checks.push('1366, 1920 and 390px: navigation visible; desktop labs fit; no horizontal overflow');
 await page.addInitScript(()=>{const getContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:getContext.call(this,type,...args);};});
 for(const name of ['entry','rebar','tying']){await page.goto(url(name));await ready(name);assert(await page.locator('#fallback').isVisible());if(name!=='entry')assert.equal(await page.locator('.c5-links a').count(),3);}
 checks.push('WebGL fallback leaves navigation and learning entries accessible');
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log(JSON.stringify({passed:checks,errors,external},null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

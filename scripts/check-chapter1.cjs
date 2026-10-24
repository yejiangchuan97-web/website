/* Check the Chapter 1 reading/navigation workflow in source or offline package. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL,fileURLToPath}=require('node:url');
const args=process.argv.slice(2),arg=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const packaged=args.includes('--packaged'),root=path.resolve(arg('--site',path.join(__dirname,'..'))),shots=arg('--screenshots',null);
const lessons=packaged?['lessons/construction.html','lessons/machines.html','lessons/robots.html']:[
 '任务1-1_从建造施工到智能建造/index.html',
 '任务1-2_认识施工机械/index.html',
 '任务1-3_认识施工机器人/index.html'];
const entry=pathToFileURL(path.join(root,packaged?'index.html':'第一章_走进智能建造/index.html')).href;
const url=i=>pathToFileURL(path.join(root,lessons[i])).href;
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.CHAPTER1_BROWSER||undefined});
 const checks=[],errors=[],external=[];
 try{
  const page=await browser.newPage({viewport:{width:1600,height:900},reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push({page:page.url(),message:e.message}));
  page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url());});
  const click=s=>page.locator(s).click();
  async function shot(name,fullPage=false){if(shots){fs.mkdirSync(shots,{recursive:true});await page.screenshot({path:path.join(shots,name+'.png'),fullPage});}}
  async function localLinks(){for(const href of await page.locator('a[href]').evaluateAll(es=>es.map(e=>e.href))){assert(href.startsWith('file:'),href);assert(fs.existsSync(fileURLToPath(href.split('#')[0])),href);}}
  await page.goto(entry);await page.waitForFunction(()=>window.ChapterEntry?.state().models?.models===3);
  assert.equal(await page.locator('.task-card').count(),3);await localLinks();
  for(let i=0;i<3;i++){
   await page.locator(`[data-task="1-${i+1}"] .task-select`).click();
   assert.equal(await page.evaluate(()=>ChapterEntry.state().selected),'1-'+(i+1));
   assert.equal(await page.locator('#story-actions a').getAttribute('href'),packaged?lessons[i]:'../'+lessons[i]);
   await page.locator(`.model-label[aria-label^="1-${i+1} "]`).click();
   assert.equal(await page.locator('.task-card.selected').getAttribute('data-task'),'1-'+(i+1));
  }
  await click('#overview');await shot('第一章入口预览');
  await click('#show-guide');assert(await page.locator('#entry-guide').evaluate(e=>e.open));assert.equal(await page.locator('#entry-guide li').count(),3);await click('#close-guide');
  await click('#show-summary');assert.equal(await page.locator('.summary-links a').count(),3);await localLinks();await shot('第一章总结预览');await click('#close-summary');
  await click('#motion');assert.equal(await page.evaluate(()=>ChapterEntry.state().paused),false);await click('#motion');
  await click('#tour');const first=await page.evaluate(()=>ChapterEntry.state().selected);
  await page.waitForFunction(first=>ChapterEntry.state().selected!==first,first,{timeout:6500});await click('#tour');assert.equal(await page.evaluate(()=>ChapterEntry.state().touring),false);
  await click('#reset-view');checks.push('Entrance: 3 models, card/model selection, routes, tour, pause, view reset, guide and chapter summary');
  for(let i=0;i<3;i++){
   await page.goto(entry);await page.locator('.task-links a').nth(i).click();await page.waitForFunction(()=>window.Chapter1Guide);
   assert.equal(page.url(),url(i));assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
   assert.equal(await page.locator('.c1-links [aria-current]').getAttribute('data-route'),'1-'+(i+1));await localLinks();
   const seen=new Set();
   for(let j=0;j<4;j++){
    await page.locator(`[data-topic="${j}"]`).click();seen.add(await page.locator('#topic-title').innerText());
    assert.equal(await page.locator('[data-topic][aria-pressed=true]').count(),1);
    assert.equal(await page.locator('#topic-hint').evaluate(e=>e.open),false);
    await click('#topic-hint summary');assert(await page.locator('#topic-hint').evaluate(e=>e.open));assert((await page.locator('#hint-text').innerText()).length>15);
   }
   assert.equal(seen.size,4);await page.locator('[data-topic="3"]').focus();await page.keyboard.press('Home');
   assert.equal(await page.locator('[data-topic][aria-pressed=true]').getAttribute('data-topic'),'0');
   await page.keyboard.press('ArrowDown');assert.equal(await page.locator('[data-topic][aria-pressed=true]').getAttribute('data-topic'),'1');
   await page.keyboard.press('End');assert.equal(await page.locator('[data-topic][aria-pressed=true]').getAttribute('data-topic'),'3');
   assert.equal(await page.locator('#comparison-table tbody tr').count(),4);
   assert.match(await page.locator('.guide-status').innerText(),/导读.*待制作/);
   await click('#c1-theme');assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
   await page.reload();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
   await shot(['建造方式导读','施工机械导读','施工机器人导读'][i]);
   await click('#next-guide');assert.equal(page.url(),i===2?entry:url(i+1));
   await page.goto(url(i));await click('.c1-home');assert.equal(page.url(),entry);
  }
  if(!packaged){await page.goto(pathToFileURL(path.join(root,'index.html')).href+'#chapter-1');await page.locator('.chapter-entry-link[data-chapter="1"]').click();assert.equal(page.url(),entry);assert.equal(await page.locator('.task-links a').count(),3);}
  checks.push('3 guides: entry/next/home navigation, active route, 12 reading topics and hints, keyboard selection, comparison tables, dark on every reload');
  for(const viewport of [{width:1366,height:768},{width:1920,height:1080},{width:390,height:844}]){
   await page.setViewportSize(viewport);
   for(let i=-1;i<3;i++){
    await page.goto(i<0?entry:url(i));
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    if(i>=0){
     assert(await page.locator('#c1-theme').isVisible());
     if(viewport.width===390){
      await page.locator('[data-topic="3"]').click();assert.equal(await page.locator('#topic-title').innerText(),[...await page.locator('[data-topic="3"]').allTextContents()][0].replace(/^04/,''));
      await page.locator('.c1-links a').last().scrollIntoViewIfNeeded();await page.locator('.c1-links a').last().click();assert.equal(page.url(),url(2));
     }
    }
   }
  }
  checks.push('1366×768, 1920×1080 and 390×844: no horizontal document overflow; mobile topics and horizontally scrollable chapter navigation work');
  const fallback=await browser.newPage({viewport:{width:1600,height:900}});
  await fallback.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:get.call(this,type,...args);};});
  await fallback.goto(entry);assert(await fallback.locator('#fallback').isVisible());assert.equal(await fallback.locator('.task-links a').count(),3);
  await fallback.locator('.task-links a').first().click();assert.equal(fallback.url(),url(0));await fallback.close();
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);checks.push('WebGL fallback retains all guide routes; no page errors or network dependency');
  console.log(JSON.stringify({site:root,packaged,passed:checks},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});

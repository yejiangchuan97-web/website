/* Full-course navigation and packaging integration. Requires Playwright + Chromium/Edge. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL,fileURLToPath}=require('node:url');
const args=process.argv.slice(2),arg=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const root=path.resolve(arg('--site',path.join(__dirname,'..'))),shots=arg('--screenshots',null);
const home=pathToFileURL(path.join(root,'index.html')).href;
const url=file=>pathToFileURL(path.join(root,file.split('#')[0])).href+(file.includes('#')?'#'+file.split('#')[1]:'');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.COURSE_BROWSER||undefined});
 const errors=[],failed=[],external=[],checks=[];
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1000},reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push({url:page.url(),message:e.message}));
  page.on('requestfailed',r=>failed.push({url:r.url(),failure:r.failure()?.errorText}));
  page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url());});
  async function start(){await page.goto(home);await page.waitForFunction(()=>window.CourseHome);}
  async function shot(name){if(shots){fs.mkdirSync(shots,{recursive:true});await page.screenshot({path:path.join(shots,name+'.png'),fullPage:true});}}
  async function localLinks(){for(const href of await page.locator('a[href]').evaluateAll(es=>es.map(e=>e.href))){if(!href.startsWith('file:'))continue;assert(fs.existsSync(fileURLToPath(href.split('#')[0])),href);}}
  async function labelBounds(){assert(await page.locator('.model-label').evaluateAll(es=>{const s=document.getElementById('stage').getBoundingClientRect();return es.every(e=>{const r=e.getBoundingClientRect();return r.left>=s.left-1&&r.right<=s.right+1&&r.top>=s.top-1&&r.bottom<=s.bottom+1;});}),'Model label outside stage');}
  await start();const data=await page.evaluate(()=>window.COURSE);
  assert.equal(data.chapters.length,8);assert.equal(data.chapters.flatMap(c=>c.tasks).length,27);
  assert.equal(await page.locator('.chapter-entry-link').count(),8);assert.equal(await page.locator('.model-label').count(),8);await localLinks();await labelBounds();await shot('课程总入口');
  for(const c of data.chapters){
   await start();await page.locator(`.chapter-entry-link[data-chapter="${c.id}"]`).click();assert.equal(page.url(),url(c.entry));
   await page.locator('#task-cards a').first().waitFor();assert((await page.locator('#task-cards a').count())>=c.tasks.length);
   await page.locator('.course-home').click();assert.equal(page.url(),home+'#chapter-'+c.id);assert(await page.locator('#chapter-'+c.id).evaluate(e=>e.classList.contains('returning')));
   await start();await page.locator('.model-label').nth(c.id-1).click();assert.equal(page.url(),url(c.entry));
  }
  checks.push('Eight chapter cards and eight model labels open real chapter entrances; all chapter headers return to the matching course card');console.log('Chapter navigation passed');
  await start();await page.locator('#route-open').click();assert.equal(await page.locator('#route-list a').count(),8);await localLinks();await shot('课程学习路线');await page.keyboard.press('Escape');
  await page.locator('#catalog-open').click();assert.equal(await page.locator('.catalog-row').count(),27);assert.equal(await page.locator('.catalog-group').count(),8);await localLinks();await shot('全部任务目录');
  const search=page.locator('#task-search');await search.fill('TCP');assert.equal(await page.locator('.catalog-row').getAttribute('data-task'),'3-4');
  await search.fill('YOLO');assert.equal(await page.locator('.catalog-row').getAttribute('data-task'),'4-3');assert.equal(await page.locator('.task-sub a').count(),3);
  await search.fill('导读');assert.equal(await page.locator('.catalog-row').count(),8);
  await search.fill('未收录的任务xyz');assert(await page.locator('.empty-search').isVisible());assert.match(await page.locator('#catalog-count').innerText(),/0 项任务/);
  await search.fill('');await page.selectOption('#chapter-filter','6');assert.equal(await page.locator('.catalog-row').count(),4);assert.equal(await page.locator('.catalog-group').getAttribute('data-catalog-chapter'),'6');
  await page.keyboard.press('Escape');
  for(const c of data.chapters){await page.locator(`[data-tasks="${c.id}"]`).click();assert.equal(await page.locator('.catalog-row').count(),c.tasks.length);await page.keyboard.press('Escape');}
  checks.push('Learning route, all 27 tasks, keyword search, eight reading-guide labels, empty search, chapter filters and chapter task shortcuts');
  const targets=[...new Map(data.chapters.flatMap(c=>c.tasks.flatMap(t=>t.entries)).map(e=>[e.file.split('#')[0],e.file.split('#')[0]])).keys()];
  assert.equal(targets.length,30);const themes=[];
  for(const [i,file]of targets.entries()){
   await page.goto(url(file));await page.waitForTimeout(150);assert((await page.locator('body').innerText()).length>80,file);assert.notEqual(await page.locator('html').getAttribute('data-theme'),'light',file);
   if(file.startsWith('任务3-')){
    const dark=()=>page.evaluate(()=>document.documentElement.dataset.theme==='dark'||document.body.dataset.theme==='dark');
    assert(await dark(),file);await page.locator('#c-theme').click();assert.equal(await dark(),false,file);await page.reload();assert(await dark(),file);
   }
   themes.push([file,await page.locator('html').getAttribute('data-theme')||await page.locator('body').getAttribute('data-theme')]);
   if((i+1)%10===0)console.log('Loaded task pages: '+(i+1));
  }
  // YOLO has three named entries in a single page; preserve every fragment.
  for(const fragment of ['annotation','predict','evaluate']){const file=data.chapters[3].tasks.find(t=>t.id==='4-3').entries.find(e=>e.file.endsWith('#'+fragment)).file;await page.goto(url(file));assert(page.url().endsWith('#'+fragment));}
  checks.push('All 30 current task pages load locally with their scripts/styles; named YOLO entries retain their fragments');
  for(const viewport of [{width:1366,height:768},{width:1920,height:1080},{width:768,height:1024},{width:390,height:844}]){
   await page.setViewportSize(viewport);await start();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await labelBounds();
   assert.equal(await page.locator('.chapter-entry-link').count(),8);
   if(viewport.width===390){await shot('手机课程入口');await page.locator('[data-tasks="8"]').click();assert.equal(await page.locator('.catalog-row').count(),4);assert(await page.evaluate(()=>document.getElementById('catalog').scrollWidth<=document.getElementById('catalog').clientWidth+1));await page.keyboard.press('Escape');await page.locator('.chapter-entry-link[data-chapter="8"]').click();assert.equal(page.url(),url(data.chapters[7].entry));}
  }
  checks.push('1366×768, 1920×1080, tablet and phone: no horizontal overflow or clipped model labels; mobile chapter and directory actions work');
  const fallback=await browser.newPage({viewport:{width:1366,height:768}});
  await fallback.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:get.call(this,type,...args);};});
  await fallback.goto(home);assert(await fallback.locator('#fallback').isVisible());assert.equal(await fallback.locator('.chapter-entry-link').count(),8);await fallback.locator('.chapter-entry-link[data-chapter="1"]').click();assert.equal(fallback.url(),url(data.chapters[0].entry));await fallback.close();
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);assert.deepEqual(external,[]);
  checks.push('WebGL fallback keeps chapter navigation; no page errors, failed resource loads, or external runtime requests');
  console.log(JSON.stringify({site:root,passed:checks,themes},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});

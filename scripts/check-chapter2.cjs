/* Browser integration checks; requires Playwright and a Chromium browser. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const args=process.argv.slice(2),arg=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const root=path.resolve(arg('--site',path.join(__dirname,'..'))),packaged=args.includes('--packaged'),screenshots=arg('--screenshots',null);
const routes=packaged?{entry:'index.html',motor:'lessons/motor.html',diesel:'lessons/diesel.html',transmission:'lessons/transmission.html',mechanisms:'lessons/mechanisms.html',fourbar:'lessons/fourbar.html'}:{entry:'第二章_动力与工作机构/index.html',motor:'任务2-1_动力装置的基本原理/index.html',diesel:'任务2-1_动力装置的基本原理/diesel.html',transmission:'任务2-2_动力的传递与变换/index.html',mechanisms:'任务2-3_工作机构与施工动作/index.html',fourbar:'任务2-3_工作机构与施工动作/fourbar.html'};
const url=name=>pathToFileURL(path.join(root,routes[name])).href;
(async()=>{
  const browser=await chromium.launch({headless:true,channel:process.env.CHAPTER2_BROWSER||undefined});
  const checks=[],errors=[],external=[],failed=[];
  try{
    const page=await browser.newPage({viewport:{width:1600,height:900}});
    page.on('pageerror',e=>{if(!errors.some(x=>x.url===page.url()&&x.message===e.message)){const error={url:page.url(),message:e.message,stack:e.stack?.slice(0,1600)};errors.push(error);console.error(error);}});page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url());});page.on('requestfailed',r=>failed.push({url:r.url(),error:r.failure()?.errorText}));
    for(const name of Object.keys(routes)){
      await page.goto(url(name));
      await page.waitForFunction(name=>name==='entry'?window.ChapterEntry:name==='motor'?window.motorLab:name==='diesel'?window.engineLab:name==='transmission'?window.MechanicsLab:name==='mechanisms'?window.mechanismLab:window.fourbarLab,name);
      if(name==='entry'){
        assert.equal(await page.evaluate(()=>ChapterEntry.state().models.models),5);
        assert.equal(await page.locator('.task-card').count(),3);
        assert.equal(await page.locator('.task-links a').count(),5);
        for(const id of ['motor','diesel','transmission','mechanisms','fourbar']){
          await page.locator('.model-label').filter({has:page.locator('b',{hasText:({motor:'2-1A',diesel:'2-1B',transmission:'2-2',mechanisms:'2-3A',fourbar:'2-3B'})[id]})}).click();
          assert.equal(await page.evaluate(()=>ChapterEntry.state().selected),id);
          assert.equal(await page.locator('#story-actions a').evaluate(e=>e.href),url(id));
        }
        await page.locator('#overview').click();assert.equal(await page.evaluate(()=>ChapterEntry.state().selected),null);
        await page.locator('#motion').click();assert(await page.evaluate(()=>ChapterEntry.state().paused));await page.locator('#motion').click();
        await page.locator('#tour').click();const first=await page.evaluate(()=>ChapterEntry.state().selected);
        await page.waitForFunction(first=>ChapterEntry.state().selected!==first,first,{timeout:6000});await page.locator('#tour').click();
        await page.locator('#show-guide').click();assert(await page.locator('#entry-guide').evaluate(e=>e.open));await page.locator('#close-guide').click();
        await page.locator('#overview').click();
        checks.push('entrance: five models, three tasks, five correct routes, selection, overview, pause, tour, guide');
      }else{
        assert.equal(await page.locator('.c2-links a').count(),5);
        assert.equal(await page.locator('.c2-links [aria-current]').count(),1);
        for(const link of await page.locator('.c2-nav a').evaluateAll(els=>els.map(e=>e.href))){if(link.startsWith('file:'))assert(fs.existsSync(require('node:url').fileURLToPath(link.split('#')[0])),link);}
        if(name==='motor'){
          assert.equal(await page.locator('.page-nav>button').count(),3);
          assert(!(await page.locator('.simple-options').evaluate(e=>e.open)));
          assert(!(await page.locator('#simple-names').isChecked()));assert.equal(await page.locator('#simple-vectors').getAttribute('aria-pressed'),'true');
          assert.equal(await page.locator('meta[name="color-scheme"]').getAttribute('content'),'dark');
          await page.waitForFunction(()=>document.querySelectorAll('#motorEMLayer [data-force-particle]').length===6);
          assert(await page.locator('#motorParticleLayer [data-current-particle]').first().isVisible());
          const phase=await page.locator('#motorParticleLayer').getAttribute('data-phase');
          await page.waitForFunction(phase=>document.getElementById('motorParticleLayer').dataset.phase!==phase,phase);
          await page.locator('#pauseBtn').click();
          const readDirections=()=>page.evaluate(()=>({
            current:JSON.parse(document.querySelector('#motorEMLayer [data-em-key="I1"]').dataset.worldVector),
            force:JSON.parse(document.querySelector('#motorEMLayer [data-em-key="F1"]').dataset.worldVector),
            field:motorLab.getElectromagneticVectors().field,
            currentPhase:document.getElementById('motorParticleLayer').dataset.phase,
            forcePhase:document.querySelector('#motorEMLayer [data-force-particle]').dataset.forcePhase
          }));
          const forward=await readDirections();await page.locator('#reverseBtn').click();const reverse=await readDirections();
          for(const key of ['current','force'])forward[key].forEach((value,i)=>assert(Math.abs(value+reverse[key][i])<1e-9,key+' reverses with polarity'));
          assert.deepEqual(forward.field,reverse.field);
          await page.waitForTimeout(140);const frozen=await readDirections();assert.equal(frozen.currentPhase,reverse.currentPhase);assert.equal(frozen.forcePhase,reverse.forcePhase);
          await page.locator('#voltage').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));});
          await page.waitForFunction(()=>document.querySelectorAll('#motorEMLayer [data-force-particle]').length===0);
          assert(!(await page.locator('#motorParticleLayer').isVisible()));
          await page.locator('#voltage').evaluate(el=>{el.value='24';el.dispatchEvent(new Event('input',{bubbles:true}));});
          await page.locator('#forwardBtn').click();await page.locator('#pauseBtn').click();
          checks.push('motor effects: visible current/force particles, animation, reversed directions, fixed magnetic field, pause and power-off');
          assert((await page.locator('[data-screen="explore"]').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)))>=16);
          await page.locator('.simple-options>summary').click();assert(await page.locator('#cutaway').isVisible());await page.locator('.simple-options>summary').click();
          const before=await page.locator('#supplyA').textContent();await page.locator('#reverseBtn').click();const after=await page.locator('#supplyA').textContent();assert.notEqual(after,before);
          const tabs=page.locator('.page-nav>button');for(let i=0;i<await tabs.count();i++)await tabs.nth(i).click();
          for(const name of ['assembly','fault','reference']){await page.locator('#motor-more').selectOption(name);assert.equal(await page.locator('body').getAttribute('data-motor-screen'),name);}
          await tabs.first().click();
          await page.locator('#simple-names').check();assert(await page.locator('[data-annotation="names"]').isChecked());await page.locator('#simple-names').uncheck();
          await page.locator('#simple-vectors').click();assert(!(await page.locator('[data-annotation="force"]').isChecked()));assert(!(await page.locator('#motorParticleLayer').isVisible()));await page.locator('#simple-vectors').click();assert(await page.locator('[data-annotation="force"]').isChecked());assert(await page.locator('#motorParticleLayer').isVisible());
          assert(await page.evaluate(()=>motorLab.getRenderInfo().webgl));
        }else if(name==='diesel'){
          assert.equal(await page.evaluate(()=>engineLab.getState().theme),'dark');
          await page.locator('[data-engine="6"]').click();assert.equal(await page.evaluate(()=>engineLab.getState().mode),6);
          await page.locator('#c2-diesel-tab-1').click();assert(await page.locator('#multiDashboard').isVisible());
          await page.locator('#c2-diesel-tab-2').click();assert(await page.locator('.cycle-panel').isVisible());
          await page.locator('#c2-diesel-tab-0').click();await page.locator('[data-engine="4"]').click();
        }else if(name==='transmission'){
          assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
          for(const mode of ['hyd','air','gear']){await page.locator('[data-mode="'+mode+'"]').click();assert(await page.locator('[data-mode="'+mode+'"]').evaluate(e=>e.classList.contains('active')));}
        }else if(name==='mechanisms'){
          assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
          const before=await page.evaluate(()=>mechanismLab.snapshot().height);await page.locator('#screw-step').click();await page.waitForFunction(before=>mechanismLab.snapshot().height!==before,before);
          await page.locator('.c2-lesson-notes summary').click();assert(await page.locator('.lessons').isVisible());await page.locator('.c2-lesson-notes summary').click();
        }else{
          assert(await page.locator('html').evaluate(e=>e.classList.contains('dark')));
          const before=await page.evaluate(()=>fourbarLab.snapshot().theta);await page.locator('#fb-plus').click();const after=await page.evaluate(()=>fourbarLab.snapshot().theta);assert(after>before);
          assert((await page.evaluate(()=>fourbarLab.snapshot().pose.error))<1e-8);
        }
        checks.push(name+': shared navigation, local links and original main controls');
        if(name!=='motor'){
          const toggle={diesel:'#lightTheme',transmission:'#themeBtn',mechanisms:'[data-theme-toggle]',fourbar:'#fb-theme'}[name];
          await page.locator(toggle).first().click();
          assert(await page.evaluate(()=>document.documentElement.dataset.theme==='light'||(!document.documentElement.classList.contains('dark')&&document.documentElement.dataset.c2==='fourbar')));
          await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark'||document.documentElement.classList.contains('dark'));
          checks.push(name+': light theme can be selected, next visit still defaults to dark');
        }
      }
      for(const [width,height] of [[1600,900],[1366,768],[1920,1080],[390,844]]){
        await page.setViewportSize({width,height});await page.waitForTimeout(60);
        const metrics=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,canvas:[...document.querySelectorAll('canvas')].filter(e=>e.getBoundingClientRect().height>0).map(e=>e.getBoundingClientRect().toJSON())}));
        assert(metrics.scroll<=width+1,name+' horizontal overflow at '+width+': '+metrics.scroll);
        assert(metrics.canvas.length,name+' has no visible model at '+width);
      }
      await page.setViewportSize({width:1600,height:900});await page.waitForTimeout(90);
      if(screenshots){fs.mkdirSync(screenshots,{recursive:true});await page.screenshot({path:path.join(screenshots,name+'.png')});}
      console.log('PASS '+name);
    }
    const fallback=await browser.newPage({viewport:{width:1366,height:768}});
    await fallback.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:get.call(this,type,...args);};});
    await fallback.goto(url('entry'));assert(await fallback.locator('#fallback').isVisible());assert.equal(await fallback.locator('.task-links a').count(),5);await fallback.close();checks.push('WebGL fallback keeps all five lesson links');
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(failed,[]);
    console.log(JSON.stringify({checks,errors,external,failed},null,2));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

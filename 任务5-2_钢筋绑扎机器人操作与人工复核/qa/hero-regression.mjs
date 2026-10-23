import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';

// Regression ownership: reference_style. Exercises the built page without editing it.
const out=fileURLToPath(new URL('./hero-shots/',import.meta.url));
mkdirSync(out,{recursive:true});
const {chromium}=createRequire(import.meta.url)(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--do-not-de-elevate','--allow-file-access-from-files','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const report={date:new Date().toISOString(),motion:'no-preference',checks:[],pageErrors:[],result:'running'};
const save=()=>writeFileSync(join(out,'regression.json'),JSON.stringify(report,null,2));
const state=p=>p.evaluate(()=>__TYING_HERO__.state);
const diagnostics=p=>p.evaluate(()=>__TYING_HERO__.getDiagnostics());

async function check(name,fn){
  const started=Date.now();
  try{const evidence=await fn();report.checks.push({name,status:'passed',ms:Date.now()-started,evidence});console.log('PASS '+name);}
  catch(error){report.checks.push({name,status:'failed',ms:Date.now()-started,error:error.stack});console.error('FAIL '+name+' '+error.message);}
  save();
}
async function open({width=1440,height=900,noWebGL=false,queryFallback=false}={}){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'no-preference'});
  page.setDefaultTimeout(60000);
  page.on('pageerror',error=>report.pageErrors.push(error.message));
  // Observe manufactured-part rotations through a temporary construction hook.
  // The hook is restored after scene creation and changes no geometry or pose.
  await page.addInitScript(({noWebGL})=>{
    window.__heroRegressionObjects={};
    Object.defineProperty(window,'TyingHeroScene',{configurable:true,set(api){
      Object.defineProperty(window,'TyingHeroScene',{value:api,writable:true,configurable:true});
      const create=api.create;
      api.create=function(...args){
        const proto=window.THREE?.Object3D?.prototype,add=proto?.add;
        if(proto)proto.add=function(...objects){for(const object of objects){if(['wire-reel-axle','feed-roller'].includes(object.name))(window.__heroRegressionObjects[object.name]??=[]).push(object);}return add.apply(this,objects);};
        try{return create.apply(this,args);}finally{if(proto)proto.add=add;}
      };
    }});
    if(noWebGL){const getContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:getContext.call(this,type,...args);};}
  },{noWebGL});
  const url=new URL('../index.html',import.meta.url);if(queryFallback)url.searchParams.set('no-webgl','');
  await page.goto(url.href);
  await page.waitForFunction(()=>window.__TYING_HERO__);
  if(!noWebGL&&!queryFallback)await page.waitForFunction(()=>__TYING_HERO__.getDiagnostics().available&&'parkedSettled' in __TYING_HERO__.getDiagnostics());
  return page;
}
async function aim(page,id){
  await page.locator(`[data-point="${id}"]`).click();
  await page.waitForFunction(id=>{const s=__TYING_HERO__.state,d=__TYING_HERO__.getDiagnostics();return s.game.selected===id&&d.settled&&Math.hypot(d.actualAim.x-s.game.aim.x,d.actualAim.z-s.game.aim.z)<.014;},id);
}
async function gears(page){return page.evaluate(()=>({cycle:__TYING_HERO__.state.cycle,reel:__heroRegressionObjects['wire-reel-axle']?.[0]?.parent.rotation.z,rollers:__heroRegressionObjects['feed-roller']?.map(o=>o.parent.rotation.z)}));}

try{
  let page;
  await check('latest target rejects a settled previous pose within the same event turn',async()=>{
    page=await open();await aim(page,'A');
    const evidence=await page.evaluate(()=>{
      const old=__TYING_HERO__.getDiagnostics();
      document.querySelector('[data-point="B"]').click();
      document.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true}));
      return{old,state:__TYING_HERO__.state};
    });
    assert.equal(evidence.old.settled,true);assert.equal(evidence.state.game.selected,'B');assert.equal(evidence.state.game.busy,null);assert.equal(evidence.state.game.points.some(p=>p.tied),false);
    return{selected:evidence.state.game.selected,oldAim:evidence.old.actualAim,message:evidence.state.game.message};
  });
  await check('normal animation pauses the wire reel, feed rollers and cycle together',async()=>{
    if(!page)page=await open();await aim(page,'A');await page.locator('#tie-trigger').click();
    await page.waitForFunction(()=>__TYING_HERO__.state.cycle>.43);
    await page.locator('#pause-action').click();
    const before=await gears(page);assert(before.cycle>.4&&before.cycle<.6,'pause must land in the feed phase');assert.equal(typeof before.reel,'number');assert.equal(before.rollers.length,2);assert(before.rollers.every(angle=>Math.abs(angle)>.01),'both driven roller groups must have advanced');
    await page.waitForTimeout(450);const after=await gears(page);assert.deepEqual(after,before);
    await page.locator('#pause-action').click();await page.waitForFunction(()=>__TYING_HERO__.state.game.points[0].tied);
    return{before,after,completed:true};
  });
  await check('review blocks isolation during parking and repair transfers before descending',async()=>{
    if(!page)throw new Error('desktop page unavailable');
    await page.locator('#tie-auto').click();await page.waitForFunction(()=>__TYING_HERO__.state.game.points.every(p=>p.tied));
    const early=await page.evaluate(()=>{document.querySelector('#go-review').click();const d=__TYING_HERO__.getDiagnostics(),disabled=document.querySelector('#review-safe').disabled;document.querySelector('#review-safe').click();return{diagnostics:d,disabled,isolated:__TYING_HERO__.state.game.isolated};});
    assert.equal(early.disabled,true);assert.equal(early.isolated,false);
    await page.waitForFunction(()=>__TYING_HERO__.getDiagnostics().parkedSettled);
    await page.locator('#review-safe').click();assert.equal((await state(page)).game.isolated,true);
    await page.locator('[data-review="B"]').click();await page.locator('#mark-repair').click();await page.locator('#repair').click();
    const transfer=await page.evaluate(()=>({state:__TYING_HERO__.state,pose:__TYING_HERO__.scene.getState()}));
    assert.equal(transfer.state.game.isolated,false);assert.equal(transfer.state.game.busy.kind,'repair');assert.equal(transfer.state.cycle,0);
    await page.waitForFunction(()=>__TYING_HERO__.state.cycle>0);
    const started=await diagnostics(page);assert(started.aimError<.014,'repair cycle started before lateral transfer settled');
    await page.waitForFunction(()=>!__TYING_HERO__.state.game.busy);assert.equal((await state(page)).game.isolated,false);
    return{parkingWasBlocked:early.disabled,transferCycle:transfer.state.cycle,transferPose:transfer.pose.actual,repairStartAimError:started.aimError};
  });
  if(page)await page.close();

  await check('study resumes after help closes and fault rewind resets isolation feedback',async()=>{
    const p=await open();try{
      await p.locator('#nav-study').click();await p.locator('#study-play').click();await p.waitForFunction(()=>__TYING_HERO__.state.study.p>.05);
      await p.locator('#help').click();const stopped=(await state(p)).study.p;await p.waitForTimeout(150);assert.equal((await state(p)).study.p,stopped);
      await p.locator('#close-info').click();await p.waitForFunction(p=>__TYING_HERO__.state.study.p>p+.03,stopped);assert.equal((await state(p)).paused,false);
      await p.locator('#fault-toggle').click();await p.evaluate(()=>__TYING_HERO__.seek(1));await p.locator('#mark-fault').click();await p.locator('#isolate-fault').click();
      assert.equal((await state(p)).study.isolated,true);await p.evaluate(()=>__TYING_HERO__.seek(0));
      const rewind=await state(p),feedback=await p.locator('#fault-feedback').innerText();assert.equal(rewind.study.isolated,false);assert.equal(await p.locator('#inspect-fault').isDisabled(),true);assert(!feedback.includes('已模拟停机'));
      await p.locator('#study-back').click();assert.equal((await state(p)).mode,'game');assert.equal((await state(p)).game.points.some(x=>x.tied),false);
      return{stopped,resumed:true,rewindFeedback:feedback,gamePreserved:true};
    }finally{await p.close();}
  });
  await check('390px mobile completes all four ties while controls stay at the page bottom',async()=>{
    const p=await open({width:390,height:844});try{
      await p.locator('#tie-auto').click();await p.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
      const start=await p.evaluate(()=>({scrollY,sceneBottom:document.querySelector('#scene-shell').getBoundingClientRect().bottom,panelBottom:document.querySelector('#control-panel').getBoundingClientRect().bottom,width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
      assert(start.scrollWidth<=start.width+1);assert(start.sceneBottom<=0,'the scene must be outside the viewport');
      await p.waitForFunction(()=>__TYING_HERO__.state.game.points.every(x=>x.tied));
      await p.locator('#go-review').click();await p.locator('#review-safe').click();await p.locator('#pull').click();await p.waitForFunction(()=>__TYING_HERO__.state.game.points[0].checked);
      const finish=await state(p);return{start,tied:finish.game.points.filter(x=>x.tied).length,reviewChecked:finish.game.points[0].checked};
    }finally{await p.close();}
  });
  for(const fallback of ['query','context'])await check(`WebGL ${fallback} fallback is explicit and disables simulation controls`,async()=>{
    const p=await open({noWebGL:fallback==='context',queryFallback:fallback==='query'});try{
      assert.equal((await diagnostics(p)).available,false);assert.equal(await p.locator('#fallback').isVisible(),true);assert.equal(await p.locator('#webgl-note').isVisible(),true);
      const info=await p.evaluate(()=>({note:document.querySelector('#webgl-note').textContent,fallback:document.querySelector('#fallback').textContent,controls:[...document.querySelectorAll('#tie-panel button,#review-panel button,#study-panel button,#study-panel input')].map(b=>({id:b.id,disabled:b.disabled})),canvas:document.querySelector('#hero-scene canvas')!==null}));
      assert(info.controls.length>0&&info.controls.every(b=>b.disabled));assert.equal(info.canvas,false);return{note:info.note,disabledControlCount:info.controls.length,canvas:false};
    }finally{await p.close();}
  });
}finally{
  report.result=report.checks.every(x=>x.status==='passed')&&report.pageErrors.length===0?'passed':'failed';save();await browser.close();console.log(JSON.stringify(report,null,2));
}
if(report.result!=='passed')process.exitCode=1;

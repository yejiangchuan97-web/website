/* Run through ego-browser nodejs; exported for source/package/HTTP checks. */
export async function runRevision(page,base,{screenshots=null,report=null}={}){
 const {default:assert}=await import('node:assert/strict');const fs=await import('node:fs/promises');
 const checks=[];
 async function go(file,api){await page.goto(new URL(file,base).href);await page.waitForFunction(name=>!!window[name],api,{timeout:15000});}
 const state=api=>page.evaluate(name=>window[name].state(),api);
 const ok=(value,name)=>{assert(value,name);checks.push(name);};
 async function shot(name){if(screenshots){await fs.mkdir(screenshots,{recursive:true});await page.screenshot({path:screenshots+'/'+name+'.png'});}}
 await go('course/chapters/01/tasks/1-2/index.html','GalleryLab');
 for(const id of ['excavator','dozer','loader','crane','pump','lift']){
  await page.click('[data-tab="'+id+'"]');await page.waitForFunction(id=>GalleryLab.state().selected===id&&!GalleryLab.state().loading,id,{timeout:15000});
  await page.click('#step');const s=await state('GalleryLab');ok(s.time>0&&s.parts.length>=3&&s.resources.created-s.resources.disposed===1,'machinery '+id+' loads, steps and retains one active model');
 }
 await page.click('[data-tab="pump"]');await page.click('#play');await page.waitForFunction(()=>GalleryLab.state().time>.2,undefined,{timeout:10000});await page.click('#play');ok(!(await state('GalleryLab')).playing,'gallery pause stops the action');await page.click('#reset-motion');ok((await state('GalleryLab')).time===0,'gallery reset restores initial pose');await shot('machinery-pump');
 await go('course/chapters/01/tasks/1-3/index.html','GalleryLab');
 for(const id of ['crazyflie','iiwa','g1','go2','care']){
  await page.click('[data-tab="'+id+'"]');await page.waitForFunction(id=>GalleryLab.state().selected===id&&!GalleryLab.state().loading,id,{timeout:15000});await page.click('#step');const s=await state('GalleryLab');ok(s.parts.length>=3&&s.time>0,'robot '+id+' has a local model and a stepped action');
 }
 await page.evaluate(()=>{for(const id of ['iiwa','g1','go2','care','g1'])document.querySelector('[data-tab="'+id+'"]').click();});await page.waitForFunction(()=>GalleryLab.state().selected==='g1'&&!GalleryLab.state().loading,undefined,{timeout:15000});ok((await state('GalleryLab')).resources.created-(await state('GalleryLab')).resources.disposed===1,'rapid switching releases old models and rejects stale loads');await shot('robot-g1');
 await go('course/chapters/05/tasks/5-3/index.html','ConcreteLab');
 for(let i=0;i<3;i++)await page.click('#pump-step');ok((await state('ConcreteLab')).pumped[0]===1,'three pump strokes fill the selected teaching cell');
 await page.click('#cutaway');await page.click('#pump-step');await shot('pump-section');await page.click('#cutaway');
 await page.click('[data-tab="vibrate"]');await page.click('#vibrate');ok((await state('ConcreteLab')).error,'vibration is blocked before insertion');await page.click('#insert');await page.click('#vibrate');await page.click('#vibrate');await page.click('#withdraw');ok((await state('ConcreteLab')).vibration[0]===2,'vibration evidence carries forward on the same floor');
 await page.click('[data-tab="level"]');await page.evaluate(()=>{const r=document.getElementById('datum');r.value='15';r.dispatchEvent(new Event('input',{bubbles:true}));});await page.click('#level');ok((await state('ConcreteLab')).level[0]===15,'closed loop follows an intentionally wrong reference');
 await page.evaluate(()=>{const r=document.getElementById('datum');r.value='0';r.dispatchEvent(new Event('input',{bubbles:true}));});await page.click('#level');ok((await state('ConcreteLab')).level[0]===0,'corrected datum updates the same cell');await shot('concrete-level');
 await go('course/chapters/08/tasks/8-1/index.html','SafetyLab');
 await page.click('#inspect');await page.click('#control');ok((await state('SafetyLab')).error,'risk treatment is blocked while the case is running');await page.click('#estop');const stopped=await state('SafetyLab');ok(!stopped.running&&stopped.energy.pressure&&stopped.energy.load,'e-stop preserves residual pressure and hanging load');await page.click('#reset-stop');ok((await state('SafetyLab')).error,'reset is blocked while hazards remain');
 for(const id of ['electric','collision','pinch','load','edge','pressure']){await page.click('[data-tab="'+id+'"]');for(const action of ['inspect','control','verify'])await page.click('#'+action);}
 await page.click('#reset-stop');let safety=await state('SafetyLab');ok(safety.armed&&!safety.running,'manual reset does not restart motion');await shot('safety-resolved');await page.click('#start');ok((await state('SafetyLab')).running,'a separate start command resumes the checked classroom case');
 await go('course/chapters/08/tasks/8-2/index.html','MaintenanceLab');await page.click('#reset-all');
 await page.selectOption('#case','blocked');for(const action of ['inspect','read','isolate','energy','service'])await page.click('#'+action);ok((await state('MaintenanceLab')).error,'blocked nozzle rejects routine cleaning');await page.click('#handoff');ok((await state('MaintenanceLab')).records.some(r=>!r.resolved),'handoff preserves an unresolved record');
 await page.selectOption('#case','normal');for(const action of ['inspect','read','isolate','energy'])await page.click('#'+action);await page.selectOption('#material','wrong');await page.click('#service');ok((await state('MaintenanceLab')).error,'unsupported cleaning material is blocked');await page.selectOption('#material','compatible');for(const action of ['service','service','verify'])await page.click('#'+action);ok((await state('MaintenanceLab')).work.sprayer.verified,'two-stage cleanup requires an explicit final verification');
 await page.click('[data-tab="pump"]');await page.selectOption('#case','leak');for(const action of ['inspect','read','isolate','energy','service'])await page.click('#'+action);ok((await state('MaintenanceLab')).error,'pump leakage cannot be hidden by normal maintenance');await page.click('#handoff');
 await page.click('[data-tab="engine"]');await page.selectOption('#case','hot');for(const action of ['inspect','read','isolate','service'])await page.click('#'+action);ok((await state('MaintenanceLab')).error,'hot engine needs a separate condition check');await page.click('#energy');for(const action of ['service','service','verify'])await page.click('#'+action);
 await page.click('[data-tab="bearing"]');for(const action of ['inspect','read','isolate','energy'])await page.click('#'+action);await page.selectOption('#material','wrong');await page.click('#service');ok((await state('MaintenanceLab')).error,'incompatible lubricant cannot advance the bearing case');await page.selectOption('#material','compatible');for(const action of ['service','service','verify'])await page.click('#'+action);const maint=await state('MaintenanceLab');ok(maint.work.bearing.verified&&maint.records.filter(r=>!r.resolved).length===2,'successful service keeps the two unrelated unresolved handoffs');await shot('maintenance-bearing');
 const errors=await page.evaluate(()=>window.__errors||[]);ok(errors.length===0,'no uncaught browser errors in the interaction workflow');
 const result={base,checks,passed:checks.length,errors};if(report)await fs.writeFile(report,JSON.stringify(result,null,2));return result;
}

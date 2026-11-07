/* Browser regression: pass an ego-browser Page; no remote assets or QA fixtures. */
export async function runHeroGallery(page, base, {full=true}={}) {
 const {default:assert}=await import('node:assert/strict');
 const checks=[];
 const ok=(value,name)=>{assert(value,name);checks.push(name);};
 const state=()=>page.evaluate(()=>GalleryLab.state());
 const settled=()=>page.waitForFunction(()=>window.GalleryLab&&!GalleryLab.state().loading&&!GalleryLab.state().error,undefined,{timeout:20000});
 const go=async id=>{await page.goto(new URL(`course/chapters/01/tasks/${id}/index.html`,base).href);await settled();};
 const select=async id=>{await page.click(`[data-tab="${id}"]`);await page.waitForFunction(id=>GalleryLab.state().selected===id&&!GalleryLab.state().loading,id,{timeout:20000});};
 await go('1-2');
 ok(!(await state()).playing,'gallery starts paused');
 for(const id of ['excavator','dozer','loader','crane','pump','lift']) {
  await select(id);await page.click('#step');
  let s=await state();ok(s.time===.2&&s.parts.length>=3&&s.resources.created-s.resources.disposed===1,id+' loads, steps and retains one model');
  if(full){const control=await page.evaluate(()=>GalleryLab.model().controls[0]);await page.focus('#joint-'+control.id);await page.press('#joint-'+control.id,'End');await page.waitForFunction(c=>Math.abs(GalleryLab.state().readings[0].value-c.max)<.02,control,{timeout:10000});s=await state();ok(!s.playing&&Math.abs(s.readings[0].value-control.max)<.02,id+' manual control reaches current mesh pose');}
 }
 await select('excavator');
 await page.click('[data-inspector="anatomy"]');await page.click('#toggle-explode');await page.waitForFunction(()=>GalleryLab.state().displayExplode>.99,undefined,{timeout:10000});
 ok(await page.evaluate(()=>document.getElementById('play').disabled&&!GalleryLab.state().playing),'structure expansion pauses and blocks playback');
 const expandedTime=(await state()).time;await page.evaluate(()=>GalleryLab.step());ok((await state()).time===expandedTime,'programmatic step is also blocked while apart');
 await page.click('[data-focus="bucket"]');ok((await state()).part==='bucket','component index binds bucket assembly');
 await page.click('#focus-selected');
 ok(await page.evaluate(()=>Workshop.stage.distance<12),'focus fits selected component');
 await page.click('#isolate-view');ok((await state()).view==='isolate','selected part can be isolated');
 await page.click('#reset-motion');await page.waitForFunction(()=>GalleryLab.state().displayExplode===0);
 let s=await state();ok(s.time===0&&!s.playing&&!s.part&&s.view==='solid'&&!Object.keys(s.manual).length,'reset restores assembly, pose and materials');
 await page.click('#play');ok((await state()).playing,'play starts the action');await page.click('#play');ok(!(await state()).playing,'pause stops the action');
 const angle=await page.evaluate(()=>Workshop.stage.az);await page.focus('#scene');await page.press('#scene','ArrowRight');ok(await page.evaluate(a=>Workshop.stage.az!==a,angle),'keyboard rotates camera');
 await page.press('#scene',' ');ok((await state()).playing,'Space starts action from the scene');await page.press('#scene','Escape');ok(!(await state()).playing&&(await state()).time===0,'Escape restores the workbench');
 await page.click('#theme');ok(await page.evaluate(()=>document.documentElement.dataset.theme==='dark'),'dark theme switch works');await page.click('#theme');
 await go('1-3');
 for(const id of ['crazyflie','iiwa','g1','go2','care']) {
  await select(id);await page.click('#step');s=await state();ok(s.time===.2&&s.parts.length>=3,id+' local robot model and stepped action');
  if(id!=='care'&&full){await page.selectOption('#clip','1');s=await state();ok(s.clip===1&&s.time===0&&s.duration===6,id+' clip and timeline reset together');ok(await page.evaluate(()=>{const m=GalleryLab.model();return new Set(m.parts.flatMap(p=>p.members)).size===m.nodes.length;}),id+' exact source assembly coverage');}
 }
 await page.evaluate(()=>{for(const id of ['g1','iiwa','go2','g1'])GalleryLab.select(id);});await page.waitForFunction(()=>GalleryLab.state().selected==='g1'&&!GalleryLab.state().loading,undefined,{timeout:20000});s=await state();ok(s.resources.created-s.resources.disposed===1,'rapid asynchronous switches discard stale models');
 await page.click('[data-inspector="anatomy"]');await page.click('#toggle-explode');await page.waitForFunction(()=>GalleryLab.state().displayExplode>.99,undefined,{timeout:10000});ok((await state()).explode===1,'licensed robot assemblies expand');
 await page.click('#reset-motion');
 ok(await page.evaluate(()=>!performance.getEntriesByType('resource').some(r=>/^https?:/.test(r.name)&&new URL(r.name).origin!==location.origin)),'no external runtime resource request');
 ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no document horizontal overflow');
 const errors=await page.evaluate(()=>window.__heroErrors||[]);ok(errors.length===0,'no uncaught browser errors');
 return {base,full,passed:checks.length,checks,errors};
}

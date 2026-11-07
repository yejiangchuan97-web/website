/* Shared actual-browser regression for source, package, HTTP and file delivery. */
export async function runLearning(page,base,{full=true}={}){
 const {default:assert}=await import('node:assert/strict');const checks=[];
 const ok=(v,n)=>{assert(v,n);checks.push(n);};
 const state=()=>page.evaluate(()=>LessonLab.state());
 const scroll=async selector=>{
  const inRecords=await page.evaluate(s=>!!document.querySelector(s)?.closest('#record-dialog'),selector);
  const open=await page.evaluate(()=>!!document.querySelector('#record-dialog')?.open);
  if(inRecords&&!open)await page.click('#open-records');
  if(!inRecords&&open)await page.click('#close-records');
  return page.evaluate(s=>document.querySelector(s)?.scrollIntoView({block:'nearest',inline:'nearest'}),selector);
 };
 const click=async selector=>{await scroll(selector);return page.click(selector);};
 const fill=async(selector,value)=>{await scroll(selector);return page.fill(selector,value);};
 async function go(id){await page.goto(new URL(`course/chapters/01/tasks/${id}/index.html`,base).href);await page.waitForFunction(()=>!!window.LessonLab&&!GalleryLab.state().loading,undefined,{timeout:20000});}
 await go('1-2');await click('#lesson-reset');
 await click('#lesson-save');ok(Object.keys((await state()).records).length===0,'unrelated model or missing action cannot create a record');
 const jobs=[['lift-steel','crane','hook','hoist','End'],['people-floor','lift','cage','height','End'],['cut-stock','rebar-cutter','blade','cut','Home'],['bend-stock','rebar-bender','disc','bend','End'],['load-earth','loader','bucket','lift','End']];
 for(const[id,device,part,control,key]of full?jobs:jobs.slice(0,2)){
  await click(`[data-case="${id}"]`);await click(`[data-tab="${device}"]`);await page.waitForFunction(id=>GalleryLab.state().selected===id&&!GalleryLab.state().loading,device,{timeout:15000});
  await click(`[data-focus="${part}"]`);await page.focus('#joint-'+control);await page.press('#joint-'+control,key);await page.waitForFunction(()=>LessonLab.state().ready,undefined,{timeout:15000});
  const observed=await state();ok(observed.motion&&observed.part===part,id+' captures the real selected part and changed pose');
  await fill('#machine-reason','通过刚才工作装置的运动，改变本任务材料的位置或形状，所以主要用途与作业要求相符。');
  await fill('#machine-limit','仍需核对具体型号、用途资格、材料条件和现场要求，不能根据模型示意直接放行。');
  await click('#lesson-save');const s=await state();ok(s.records[id]?.review==='说明待师生复核',id+' saves evidence and keeps explanations for review');
 }
 const count=Object.keys((await state()).records).length;await page.reload();await page.waitForFunction(()=>!!window.LessonLab);ok(Object.keys((await state()).records).length===count,'machine records survive reload without carrying current-action completion');
 ok(!(await state()).ready,'reloaded observation session needs fresh evidence');
 await go('1-3');await click('#lesson-reset');await click('#comparison-save');ok(!(await state()).savedComparison,'comparison save is blocked without control and recovery evidence');
 for(const action of ['trial-start','trial-jog','trial-disturb','trial-stop'])await click('#'+action);
 let s=await state();ok(s.records.manual&&!s.records.manual.automatic&&!s.running,'manual trial records a stop commanded by the student');
 await click('[data-control-mode="program"]');await click('#trial-start');await click('#trial-disturb');await click('#trial-step');s=await state();ok(s.records.program&&s.records.program.after>s.records.program.before,'preset program continues after the same distance disturbance');
 await click('[data-control-mode="feedback"]');await click('#trial-start');await click('#trial-disturb');s=await state();ok(s.latched&&!s.running&&s.records.feedback?.automatic,'feedback comparison stops the apparatus automatically');
 await click('#trial-ack');ok((await state()).latched,'confirmation is blocked before conditions recover');
 await click('#trial-restore');ok(!(await state()).running&&(await state()).latched,'distance recovery does not restart');
 await click('#trial-ack');ok(!(await state()).running&&!(await state()).latched,'human acknowledgment does not restart');
 await click('#trial-start');ok((await state()).complete,'a separate start completes the recorded recovery chain');
 await fill('#comparison-reason','距离感知把实际状态送给控制器，与模型目标比较后使动作暂停；只显示给人或只执行程序时不是同一种装置自动响应。');
 await fill('#comparison-human','人仍需确认作业任务、处理条件变化的原因，恢复后人工确认并单独启动，不能把自动暂停当成已经修复。');
 await click('#comparison-save');ok(!!(await state()).savedComparison,'comparison explanation is saved with the three actual traces');
 await click('[data-tab="go2"]');await page.waitForFunction(()=>!GalleryLab.state().loading);await click('[data-focus="body"]');await click('#step');
 await fill('#form-reason','在需要移动观察的具体场景中，机身和四足结构可作为比较通行方式的形态证据，但不能单凭外形确定作业能力。');
 await fill('#form-limit','还需核对工具配置、感知控制、工艺条件和实机资料。');await click('#form-save');ok(!!(await state()).forms.go2,'form transfer includes a selected part and explicit missing capability evidence');
 await click('#back-to-experiment');await page.waitForFunction(()=>GalleryLab.state().selected==='feedback-rig'&&!GalleryLab.state().loading);ok(!!(await state()).savedComparison,'returning to the experiment preserves its recorded evidence');
 await click('#theme');ok(await page.evaluate(()=>document.documentElement.dataset.theme==='dark'),'theme remains available in the learning flow');await click('#theme');
 ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no document horizontal overflow');
 ok(await page.evaluate(()=>!performance.getEntriesByType('resource').some(r=>/^https?:/.test(r.name)&&new URL(r.name).origin!==location.origin)),'no external runtime dependency');
 return{base,full,passed:checks.length,checks};
}

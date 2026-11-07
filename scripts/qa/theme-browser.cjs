/* Run with playwright-cli run-code --filename=scripts/qa/theme-browser.cjs. */
async (page) => {
  const server = 'http://127.0.0.1:8765/';
  const origin = server + (page.url().includes('/artifacts/site/') ? 'artifacts/site/' : '');
  const catalog = await (await page.request.get(server + 'course/catalog.json')).json();
  const paths = ['course/home/index.html', ...Array.from({length:8}, (_, i) => `course/chapters/${String(i+1).padStart(2,'0')}/overview/index.html`),
    ...new Set(catalog.tasks.flatMap(task => [task.demo, ...(task.demos || []).map(demo => demo.file)]))];
  const results = [], errors = [];
  let previous;
  page.on('pageerror', error => errors.push({url:page.url(),error:String(error)}));
  await page.setViewportSize({width:1600,height:900});
  for (const path of paths) {
    await page.goto(origin + path);
    await page.locator('#course-theme-toggle').waitFor();
    const before = await page.locator('#course-theme-toggle').getAttribute('aria-pressed');
    if(previous !== undefined && before !== previous) throw Error('Cross-page theme lost: '+path);
    await page.locator('#course-theme-toggle').click();
    const after = await page.evaluate(() => ({root:document.documentElement.dataset.theme,body:document.body.dataset.theme,pressed:document.querySelector('#course-theme-toggle').getAttribute('aria-pressed'),bg:getComputedStyle(document.body).getPropertyValue('--course-bg').trim(),count:document.querySelectorAll('#course-theme-toggle').length}));
    if (after.pressed === before || after.root !== after.body || after.count !== 1) throw Error('Theme did not switch: '+path);
    await page.reload();
    await page.locator('#course-theme-toggle').waitFor();
    if (await page.locator('#course-theme-toggle').getAttribute('aria-pressed') !== after.pressed) throw Error('Reload lost theme: '+path);
    previous=after.pressed;
    const style=await page.locator('#course-theme-toggle').evaluate(button=>({font:getComputedStyle(button).fontSize,height:getComputedStyle(button).height}));
    if(style.font!=='13px'||style.height!=='36px')throw Error('Inconsistent button style: '+path+JSON.stringify(style));
    results.push({path,...after,style});
  }
  await page.goto(origin + 'course/chapters/05/tasks/5-3/index.html');
  for(let i=0;i<3;i++) await page.locator('#pump-step').click();
  const pumped=await page.evaluate(()=>ConcreteLab.state().pumped[0]);
  await page.locator('#course-theme-toggle').focus();
  await page.keyboard.press('Enter');
  if(await page.evaluate(()=>ConcreteLab.state().pumped[0])!==pumped || pumped!==1) throw Error('Theme affected concrete learning state');
  await page.screenshot({animations:'disabled',path:'artifacts/screenshots/theme/concrete-desktop.png'});
  await page.goto(origin + 'course/chapters/05/tasks/5-2/index.html');
  await page.screenshot({animations:'disabled',path:'artifacts/screenshots/theme/tying-desktop.png'});
  await page.goto(origin + 'course/chapters/02/overview/index.html');
  await page.screenshot({animations:'disabled',path:'artifacts/screenshots/theme/chapter2-desktop.png'});
  if(errors.length) throw Error(JSON.stringify(errors));
  return {origin,pages:results,errors,concreteStatePreserved:true};
}

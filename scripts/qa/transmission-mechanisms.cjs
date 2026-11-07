async page => {
  const base = new URL('../../../../../', page.url()).href;
  const checks = [], errors = [];
  const check = (value, label) => { if (!value) throw Error(label); checks.push(label); };
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => route.continue());
  await page.setViewportSize({width:1343,height:964});
  await page.goto(base+'course/chapters/02/tasks/2-2/index.html');
  await page.waitForFunction(() => window.MechanicsLab);
  await page.evaluate(() => CourseTheme.set('light'));
  for (const mode of ['gear','hyd','air']) {
    await page.locator(`[data-mode="${mode}"]`).click();
    check(await page.locator('#watchSteps li').count() === 2, `${mode} observation instructions`);
    check(await page.locator('#componentIndex button').count() >= 10, `${mode} component index`);
    const marker = page.locator('.component-label:visible').first();
    check(await marker.evaluate(node => getComputedStyle(node).borderRadius === '6px' && node.textContent === node.getAttribute('aria-label') && !/^\d+$/.test(node.textContent)), `${mode} rectangular text label`);
    const mainCount = await page.locator('.component-label:visible').count();
    check(mainCount >= 5 && mainCount <= 6, `${mode} key components labelled`);
    await page.locator('.component-index-panel summary').click();
    await page.locator('#allComponentLabels').check();
    check(await page.locator('.component-label:visible').count() > mainCount, `${mode} all original component labels available`);
    await page.locator('#allComponentLabels').uncheck();
    await page.locator('.component-index-panel summary').click();
    await page.screenshot({path:`artifacts/screenshots/transmission-text-labels-${mode}.png`,animations:'disabled'});
    await marker.click();
    check(await page.locator('#detailPane').isVisible(), `${mode} part inspection retained`);
    await page.locator('#homeBtn').click();
    await page.locator('[data-panel="params"]').click();
  }
  await page.locator('[data-mode="gear"]').click();
  for (const kind of ['belt','chain','gear']) {
    await page.locator(`[data-kind="${kind}"]`).click();
    check(await page.evaluate(kind => MechanicsLab.snapshot().params.gear.kind === kind,kind), `${kind} transmission retained`);
  }
  await page.locator('[data-panel="tasks"]').click();
  check(await page.locator('[data-action="start"]').count() === 4, 'four original learning experiments');
  await page.locator('[data-action="start"][data-id="assembly"]').click();
  check(await page.evaluate(() => MechanicsLab.snapshot().lesson.kind === 'assembly'), 'assembly experiment starts');
  await page.locator('[data-action="end"]').click();
  await page.locator('[data-panel="params"]').click();
  await page.screenshot({path:'artifacts/screenshots/transmission-compact-final.png',animations:'disabled'});
  await page.locator('#course-theme-toggle').click();
  await page.screenshot({path:'artifacts/screenshots/transmission-compact-dark.png',animations:'disabled'});
  await page.locator('#course-theme-toggle').click();
  await page.setViewportSize({width:390,height:844});
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'transmission mobile width');
  await page.setViewportSize({width:1343,height:964});
  await page.goto(base+'course/chapters/02/tasks/2-3/index.html');
  await page.waitForFunction(() => window.mechanismLab);
  const read = () => page.evaluate(() => mechanismLab.snapshot());
  check(await page.locator('.c2-experiments button').count() === 2, 'only two mechanism experiments');
  const initial = await read();
  for (const id of ['link-dead','hyd-dead','normal-pose']) {
    await page.locator('#'+id).click();
    const state = await read();
    check(['a','b','c'].every(key => state[key] === initial[key]), `${id} preserves rod dimensions`);
  }
  const samples = await page.locator('#stroke').evaluate(input => {
    const states = [];
    for (let i=0;i<=80;i++) {
      input.value = input.max*i/80;
      input.dispatchEvent(new Event('input',{bubbles:true}));
      states.push(mechanismLab.snapshot());
    }
    return states;
  });
  for (const state of samples) {
    check(state.geometry.links.every((link,i) => Math.abs(link.length-[state.a,state.b,state.c][i])<1e-8), 'rendered linkage lengths fixed');
    check(Math.abs(state.geometry.rodLength-initial.geometry.rodLength)<1e-8 && Math.abs(state.geometry.barrelLength-initial.geometry.barrelLength)<1e-8, 'piston rod and barrel fixed lengths');
  }
  await page.locator('#normal-pose').click();
  await page.locator('#play').click();
  await page.waitForTimeout(700);
  await page.locator('#play').click();
  const hydraulic = await read();
  check(hydraulic.theta !== initial.theta && hydraulic.ns === initial.ns, 'hydraulic playback moves only selected mechanism');
  await page.screenshot({path:'artifacts/screenshots/mechanism-hydraulic-final.png'});
  await page.locator('.c2-experiments button').nth(1).click();
  const beforeScrew = await read();
  await page.locator('#screw-step').click();
  await page.waitForFunction(ns => mechanismLab.snapshot().ns > ns,beforeScrew.ns);
  await page.waitForFunction(() => !mechanismLab.snapshot().step);
  const screw = await read();
  check(Math.abs(screw.ns-beforeScrew.ns-1)<1e-8 && screw.theta === beforeScrew.theta, 'screw completes one turn without moving hydraulic linkage');
  await page.locator('#mode').selectOption('sync');
  const height = (await read()).height;
  await page.locator('#play').click();
  await page.waitForTimeout(500);
  await page.locator('#play').click();
  check(Math.abs((await read()).height-height)<1e-8, 'synchronized screw and nut retain height');
  await page.locator('.c2-fullscreen:visible').click();
  await page.waitForFunction(() => document.querySelector('.c2-expanded'));
  await page.locator('.c2-fullscreen:visible').click();
  await page.waitForFunction(() => !document.querySelector('.c2-expanded'));
  await page.screenshot({path:'artifacts/screenshots/mechanism-screw-final.png'});
  await page.setViewportSize({width:390,height:844});
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mechanism mobile width');
  check(errors.length === 0, `page errors ${errors.join(' ')}`);
  return {base,checks,errors,samples:samples.length};
}

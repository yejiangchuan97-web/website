async page => {
  const base = new URL('../../../../../', page.url()).href;
  const root = base + 'course/chapters/02/tasks/2-1/';
  const errors = [], checks = [];
  const check = (value, label) => { if (!value) throw Error(label); checks.push(label); };
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => route.continue());
  await page.setViewportSize({width:1407,height:964});
  for (const [name,path] of [['motor','index.html'],['single','diesel.html'],['four','diesel.html#diesel-four']]) {
    await page.goto(root + path);
    await page.locator('.power-notes h2').waitFor();
    const motor = name === 'motor';
    const state = () => page.evaluate(motor => motor ? motorLab.getState() : engineLab.getState(), motor);
    const model = await page.evaluate(motor => motor ? motorLab.getRenderInfo() : engineLab.getDiagnostics(), motor);
    check(model.webgl && (motor ? model.vertices === 89376 : name === 'single' ? model.mode === 1 && model.meshes === 171 : model.mode === 4 && model.multi.assemblies === 34 && model.multi.meshes === 669), `${name} original model`);
    check(await page.locator('.power-notes > section > p').first().textContent(), `${name} observation prompts`);
    check(!/端电压|轴端阻性负载|进阶学习|机器人应用|六缸|多缸协同|四冲程观察/.test(await page.locator('body').innerText()), `${name} introductory layout`);
    const initial = await state();
    await page.locator('#stepBtn').click();
    check((await state()).angle !== initial.angle, `${name} step moves mechanism`);
    if (motor) {
      for (const direction of [-1,1]) {
        await page.locator(direction < 0 ? '#reverseBtn' : '#forwardBtn').click();
        const before = await state();
        await page.locator('#stepBtn').click();
        const after = await state();
        const turn = Math.atan2(Math.sin(after.angle-before.angle), Math.cos(after.angle-before.angle));
        check(after.dir === direction && after.paused && Math.sign(turn) === direction, `motor ${direction} wiring changes actual shaft direction`);
        check(await page.locator(direction < 0 ? '#reverseBtn' : '#forwardBtn').getAttribute('aria-pressed') === 'true', `motor ${direction} wiring feedback`);
      }
      check((await page.locator('.power-reading').innerText()).includes('减速器'), 'motor shows the joint drive path');
      await page.locator('[data-part="rotor"]').click();
      check((await state()).part === 'rotor', 'motor part focuses');
      await page.locator('#viewReset').click();
      await page.locator('#reverseBtn').focus();
      await page.keyboard.press('Enter');
      check((await state()).dir === -1, 'motor wiring supports keyboard');
    } else {
      for (let phase=0; phase<4; phase++) {
        await page.locator(`[data-stroke="${phase}"]`).click();
        const current = await state();
        const local = name === 'single' ? current.angle : await page.evaluate(() => engineLab.getDiagnostics().multi.phases.find(p=>p.cylinder===engineLab.getState().observed).local);
        check(Math.abs(local-(phase*180+90))<1e-8 && !current.running, `${name} phase ${phase} positions original mechanism`);
        check(await page.locator(`[data-stroke="${phase}"]`).getAttribute('aria-pressed') === 'true', `${name} phase ${phase} active feedback`);
      }
      if (name === 'four') {
        await page.locator('#observeCylinder').selectOption('3');
        await page.locator('[data-stroke="1"]').click();
        check((await state()).observed === 3 && await page.evaluate(() => engineLab.getDiagnostics().multi.phases.find(p=>p.cylinder===3).local) === 270, 'four phase selection follows selected cylinder');
        check((await page.locator('#cycleFeedback').innerText()).includes('第 3 缸'), 'four observation feedback follows selected cylinder');
      }
      await page.locator('#cycleRange').fill('200');
      check((await state()).angle === 200 && !(await state()).running, `${name} scrub positions actual crankshaft`);
      await page.locator('#explodeBtn').click();
      check(await page.locator('[data-stroke="0"]').isDisabled() && await page.locator('#cycleRange').isDisabled(), `${name} cycle controls wait for reassembly`);
      await page.locator('#explodeBtn').click();
      await page.locator('[data-stroke="0"]').waitFor({state:'visible'});
      await page.waitForFunction(() => !document.querySelector('[data-stroke="0"]').disabled);
      await page.locator('#cutToggle').uncheck();
      await page.locator('[data-stroke="2"]').click();
      check((await state()).cut, `${name} phase observation opens cutaway`);
      await page.locator('.power-part-list summary').click();
      await page.locator('#partsList button').first().click();
      check(await page.locator('.power-notes #selectionCard').isVisible(), `${name} original part description`);
      await page.locator('#clearSelection').click();
      await page.locator('.power-part-list summary').click();
      await page.locator('#cutToggle').uncheck();
      check(!(await state()).cut, `${name} cutaway control`);
      await page.locator('#cutToggle').check();
      await page.locator('#cycleRange').focus();
      const angle = (await state()).angle;
      await page.keyboard.press('ArrowRight');
      check((await state()).angle > angle, `${name} cycle scrub supports keyboard`);
    }
    await page.locator(motor ? '#resetBtn' : '#resetAll').click();
    const resetState = await state();
    check(motor ? resetState.dir === 1 && resetState.paused : resetState.observed === 1 && resetState.angle === 25 && !resetState.running, `${name} original reset restores interaction state`);
    if (!motor) check(await page.locator('#observeCylinder').inputValue() === '1', `${name} observed cylinder resets`);
    await page.locator(motor?'#pauseBtn':'#playBtn').click();
    await page.locator('#c2-guide').click();
    const stopped = await state();
    check(motor?stopped.paused:!stopped.running, `${name} guide pauses`);
    await page.keyboard.press('Escape');
    await page.locator('.c2-fullscreen').click();
    await page.waitForFunction(() => document.querySelector('.c2-expanded'));
    await page.locator('.c2-fullscreen').click();
    await page.waitForFunction(() => !document.querySelector('.c2-expanded'));
    check((await state()).angle === stopped.angle, `${name} fullscreen preserves pose`);
    if (!base.startsWith('file:')) await page.screenshot({path:`artifacts/screenshots/2-1-interactive-${name}.png`,animations:'disabled'});
    await page.locator('#course-theme-toggle').click();
    check(await page.evaluate(() => document.documentElement.dataset.theme === 'dark'), `${name} dark theme`);
    if (!base.startsWith('file:')) await page.screenshot({path:`artifacts/screenshots/2-1-interactive-${name}-dark.png`,animations:'disabled'});
    await page.locator('#course-theme-toggle').click();
    await page.setViewportSize({width:390,height:844});
    check(await page.locator('.power-notes').isVisible() && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} mobile layout`);
    await page.setViewportSize({width:1407,height:964});
  }
  await page.locator('.power-tabs a').nth(1).click();
  await page.waitForFunction(() => engineLab.getState().mode === 1);
  await page.locator('.power-tabs a').nth(2).click();
  await page.waitForFunction(() => engineLab.getState().mode === 4);
  check(await page.locator('.power-notes h2').textContent() === '四缸柴油机', 'same page engine switching');
  const firingOrder = await page.evaluate(() => [15,195,375,555].map(angle => {
    engineLab.setAngle(angle);
    return document.querySelector('#powerCylinders').textContent;
  }));
  check(firingOrder.join('') === [1,3,4,2].map(number => `第 ${number} 缸处于做功阶段。`).join(''), 'working cylinder note follows the original model');
  await page.locator('.power-tabs a').nth(1).click();
  await page.locator('.power-notes h2').getByText('单缸柴油机').waitFor();
  check(!await page.locator('#powerCylinders').isVisible(), 'four-cylinder note clears on switch to single cylinder');
  await page.goto(base + 'course/chapters/02/overview/index.html');
  check(await page.locator('.task-cards a').count() === 5, 'chapter links to separate motor and diesel pages');
  const context = await page.context().browser().newContext({reducedMotion:'reduce'});
  await context.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      return /webgl/i.test(type) ? null : original.call(this,type,...args);
    };
  });
  try {
    const fallback = await context.newPage();
    fallback.on('pageerror', error => errors.push(error.message));
    for (const path of ['index.html','diesel.html']) {
      await fallback.goto(root+path);
      check(await fallback.locator('#fallback:visible,.c2-render-fallback:visible').first().isVisible(), `${path} 2D fallback`);
      const angle = () => fallback.evaluate(() => (window.motorLab || window.engineLab).getState().angle);
      const initial = await angle();
      await fallback.locator('#stepBtn').click();
      check(await angle() !== initial, `${path} fallback step`);
      if (path === 'diesel.html') {
        await fallback.locator('[data-stroke="2"]').click();
        check(await angle() === 450, 'fallback phase selector positions mechanism');
      } else {
        await fallback.locator('#reverseBtn').click();
        check(await fallback.evaluate(() => motorLab.getState().dir === -1), 'fallback motor wiring');
      }
    }
  } finally { await context.close(); }
  check(errors.length === 0, `page errors ${errors.join(' ')}`);
  return {base, checks, errors};
}

import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import {createHash} from 'node:crypto';

// Browser-only acceptance suite. Does not modify the teaching source or reference.
const { chromium } = createRequire(import.meta.url)(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root = dirname(fileURLToPath(import.meta.url));
const output = join(root, process.argv.find(a => a.startsWith('--out='))?.slice(6) || 'v2-results');
const target = process.argv.find(a => a.startsWith('--url='))?.slice(6) || new URL('../../4-1.html', import.meta.url).href;
const only = process.argv.find(a => a.startsWith('--only='))?.slice(7)?.split(',');
const htmlSHA256 = target.startsWith('file:') ? createHash('sha256').update(await readFile(fileURLToPath(target))).digest('hex') : null;
const report = { started: new Date().toISOString(), target, htmlSHA256, only: only || null, checks: [], screenshots: [], pages: [], notes: [] };
const assert = (value, message) => { if (!value) throw new Error(message); };
const closeTo = (a, b, tolerance = .015) => Math.abs(Number(a) - b) <= tolerance;
await mkdir(output, { recursive: true });
await mkdir(join(output, 'fixtures'), { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--do-not-de-elevate', '--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let activePage;
async function check(name, fn) {
  if (only && !only.some(prefix => name.startsWith(prefix))) return;
  const started = Date.now();
  try { const detail = await fn(); report.checks.push({ name, pass: true, ms: Date.now() - started, detail }); console.log('PASS ' + name); }
  catch (error) { report.checks.push({ name, pass: false, ms: Date.now() - started, error: error.message }); console.log('FAIL ' + name + ': ' + error.message); }
}
async function shot(page, name, fullPage = true) {
  await page.waitForTimeout(250); const path = join(output, name + '.png'); await page.screenshot({ path, fullPage }); report.screenshots.push(path); return path;
}
async function openPage(label, options = {}, init) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1, acceptDownloads: true, ...options });
  const page = await context.newPage(); activePage = page;
  const log = { label, pageErrors: [], consoleErrors: [], glErrors: [], failedRequests: [], remoteRequests: [] };
  report.pages.push(log);
  page.on('pageerror', e => log.pageErrors.push(e.message));
  page.on('console', m => {
    if (m.type() === 'error') log.consoleErrors.push(m.text());
    if (/INVALID_OPERATION|INVALID_ENUM|INVALID_VALUE|CONTEXT_LOST_WEBGL|WebGL.*(?:context lost|render.*error)/i.test(m.text())) log.glErrors.push(m.text());
  });
  page.on('requestfailed', r => log.failedRequests.push({ url: r.url(), error: r.failure()?.errorText }));
  page.on('request', r => { if (/^https?:/.test(r.url()) && !/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(r.url())) log.remoteRequests.push(r.url()); });
  if (init) await page.addInitScript(init);
  await page.goto(target, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__SENSE__, undefined, { timeout: 20000 });
  await page.waitForTimeout(600);
  return { context, page, log };
}
async function input(page, id, value) {
  await page.locator(id).evaluate((el, val) => {
    const setter = Object.getOwnPropertyDescriptor(el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value').set;
    setter.call(el, String(val)); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await page.waitForFunction(() => { const s = window.__SENSE__.snapshot(), m = s.sample, st = s.state; const want = st.experiment === 'rotation' ? [m.yaw, m.omega, st.duration] : st.experiment === 'position' ? [m.position, m.estimate, m.error] : m.acc; return ['A','B','C'].every((c,i) => Math.abs(Number(document.getElementById('read' + c).textContent) - want[i]) < (st.experiment === 'rotation' && i !== 1 ? .051 : .006)); }, undefined, {timeout: 5000});
}
async function rawSnapshot(page) { return page.evaluate(() => window.__SENSE__.snapshot()); }
async function snapshot(page) {
  return page.evaluate(() => {
    const s = window.__SENSE__.snapshot();
    return { raw: s, state: s.state || s, sample: s.sample || s.model || s.reading || s.current || null };
  });
}
async function count(page) { return page.evaluate(() => window.__SENSE__.records.length); }
async function experiment(page, id) { await page.locator('[data-experiment="' + id + '"]').click(); await page.waitForTimeout(160); }
async function capture(page) { const before = await count(page); await page.locator('#captureButton').click(); await page.waitForTimeout(110); return { before, after: await count(page) }; }
async function choice(page, index = 1) { await page.locator('#challengeChoices button').nth(index).click(); await page.locator('#checkAnswer').click(); await page.waitForTimeout(80); return page.locator('#challengeFeedback').textContent(); }
async function selectHeader(page, id, text) {
  const option = await page.locator(id + ' option').evaluateAll((els, header) => els.find(e => e.textContent.trim() === header || e.textContent.includes(header))?.value, text);
  assert(option !== undefined, id + ' has no option for ' + text); await input(page, id, option);
}

try {
 const desktop = await openPage('desktop'); const page = desktop.page;
 await check('01-ready-and-layout', async () => {
   assert(await page.locator('#viewport canvas').count() > 0, 'No real WebGL canvas');
   assert(!await page.locator('#fallback').isVisible(), 'WebGL unexpectedly fell back');
   const geometry = await page.evaluate(() => ({ width: innerWidth, overflow: document.documentElement.scrollWidth - innerWidth, stage: (() => { const r = document.querySelector('.stage').getBoundingClientRect(); return { width: r.width, height: r.height }; })(), controls: (() => { const r = document.querySelector('.controls').getBoundingClientRect(); return { width: r.width, height: r.height }; })(), stats: window.__SENSE__.sceneStats() }));
   assert(geometry.overflow <= 1, 'Desktop horizontal overflow'); assert(geometry.stage.width >= 800, 'Stage is too narrow'); assert(geometry.stage.height >= 500, 'Stage is too short');
   await shot(page, '01-desktop-light'); return geometry;
 });
 await check('02-theme-and-views', async () => {
   await page.locator('#darkTheme').click(); assert(await page.locator('html').getAttribute('data-theme') === 'dark', 'Dark theme not applied');
   assert(await page.locator('#darkTheme').getAttribute('aria-pressed') === 'true', 'Dark theme pressed state missing'); await shot(page, '02-desktop-dark');
   await page.locator('#lightTheme').click(); await page.waitForTimeout(350);
   const views = [];
   for (const view of ['front', 'side', 'top', 'iso']) { await page.locator('[data-view="' + view + '"]').click(); await page.waitForTimeout(650); assert(await page.locator('[data-view="' + view + '"]').getAttribute('aria-pressed') === 'true', 'View button not selected: ' + view); views.push({ view, stats: await page.evaluate(() => window.__SENSE__.sceneStats()) }); }
   await page.locator('#resetView').click(); return views;
 });
 await check('03-observe-operate-and-components', async () => { if (await page.locator('#modelOptions').count()) await page.locator('#modelOptions > summary').click();
   for (const part of ['imu', 'phone', 'turntable', 'chassis']) { await page.locator('[data-part="' + part + '"]').click(); assert(await page.locator('#selectionCard').isVisible(), part + ' details did not open'); assert((await page.locator('#partName').textContent()).trim().length > 0, 'Part name is empty'); await page.locator('#clearSelection').click(); }
   await page.locator('#inspectToggle').uncheck(); await page.locator('#inspectToggle').check();
   await page.locator('#axesToggle').uncheck(); await page.locator('#axesToggle').check();
   await page.locator('[data-mode="operate"]').click(); const box = await page.locator('#viewport').boundingBox();
   const before = await snapshot(page); await page.mouse.move(box.x + box.width * .52, box.y + box.height * .56); await page.mouse.down(); await page.mouse.move(box.x + box.width * .52, box.y + box.height * .42, { steps: 12 }); await page.mouse.up(); await page.waitForTimeout(160); const after = await snapshot(page);
   assert(!closeTo(before.state.tilt, after.state.tilt, .01), 'Operate drag did not change tilt');
   await page.locator('#viewport').focus(); const keyBefore = (await snapshot(page)).state.tilt; await page.keyboard.press('ArrowUp'); const keyAfter = (await snapshot(page)).state.tilt; assert(keyBefore !== keyAfter, 'Keyboard did not change tilt');
   await page.locator('[data-mode="observe"]').click(); return { before: before.state.tilt, after: after.state.tilt, keyBefore, keyAfter };
 });
 await check('04-gravity-model-and-challenge', async () => {
   await experiment(page, 'gravity'); const feedbackBefore = await choice(page); assert(!/已验证|验证完成|证据充分/.test(await page.locator('#challengeBadge').textContent()), 'Challenge passed without evidence');
   const samples = [];
   for (const tilt of [0, 30, -30, 50, -50]) {
     await input(page, '#tiltRange', tilt); const s = await snapshot(page); const numbers = await page.locator('#stageReadouts strong').allTextContents();
     assert(closeTo(Number(numbers[0]), 0, .02), 'Static ax unexpected'); assert(closeTo(Number(numbers[1]), 9.81 * Math.sin(tilt * Math.PI / 180), .025), 'Static ay inconsistent with tilt'); assert(closeTo(Number(numbers[2]), 9.81 * Math.cos(tilt * Math.PI / 180), .025), 'Static az inconsistent with tilt');
     assert(closeTo(Math.hypot(...numbers.map(Number)), 9.81, .025), 'Static norm changed with tilt'); await page.locator('#viewport').scrollIntoViewIfNeeded(); await page.waitForFunction(() => { const s = __SENSE__.snapshot(); return !s.scene.available || Math.abs(s.scene.tilt - s.sample.tilt) < .001; }, undefined, {timeout:3000}).catch(async e=>{throw Error('Scene pose did not synchronize: '+JSON.stringify(await rawSnapshot(page)));}); const scene = await page.evaluate(() => window.__SENSE__.sceneStats()); if (scene.available) for (let i = 0; i < 3; i++) { const axis = scene.robotWorldAxes['xyz'[i]]; const dot = -scene.worldGravity.reduce((sum,g,j) => sum + g * axis[j], 0) * 9.81; assert(closeTo(dot, s.sample.acc[i], .00001), 'Three.js body axis does not match acceleration: ' + tilt + ' xyz'[i]); } samples.push({ tilt, snapshot: s.raw, scene });
   }
   await page.locator('#gravityToggle').uncheck(); const zero = (await page.locator('#stageReadouts strong').allTextContents()).map(Number); assert(zero.every(v => Math.abs(v) < .005), 'Ideal removed-gravity static reading is not zero'); await page.locator('#gravityToggle').check();
   await input(page, '#tiltRange', 0); await capture(page); await input(page, '#tiltRange', 30); const saved = await capture(page); assert(saved.after === saved.before + 1, 'Gravity evidence not recorded'); const feedback = await choice(page); await shot(page, '03-gravity-30'); return { feedbackBefore, feedback, samples };
 });
 await check('05-rotation-same-angle-different-speed', async () => {
   await experiment(page, 'rotation'); const runs = [];
   for (const duration of [4, 1]) {
     await input(page, '#durationRange', duration); await page.locator('#primaryAction').click(); await page.locator('#playButton').click().catch(() => {}); await input(page, '#timeRange', .5 + duration / 2);
     const peak = await snapshot(page); const omega = Number((await page.locator('#omegaReadout').textContent()).match(/[-\d.]+/)[0]); assert(closeTo(omega, 1.5 * Math.PI / 2 / duration, .02), 'Angular speed does not match smooth 90 degree turn');
     await input(page, '#timeRange', .5 + duration); const end = await snapshot(page); const yaw = Number((await page.locator('#yawReadout').textContent()).match(/[-\d.]+/)[0]); assert(closeTo(yaw, 90, .11), 'Turn endpoint is not 90 degrees'); const saved = await capture(page); assert(saved.after === saved.before + 1, 'Rotation evidence not saved'); runs.push({ duration, peak: peak.raw, end: end.raw, omega });
   }
   assert(closeTo(runs[1].omega / runs[0].omega, 4, .15), 'Fast turn peak is not 4 times slow peak'); const feedback = await choice(page); await shot(page, '04-rotation'); return { runs, feedback };
 });
 await check('06-vibration-repeated-window-and-confound', async () => {
   await experiment(page, 'vibration'); assert(await page.locator('#vibrationControls').isVisible(), 'Vibration controls absent');
   await input(page, '#frequencyRange', 8); await page.locator('#primaryAction').click(); await input(page, '#timeRange', 10); const exploratory = await capture(page); await input(page, '#frequencyRange', 4); const captures = [];
   for (let trial = 0; trial < 3; trial++) { await page.locator('#primaryAction').click(); await input(page, '#timeRange', 10); captures.push(await capture(page)); }
   assert(captures.every(r => r.after === r.before + 1), 'Repeated vibration trials not recorded');
   await page.locator('#looseToggle').check(); await page.locator('#primaryAction').click(); await input(page, '#timeRange', 3); await page.locator('#tapButton').click(); await input(page, '#timeRange', 10); const loose = await capture(page); const feedback = await choice(page); assert((await page.locator('#challengeBadge').textContent()).includes('已验证'), 'Exploratory conditions incorrectly block a valid matched vibration group'); await shot(page, '05-vibration'); return { exploratory, captures, loose, feedback, snapshot: await rawSnapshot(page) };
 });
 await check('07-position-independent-reference-and-bias', async () => {
   await experiment(page, 'position'); await page.locator('#noBias').click(); await input(page, '#timeRange', 0); const a = await capture(page);
   await page.locator('#primaryAction').click(); await input(page, '#timeRange', 10); const unbiased = await snapshot(page); const truth = Number((await page.locator('#positionReadout').textContent()).match(/[-\d.]+/)[0]); const estimate0 = Number((await page.locator('#estimateReadout').textContent()).match(/[-\d.]+/)[0]); assert(closeTo(truth, .5, .005), 'Independent reference endpoint is not 0.50m'); assert(closeTo(estimate0, truth, .005), 'Unbiased model drifted'); const b = await capture(page);
   await page.locator('#typicalBias').click(); await input(page, '#timeRange', 10); const estimate = Number((await page.locator('#estimateReadout').textContent()).match(/[-\d.]+/)[0]); assert(closeTo(estimate - truth, .5, .015), '0.01 bias over 10s did not cause 0.50m drift'); const biased = await capture(page); const feedback = await choice(page); await shot(page, '06-position'); return { a, b, biased, unbiased: unbiased.raw, truth, estimate, feedback };
 });
 await check('08-records-export-and-persistence', async () => {
   await page.locator('#recordBtn').click(); assert(await page.locator('#recordsDialog').isVisible(), 'Notebook did not open'); await page.locator('#studentName').fill('第3组 · 验收');
   const exports = [];
   for (const [selector, name] of [['#exportRecords', 'experiment-records.json'], ['#exportCSV', 'experiment-records.csv']]) { const [download] = await Promise.all([page.waitForEvent('download'), page.locator(selector).click()]); const path = join(output, name); await download.saveAs(path); const data = await readFile(path, 'utf8'); assert(data.length > 80, 'Export is empty'); if (name.endsWith('.json')) { assert(data.includes('第3组'), 'JSON export lost student name'); JSON.parse(data); } else { assert(data.includes('source') && data.includes('conditions'), 'CSV export lost provenance or conditions'); } exports.push({ path, bytes: data.length, suggested: download.suggestedFilename() }); }
   await page.locator('[data-close="recordsDialog"]').click(); return { exports, records: await count(page) };
 });
 await check('09-csv-units-missing-axis-and-provenance', async () => {
   const csv = join(output, 'fixtures', 'phone-ms-g-missing-y.csv'); const lines = ['time_ms;acc_x_g;acc_z_g']; for (let i = 0; i <= 1000; i++) lines.push(`${i * 10};${(.2 * Math.sin(i / 17)).toFixed(6)};1`); await writeFile(csv, lines.join('\n'), 'utf8');
   const poseBefore = await snapshot(page); await page.locator('#recordBtn').click(); await page.locator('#importDetails').evaluate(el => el.open = true); await page.locator('#csvFile').setInputFiles(csv); await page.waitForTimeout(180);
   await selectHeader(page, '#csvTime', 'time_ms'); await input(page, '#csvTimeUnit', '.001'); await selectHeader(page, '#csvX', 'acc_x_g'); await selectHeader(page, '#csvZ', 'acc_z_g');
   const missing = await page.locator('#csvY option').evaluateAll(els => els.find(e => /未提供|无|缺失|不使用|不选|—/.test(e.textContent))?.value ?? els[0].value); await input(page, '#csvY', missing); await input(page, '#csvAccelUnit', '9.81'); await page.locator('#applyCSV').click(); await page.waitForTimeout(150); assert(await page.locator('#importedChart').isVisible(), 'Valid semicolon/ms/g CSV did not import');
   await input(page, '#csvAxis', 1); const beforeMissing = await count(page); await page.locator('#saveCSV').click(); assert(await count(page) === beforeMissing, 'Missing y axis was fabricated or saved');
   await input(page, '#csvAxis', 2); await input(page, '#csvFrom', 20); await input(page, '#csvTo', 30); const beforeEmpty = await count(page); await page.locator('#saveCSV').click(); assert(await count(page) === beforeEmpty, 'Empty sample window was saved');
   await input(page, '#csvFrom', 2); await input(page, '#csvTo', 8); await page.locator('#saveCSV').click(); assert(await count(page) === beforeMissing + 1, 'Valid real-data window was not saved');
   const importedRecord = await page.evaluate(() => window.__SENSE__.records.at(-1)); const serialized = JSON.stringify(importedRecord); assert(/phone-ms-g-missing-y|实测|导入|csv/i.test(serialized), 'CSV record has no provenance'); const poseAfter = await snapshot(page); assert(closeTo(poseBefore.state.tilt, poseAfter.state.tilt) && closeTo(poseBefore.state.time, poseAfter.state.time), 'Imported accelerations incorrectly changed model pose/time');
   await shot(page, '07-csv-notebook'); const status = await page.locator('#csvStatus').textContent(); await page.locator('[data-close="recordsDialog"]').click(); return { importedRecord, status };
 });
 await check('10-four-experiments-and-no-long-control-stack', async () => {
   const sections = ['#gravityControls', '#rotationControls', '#vibrationControls', '#positionControls']; const visible = [];
   for (const [i, exp] of ['gravity', 'rotation', 'vibration', 'position'].entries()) { await experiment(page, exp); const visibility = await Promise.all(sections.map(s => page.locator(s).isVisible())); assert(visibility.filter(Boolean).length === 1 && visibility[i], exp + ' exposes irrelevant experiment controls'); visible.push({ exp, visibility }); }
   const completion = await page.locator('#completionText').textContent(); assert(completion.replaceAll(' ', '').includes('4/4'), 'Four evidence-backed challenges did not all complete: ' + completion); return { visible, completion };
 });
 await check('11-desktop-no-errors-or-network', async () => { assert(desktop.log.pageErrors.length === 0, desktop.log.pageErrors.join('\n')); assert(desktop.log.glErrors.length === 0, desktop.log.glErrors.join('\n')); assert(desktop.log.consoleErrors.length === 0, desktop.log.consoleErrors.join('\n')); assert(desktop.log.remoteRequests.length === 0, 'Offline page requests external resources'); return desktop.log; });
 await desktop.context.close();

 await check('12-phone-390-and-touch-layout', async () => {
   const mobile = await openPage('phone390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const p = mobile.page;
   const layout = await p.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, stage: document.querySelector('.stage').getBoundingClientRect().toJSON(), controls: document.querySelector('.controls').getBoundingClientRect().toJSON(), defaultImportOpen: document.querySelector('#importDetails').open })); assert(layout.scrollWidth <= 391, 'Phone has horizontal overflow'); assert(layout.stage.height >= 420, 'Phone model stage too short'); assert(!layout.defaultImportOpen, 'CSV long form is not collapsed');
   await shot(p, '08-phone-full'); await shot(p, '09-phone-first-screen', false);
   assert(await p.locator('#miniRange').isVisible(), 'Phone has no direct model control'); await input(p, '#miniRange', 30); const beforeQuick = await count(p); await p.locator('#quickCapture').click(); assert(await count(p) === beforeQuick + 1, 'On-stage phone evidence action failed'); await p.locator('#stageAction').click(); await input(p, '#tiltRange', 30); const saved = await capture(p); assert(saved.after === saved.before + 1, 'Phone evidence action failed'); await experiment(p, 'rotation'); assert(await p.locator('#rotationControls').isVisible(), 'Phone cannot switch experiments'); assert(!await p.locator('#gravityControls').isVisible(), 'Phone retains irrelevant controls');
   assert(mobile.log.pageErrors.length === 0, mobile.log.pageErrors.join('\n')); await mobile.context.close(); return layout;
 });
 await check('13-reduced-motion-still-and-usable', async () => {
   const reduced = await openPage('reduced', { reducedMotion: 'reduce' }); const p = reduced.page; await experiment(p, 'rotation'); const a = await snapshot(p); await p.waitForTimeout(450); const b = await snapshot(p); assert(closeTo(a.state.time, b.state.time, .0001), 'Reduced motion advances automatically'); await input(p, '#timeRange', 4.5); assert(closeTo(Number((await p.locator('#yawReadout').textContent()).match(/[-\d.]+/)[0]), 90, .1), 'Reduced motion manual seeking unusable'); await shot(p, '10-reduced-motion'); assert(reduced.log.pageErrors.length === 0, reduced.log.pageErrors.join('\n')); await reduced.context.close(); return { a: a.raw, b: b.raw };
 });
 await check('14-webgl-fallback-controls-and-no-crash', async () => {
   const fallback = await openPage('no-webgl', {}, () => { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type, ...args) { if (/^(webgl2?|experimental-webgl)$/.test(type)) return null; return original.call(this, type, ...args); }; }); const p = fallback.page;
   assert(await p.locator('#fallback').isVisible(), 'WebGL failure does not show fallback'); await input(p, '#tiltRange', 30); const y = Number((await p.locator('#readB').textContent()).trim()); assert(closeTo(y, 4.905, .025), 'Fallback lost teaching calculations'); const result = await capture(p); assert(result.after === result.before + 1, 'Fallback cannot save evidence'); await shot(p, '11-no-webgl'); assert(fallback.log.pageErrors.length === 0, fallback.log.pageErrors.join('\n')); const detail = { log: fallback.log, snapshot: await rawSnapshot(p) }; await fallback.context.close(); return detail;
 });
} catch (error) {
 report.fatal = error.stack;
 if (activePage && !activePage.isClosed()) { await shot(activePage, 'fatal-page').catch(() => {}); }
 console.error(error.stack);
} finally {
 report.finished = new Date().toISOString(); report.passed = !report.fatal && report.checks.every(c => c.pass); await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, failed: report.checks.filter(c => !c.pass).map(c => c.name), report: join(output, 'report.json') }, null, 2)); if (!report.passed) process.exitCode = 1;
}










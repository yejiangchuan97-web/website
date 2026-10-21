import {fileURLToPath as __taskFileURL} from 'node:url';
const __taskFile=p=>__taskFileURL(new URL(p,import.meta.url));
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const qa = __taskFile("."), base = __taskFile("../../公共资源/感知与识别");
const output = __taskFile("./prediction-evaluation");
await mkdir(output, { recursive: true });
const report = { generatedAt: new Date().toISOString(), tests: [], browserErrors: [], externalRequests: [], screenshots: [] };
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--do-not-de-elevate', '--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const desktop = await browser.newContext({ viewport: { width: 1365, height: 1000 } });
const page = await desktop.newPage();
function observe(page) {
  page.on('pageerror', error => report.browserErrors.push({ url: page.url(), message: error.message }));
  page.on('request', request => {if (/^https?:/.test(request.url())) report.externalRequests.push(request.url());});
}
observe(page);
async function test(name, action) {try {await action(); report.tests.push({ name, status: 'pass' });} catch (error) {report.tests.push({ name, status: 'fail', error: error.stack || error.message });}}
const url = (name, query = '') => `${pathToFileURL(join(base, name)).href}${query}`;
const range = async (id, value, target = page) => target.locator(`#${id}`).evaluate((element, next) => {element.value = String(next); element.dispatchEvent(new Event('input', { bubbles: true }));}, value);
const prediction = target => (target || page).evaluate(() => window.helmetPredictionState());
const evaluation = target => (target || page).evaluate(() => window.helmetEvaluationState());
const counts = state => [state.tp, state.fp, state.fn];
async function fillChallenge(values) {for (const [key, value] of Object.entries(values)) await page.locator(`#challenge-${key}`).fill(String(value));}

await test('预测页初始化：固定7候选，五个人工目标图，默认阈值0.25', async () => {
  await page.goto(url('4-3-predict.html'));
  const state = await prediction(); assert.equal(state.total, 7); assert.equal(state.kept, 7); assert.equal(state.threshold, .25);
  assert.equal(await page.locator('#prediction-svg .prediction-box').count(), 7);
  assert.equal(await page.locator('#prediction-candidate-list button').count(), 7);
  assert.equal(await page.locator('main main').count(), 0);
  assert.match(await page.locator('#prediction-threshold-help').textContent(), /NMS/);
  assert.match(await page.locator('.prediction-flow').textContent(), /没有加载或运行 YOLO/);
});
await test('预测页0.50同步更新保留3/筛除4，原始分数不变', async () => {
  await page.locator('[data-prediction-threshold="0.50"]').click();
  const state = await prediction(); assert.equal(state.kept, 3); assert.equal(state.filtered, 4);
  assert.equal(await page.locator('#prediction-svg .prediction-box').count(), 3);
  assert.deepEqual(state.candidates.map(p => p.score), [.91,.42,.83,.35,.61,.28,.31]);
  assert.equal(await page.locator('#prediction-next-evaluation').getAttribute('href'), '4-3-evaluate.html?threshold=0.50');
});
await test('筛除候选仍可定位，自动打开筛除框且选中项绘于最后', async () => {
  await page.locator('[data-prediction-candidate="P02"]').click();
  const state = await prediction(); assert.equal(state.showFiltered, true); assert.equal(state.selectedId, 'P02');
  assert.equal(await page.locator('#prediction-svg .prediction-box').count(), 7);
  assert.equal(await page.locator('#prediction-svg > g').last().getAttribute('data-prediction-box'), 'P02');
});
await test('SVG候选可用键盘选择与取消', async () => {
  const target = page.locator('#prediction-svg [data-prediction-box="P07"]'); await target.focus(); await target.press('Enter');
  assert.equal((await prediction()).selectedId, 'P07');
  assert.equal(await target.evaluate(element => element === document.activeElement), true);
  await target.press('Space'); assert.equal((await prediction()).selectedId, null);
});
await test('预测分数等于阈值仍保留；0.92与1.00无保留，0.00全保留', async () => {
  await page.locator('#prediction-show-filtered').uncheck();
  await range('prediction-threshold', .91); assert.equal((await prediction()).kept, 1);
  await range('prediction-threshold', .92); assert.equal((await prediction()).kept, 0); assert.equal(await page.locator('#prediction-empty').isVisible(), true);
  await page.locator('#prediction-threshold').focus(); await page.locator('#prediction-threshold').press('End'); assert.equal((await prediction()).threshold, 1);
  await page.locator('#prediction-threshold').press('Home'); assert.equal((await prediction()).threshold, 0); assert.equal((await prediction()).kept, 7);
});
await test('阈值参与题错误与正确两种反馈均可触发', async () => {
  await page.locator('[data-prediction-answer="always"]').click(); assert.equal((await prediction()).answer, 'always'); assert.equal(await page.locator('#prediction-answer-feedback').evaluate(el => el.classList.contains('is-correct')), false);
  await page.locator('[data-prediction-answer="tradeoff"]').click(); assert.equal((await prediction()).answer, 'tradeoff'); assert.equal(await page.locator('#prediction-answer-feedback').evaluate(el => el.classList.contains('is-correct')), true);
});
await test('预测跳评估携带阈值0.50，返回预测也恢复0.50', async () => {
  await range('prediction-threshold', .5); await page.locator('#prediction-next-evaluation').click();
  assert.equal((await evaluation()).threshold, .5); assert.deepEqual(counts(await evaluation()), [3,0,2]);
  await page.locator('#evaluation-back-prediction').click(); assert.equal((await prediction()).threshold, .5);
});
await test('评估0.25为TP4 FP3 FN1，P57.1% R80.0%，所有真值/预测同时显示', async () => {
  await page.goto(url('4-3-evaluate.html'));
  const state = await evaluation(); assert.deepEqual(counts(state), [4,3,1]); assert.equal(state.precision, 4/7); assert.equal(state.recall, .8);
  assert.equal(await page.locator('#evaluation-svg .truth-box').count(), 5); assert.equal(await page.locator('#evaluation-svg .evaluation-box').count(), 7);
  assert.equal(await page.locator('#evaluation-precision').textContent(), '57.1%'); assert.equal(await page.locator('#evaluation-recall').textContent(), '80.0%');
  assert.equal(await page.locator('main main').count(), 0);
});
await test('错类、重复、背景三种误检独立解释；错类仍留下真值漏检', async () => {
  const state = await evaluation();
  assert.equal(state.predictions.find(p => p.id === 'P04').reason, '类别错误'); assert.equal(state.predictions.find(p => p.id === 'P07').reason, '重复检测'); assert.equal(state.predictions.find(p => p.id === 'P06').reason, '背景误检'); assert.deepEqual(state.missed.map(t => t.id), ['H04']);
  await page.locator('#evaluation-prediction-list [data-evaluation-prediction="P04"]').click(); assert.match(await page.locator('#evaluation-selection-note').textContent(), /类别不一致/);
  await page.locator('#evaluation-prediction-list [data-evaluation-prediction="P07"]').click(); assert.match(await page.locator('#evaluation-selection-note').textContent(), /更高分/);
  await page.locator('#evaluation-prediction-list [data-evaluation-prediction="P06"]').click(); assert.match(await page.locator('#evaluation-selection-note').textContent(), /背景/);
  await page.locator('#evaluation-missed-list [data-evaluation-truth="H04"]').click(); assert.match(await page.locator('#evaluation-selection-note').textContent(), /计为 FN/);
});
await test('真值与预测叠加独立开关；点击真值可高亮，键盘可选预测', async () => {
  await page.locator('#evaluation-show-truth').uncheck(); assert.equal(await page.locator('#evaluation-svg .truth-box').count(), 0);
  await page.locator('#evaluation-show-prediction').uncheck(); assert.equal(await page.locator('#evaluation-svg .evaluation-box').count(), 0);
  await page.locator('#evaluation-show-truth').check(); await page.locator('#evaluation-show-prediction').check();
  const target = page.locator('#evaluation-svg [data-evaluation-prediction="P02"]'); await target.focus(); await target.press('Enter');
  assert.deepEqual((await evaluation()).selection, {type:'prediction', id:'P02'});
  assert.equal(await page.locator('#evaluation-svg > g').last().getAttribute('data-evaluation-prediction'), 'P02');
  assert.equal(await target.evaluate(element => element === document.activeElement), true);
  await target.press('Space'); assert.equal((await evaluation()).selection, null);
});
await test('更严格的IoU门槛使偏移P02失配；0.50可恢复标准计数', async () => {
  const start = await evaluation(); const p02 = start.predictions.find(p => p.id === 'P02'); assert.ok(p02.bestIoU > .5 && p02.bestIoU < .8);
  await range('evaluation-iou-threshold', .8); const strict = await evaluation(); assert.deepEqual(counts(strict), [3,4,2]); assert.equal(strict.predictions.find(p => p.id === 'P02').reason, '定位偏差');
  await range('evaluation-iou-threshold', .5); assert.deepEqual(counts(await evaluation()), [4,3,1]);
});
await test('评估0.50为3/0/2，P100% R60%；1.00空预测精确率不适用', async () => {
  await page.locator('[data-evaluation-threshold="0.50"]').click(); let state = await evaluation(); assert.deepEqual(counts(state), [3,0,2]); assert.equal(state.precision, 1); assert.equal(state.recall, .6);
  await range('evaluation-threshold', 1); state = await evaluation(); assert.deepEqual(counts(state), [0,0,5]); assert.equal(state.precision, null); assert.equal(state.recall, 0); assert.equal(await page.locator('#evaluation-precision').textContent(), '不适用'); assert.equal(await page.locator('#evaluation-zero-note').isVisible(), true);
  await page.locator('[data-evaluation-threshold="0.25"]').click();
});
await test('独立挑战隐藏指标、逐框结论与漏检身份，不泄露计数答案', async () => {
  await page.locator('#evaluation-start-challenge').click(); const state = await evaluation(); assert.equal(state.blind, true); assert.equal(state.showMetrics, false);
  for (const key of ['tp','fp','fn','precision','recall']) assert.equal(await page.locator(`#evaluation-${key}`).textContent(), '—');
  assert.equal(await page.locator('#evaluation-prediction-list .match-badge').first().textContent(), '待核对');
  assert.equal(await page.locator('#evaluation-svg .is-tp, #evaluation-svg .is-fp, #evaluation-svg .is-missed').count(), 0);
  assert.equal(await page.locator('#evaluation-missed-list button').count(), 5); assert.equal(await page.locator('#evaluation-missed-count').textContent(), '5');
  assert.doesNotMatch(await page.locator('#evaluation-prediction-list').textContent(), /正确匹配|类别错误|重复检测|背景误检/);
});
await test('挑战错误答案反馈保留独立核验；正确答案揭示计数与解释', async () => {
  await fillChallenge({tp:7,fp:0,fn:0}); await page.locator('#evaluation-challenge-form').evaluate(el => el.requestSubmit()); assert.equal((await evaluation()).blind, true); assert.equal(await page.locator('#challenge-tp').getAttribute('aria-invalid'), 'true');
  await fillChallenge({tp:4,fp:3,fn:1}); await page.locator('#evaluation-challenge-form').evaluate(el => el.requestSubmit()); const state = await evaluation(); assert.equal(state.blind, false); assert.equal(state.showMetrics, true); assert.match(await page.locator('#evaluation-challenge-feedback').textContent(), /核验通过/);
});
await test('阈值与IoU门槛改变清空答案；查看解析给出误检原因与漏检ID', async () => {
  await range('evaluation-threshold', .5); for (const key of ['tp','fp','fn']) assert.equal(await page.locator(`#challenge-${key}`).inputValue(), ''); assert.equal(await page.locator('#evaluation-challenge-feedback').isVisible(), false);
  await page.locator('#evaluation-start-challenge').click(); await page.locator('#evaluation-reveal-answer').click(); assert.equal((await evaluation()).blind, false); assert.equal(await page.locator('#challenge-tp').inputValue(), '3'); assert.match(await page.locator('#evaluation-challenge-feedback').textContent(), /H02、H04/);
  await range('evaluation-iou-threshold', .8); assert.equal(await page.locator('#challenge-tp').inputValue(), '');
});
await test('IoU独立位置实验：完全重合1、无重叠0、交并面积与滑条同步', async () => {
  await range('iou-offset', 0); let state = await evaluation(); assert.deepEqual(state.iouDemo, {offset:0, intersection:8000, union:8000, iou:1}); assert.equal(await page.locator('#iou-demo-value').textContent(), '1.000');
  await range('iou-offset', 100); state = await evaluation(); assert.deepEqual(state.iouDemo, {offset:100, intersection:0, union:16000, iou:0}); assert.equal(await page.locator('#iou-demo-value').textContent(), '0.000');
  await page.locator('#iou-offset').focus(); await page.locator('#iou-offset').press('ArrowLeft'); assert.equal((await evaluation()).offset, 99);
  await range('iou-offset', 30); assert.ok(Math.abs((await evaluation()).iouDemo.iou - 5600/10400) < 1e-12);
});
await test('非法URL阈值安全回退，不抛错或越界', async () => {
  await page.goto(url('4-3-evaluate.html', '?threshold=abc')); assert.equal((await evaluation()).threshold, .25);
  await page.goto(url('4-3-predict.html', '?threshold=9')); assert.equal((await prediction()).threshold, .25);
});
await page.goto(url('4-3-predict.html'));
await page.screenshot({ path: __taskFile("./prediction-evaluation/prediction-desktop.png"), fullPage: true }); report.screenshots.push("./prediction-evaluation/prediction-desktop.png");
await page.goto(url('4-3-evaluate.html'));
await page.screenshot({ path: __taskFile("./prediction-evaluation/evaluation-desktop.png"), fullPage: true }); report.screenshots.push("./prediction-evaluation/evaluation-desktop.png");

const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
const mobile = await mobileContext.newPage(); observe(mobile);
await test('390px手机预测页无横向溢出、候选可点击、原生滑条支持触控', async () => {
  await mobile.goto(url('4-3-predict.html'));
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await mobile.locator('[data-prediction-threshold="0.50"]').tap(); assert.equal((await prediction(mobile)).kept, 3);
  await mobile.locator('[data-prediction-candidate="P02"]').tap(); assert.equal((await prediction(mobile)).selectedId, 'P02');
  await mobile.locator('#prediction-threshold').scrollIntoViewIfNeeded(); const box = await mobile.locator('#prediction-threshold').boundingBox(); await mobile.touchscreen.tap(box.x + box.width*.82, box.y + box.height/2); assert.ok((await prediction(mobile)).threshold >= .7);
  await mobile.screenshot({ path: __taskFile("./prediction-evaluation/prediction-mobile.png"), fullPage: true }); report.screenshots.push("./prediction-evaluation/prediction-mobile.png");
});
await test('390px手机评估页无横向溢出、挑战核验/IoU滑条可用', async () => {
  await mobile.goto(url('4-3-evaluate.html'));
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await mobile.locator('#evaluation-start-challenge').tap(); assert.equal((await evaluation(mobile)).blind, true);
  await mobile.locator('#evaluation-reveal-answer').tap(); assert.equal((await evaluation(mobile)).blind, false); assert.equal(await mobile.locator('#challenge-fp').inputValue(), '3');
  await mobile.locator('#iou-offset').scrollIntoViewIfNeeded(); const box = await mobile.locator('#iou-offset').boundingBox(); await mobile.touchscreen.tap(box.x + box.width*.95, box.y + box.height/2); assert.ok((await evaluation(mobile)).offset > 100);
  await mobile.screenshot({ path: __taskFile("./prediction-evaluation/evaluation-mobile.png"), fullPage: true }); report.screenshots.push("./prediction-evaluation/evaluation-mobile.png");
});
await test('离线独立运行：无脚本异常或外网资源请求', async () => {assert.deepEqual(report.browserErrors, []); assert.deepEqual(report.externalRequests, []);});
await browser.close();
report.passed = report.tests.filter(test => test.status === 'pass').length; report.failed = report.tests.length - report.passed;
await writeFile(__taskFile("./prediction-evaluation-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: report.passed, failed: report.failed, errors: report.browserErrors, failures: report.tests.filter(test => test.status === 'fail').map(test => ({ name: test.name, error: test.error })) }, null, 2));
if (report.failed) process.exitCode = 1;

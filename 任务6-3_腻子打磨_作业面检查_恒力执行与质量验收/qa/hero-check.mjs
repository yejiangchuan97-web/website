import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Uses the already-installed runtime. It does not install dependencies or alter source files.
const qa = dirname(fileURLToPath(import.meta.url));
const task = dirname(qa);
const output = join(qa, 'hero-artifacts');
mkdirSync(output, { recursive: true });
const require = createRequire(import.meta.url);
const { chromium } = require(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const executablePath = [process.env.CHROME_PATH, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(p => p && existsSync(p));
assert(executablePath, 'Chrome or Edge is required for the browser checks');
const args = ['--edge-skip-compat-layer-relaunch', '--do-not-de-elevate', '--allow-file-access-from-files'];
if (process.env.HERO_SOFTWARE_GL === '1') args.push('--use-angle=swiftshader', '--enable-unsafe-swiftshader');
const browser = await chromium.launch({ executablePath, headless: true, args });
const report = { generatedAt: new Date().toISOString(), passed: false, scenarios: [] };
const readActions = name => JSON.parse(readFileSync(join(qa, name), 'utf8'));
const only = process.argv.find(a => a.startsWith('--only='))?.slice(7);
const mobileHeroActions = [
  ['click', '[data-tab=force]'],
  ['eval', "const selectors=['#heroViewport','#demoToggle','#explodeTool']; const boxes=selectors.map(selector=>{const e=document.querySelector(selector);if(!e)throw new Error('Missing mobile Hero control '+selector); const r=e.getBoundingClientRect();if(r.width<20||r.height<20||r.left<-.5||r.right>innerWidth+.5||r.top<-.5||r.bottom>innerHeight+.5)throw new Error('Mobile Hero control unreachable '+selector+' '+JSON.stringify(r.toJSON()));return {selector,width:r.width,height:r.height};});boxes"],
  ['shot', 'qa/hero-mobile-controls.png', '#app', 1]
];
// mobile-drive already enables both inspection aids; do not toggle them off
// when continuing with the independent care script on the same page.
const mobileActions = () => [
  ...readActions('mobile-drive.json'),
  ...readActions('mobile-care-drive.json')
    .filter(a => !(a[0] === 'click' && ['#rakingLight', '#straightedge'].includes(a[1])))
    .flatMap(a => a[0] === 'click' && a[1] === '#submitCare' ? [a,
      ['eval', "if(!Object.values(sandingLab.state.done).every(Boolean)||!document.querySelector('#summaryDialog').open)throw new Error('mobile four-stage summary missing');'mobile four-stage summary passed'"],
      ['click', '#summaryDialog [data-close=summaryDialog]']
    ] : [a]),
  ...mobileHeroActions
];

async function evaluate(page, source) { return page.evaluate(s => (0, eval)(s), source); }

async function runActions(page, actions, result) {
  for (let i = 0; i < actions.length; i++) {
    const [type, a, b, c, d, e, f] = actions[i];
    result.action = { index: i, type, target: a };
    if (type === 'eval') {
      const value = await evaluate(page, a);
      result.evaluations.push({ action: i, value });
    } else if (type === 'until') {
      await page.waitForFunction(a, null, { timeout: b || 10000 });
    } else if (type === 'wait') {
      await page.waitForTimeout(a);
    } else if (type === 'click') {
      // Anatomy drive actions use querySelector; keep that first-match behavior.
      const locator = page.locator(a).first();
      if (b == null) await locator.click();
      else {
        const box = await locator.boundingBox(); assert(box, `Visible click target: ${a}`);
        await locator.click({ position: { x: box.width * b, y: box.height * c } });
      }
    } else if (type === 'key') {
      if (b) await page.locator(b).first().focus();
      await page.keyboard.press(a === ' ' ? 'Space' : a);
    } else if (type === 'drag') {
      const box = await page.locator(a).boundingBox(); assert(box, `Visible drag target: ${a}`);
      await page.mouse.move(box.x + box.width * b, box.y + box.height * c);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * d, box.y + box.height * e, { steps: f || 20 });
      await page.mouse.up();
    } else if (type === 'shot') {
      const path = join(output, result.name, basename(a));
      mkdirSync(dirname(path), { recursive: true });
      if (b) await page.locator(b).screenshot({ path }); else await page.screenshot({ path });
      result.screenshots.push(path);
    } else throw new Error(`Unsupported action: ${type}`);
  }
  delete result.action;
}

async function scenario(name, options, actions) {
  if (only && !name.includes(only)) return;
  const result = { name, passed: false, viewport: options.viewport, reduced: !!options.reduced, noWebGL: !!options.noWebGL, evaluations: [], screenshots: [], errors: [] };
  report.scenarios.push(result);
  const page = await browser.newPage({ viewport: options.viewport || { width: 1440, height: 810 }, reducedMotion: options.reduced ? 'reduce' : 'no-preference', acceptDownloads: true });
  page.on('pageerror', e => result.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') result.errors.push(m.text()); });
  try {
    if (options.noWebGL) await page.addInitScript(() => {
      const context = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, ...args) {
        return /^(webgl2?|experimental-webgl)$/.test(type) ? null : context.call(this, type, ...args);
      };
    });
    const url = new URL(options.dark ? '../dark.html' : '../index.html', import.meta.url);
    if (options.noWebGL) url.search = '?no-webgl';
    await page.goto(url.href);
    await page.waitForFunction('!!window.sandingLab?.scene');
    await runActions(page, actions, result);
    result.finalStats = await page.evaluate(() => sandingLab.scene.getStats());
    assert.equal(result.finalStats.webgl, !options.noWebGL, 'Expected renderer or fallback');
    const layout = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight }));
    assert(layout.scrollWidth <= layout.width + 1 && layout.scrollHeight <= layout.height + 1, `No page scroll: ${JSON.stringify(layout)}`);
    result.layout = layout;
    assert.deepEqual(result.errors, [], 'No browser errors');
    result.passed = true;
    console.log(`PASS ${name}`);
  } catch (error) {
    result.failure = error.stack || String(error);
    const path = join(output, `${name}-failure.png`);
    await page.screenshot({ path }).catch(() => {});
    result.screenshots.push(path);
    console.error(`FAIL ${name}: ${error.message}`);
  } finally { await page.close(); }
}

try {
  await scenario('hero-interaction', { viewport: { width: 1440, height: 810 } }, readActions('hero-drive.json'));
  await scenario('game-four-stages', { viewport: { width: 1440, height: 810 } }, readActions('game-drive.json'));
  await scenario('layout-1280', { viewport: { width: 1280, height: 720 } }, readActions('layout-drive.json'));
  await scenario('layout-1920', { viewport: { width: 1920, height: 1080 } }, readActions('layout-drive.json'));
  await scenario('dark-direct', { viewport: { width: 1440, height: 810 }, dark: true }, [
    ['eval', "if(document.body.dataset.theme!=='dark')throw new Error('dark.html initial theme'); sandingLab.scene.setDemo(false); sandingLab.scene.setView('overview'); 'dark initial theme'"],
    ['wait', 900], ['shot', 'qa/hero-direct-dark.png', '#app', 1]
  ]);
  await scenario('fallback-mobile', { viewport: { width: 390, height: 844 }, reduced: true, noWebGL: true }, mobileActions());
  await scenario('reduced-record', { viewport: { width: 1440, height: 810 }, reduced: true }, [
    ...readActions('record-drive.json'),
    ['eval', "sandingLab.scene.setDemo(true); window.reducedFrames=sandingLab.scene.getStats().frameCount; 'reduced demonstration request'"],
    ['wait', 800],
    ['eval', "const s=sandingLab.scene.getStats();if(s.frameCount-window.reducedFrames>3)throw new Error('reduced motion renders continuously');s"]
  ]);
  await scenario('mobile-webgl', { viewport: { width: 390, height: 844 }, reduced: true }, mobileActions());
} finally {
  await browser.close();
  report.passed = report.scenarios.length > 0 && report.scenarios.every(s => s.passed);
  const resultPath = join(qa, 'hero-check-results.json');
  writeFileSync(resultPath, JSON.stringify(report, null, 2));
  const lines = ['# Hero 场景浏览器验证', '', `执行时间：${report.generatedAt}`, '', `总结果：${report.passed ? '通过' : '未全部通过'}`, '', '| 检查 | 结果 |', '| --- | --- |', ...report.scenarios.map(s => `| ${s.name} | ${s.passed ? '通过' : '未通过'} |`), '', '本记录由 qa/hero-check.mjs 生成。使用真实浏览器按钮、拖动与键盘事件复跑四关流程；原有游戏测试数据和模型未被修改。', '', '截图保存在 qa/hero-artifacts/。软管端点检查是否执行见 hero-interaction 的 hoseCoverage；无统计字段时不宣称已验证。'];
  for (const s of report.scenarios.filter(s => !s.passed)) lines.push('', `## ${s.name}`, '', '```', s.failure, '```');
  writeFileSync(join(qa, 'hero-check-record.md'), lines.join('\n'));
  console.log(`Result: ${resultPath}`);
  if (!report.passed) process.exitCode = 1;
}

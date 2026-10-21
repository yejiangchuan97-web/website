import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';

// Use Codex's existing browser dependency; this verifier installs nothing.
const bundled = join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const require = createRequire(import.meta.url);
const { chromium } = require(join(process.env.QA_NODE_MODULES || bundled, 'playwright'));
const skillRoot = process.env.ANATOMY_ROOT || join(homedir(), '.agents/skills/anatomy');
const { LINE_ENDS } = await import(pathToFileURL(join(skillRoot, 'scripts/line-ends.mjs')));
const argv = process.argv.slice(2);
const options = { width: 1440, height: 1100, scale: 1, wait: 800, select: '.iso-plate', out: 'qa-capture.png', actions: null, lines: false, reduced: false, theme: 'light', noWebgl: false };
const positional = [];
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (['--width', '--height', '--scale', '--wait'].includes(arg)) options[arg.slice(2)] = Number(argv[++i]);
  else if (['--out', '--select', '--actions', '--theme'].includes(arg)) options[arg.slice(2)] = argv[++i];
  else if (arg === '--lines') options.lines = true;
  else if (arg === '--reduced') options.reduced = true;
  else if (arg === '--no-webgl') options.noWebgl = true;
  else positional.push(arg);
}
if (!positional[0]) {
  console.log('node verify.mjs <page.html|url> [--out shot.png] [--width 390] [--height 1000] [--scale 4] [--select .iso-plate] [--lines] [--reduced] [--no-webgl] [--actions actions.json]');
  process.exit(1);
}
const executablePath = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].filter(Boolean).find(existsSync);
const browser = await chromium.launch({ executablePath, headless: true, args: ['--do-not-de-elevate', '--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: options.width, height: options.height }, deviceScaleFactor: options.scale, reducedMotion: options.reduced ? 'reduce' : 'no-preference', colorScheme: options.theme });
const page = await context.newPage();
const errors = [], warnings = [], failures = [], steps = [];
page.on('pageerror', error => errors.push(error.stack || error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); else if (message.type() === 'warning') warnings.push(message.text()); });
const sleep = ms => page.waitForTimeout(ms);
const target = selector => page.locator(selector || options.select).first();
const ensureParent = out => mkdirSync(dirname(resolve(out)), { recursive: true });
async function screenshot(out, selector = options.select, region = null) {
  ensureParent(out);
  const locator = target(selector);
  if (await locator.count()) {
    await locator.scrollIntoViewIfNeeded();
    if (region) {
      const box = await locator.boundingBox();
      await page.screenshot({ path: out, clip: { x: box.x + region[0], y: box.y + region[1], width: region[2], height: region[3] } });
    } else await locator.screenshot({ path: out });
  } else await page.screenshot({ path: out, fullPage: true });
  const readout = await page.locator('[data-readout]').allTextContents();
  steps.push({ action: 'shot', out, readout });
  console.log('shot:', out, 'readout:', readout.join(' | '));
}
async function lineCheck(out = null, selector = options.select) {
  const result = await page.evaluate(`(${LINE_ENDS})(${JSON.stringify({ select: selector, show: Boolean(out) })})`);
  console.log(`line ends: ${result.problems.length} of ${result.ends} ends on ${result.lines} lines float`);
  if (out) await screenshot(out, selector);
  await page.locator('[data-line-ends]').evaluateAll(elements => elements.forEach(element => element.remove()));
  steps.push({ action: 'lines', ...result });
  for (const problem of result.problems) failures.push({ type: 'line-end', ...problem });
  return result;
}
try {
  if (options.noWebgl) await page.addInitScript(() => { const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (kind, ...args) { return /webgl/.test(String(kind)) ? null : get.call(this, kind, ...args); }; });
  const url = /^(https?|file):/.test(positional[0]) ? positional[0] : pathToFileURL(resolve(positional[0])).href;
  await page.goto(url, { waitUntil: 'load' });
  await sleep(options.wait);
  const actions = options.actions ? JSON.parse(readFileSync(options.actions, 'utf8')) : [];
  for (const [kind, ...args] of actions) {
    if (kind === 'wait') await sleep(args[0]);
    else if (kind === 'click') await target(args[0]).click();
    else if (kind === 'key') { if (args[1]) await target(args[1]).focus(); await page.keyboard.press(args[0]); }
    else if (kind === 'move') { const box = await target(args[0]).boundingBox(); await page.mouse.move(box.x + box.width * args[1], box.y + box.height * args[2], { steps: 10 }); }
    else if (kind === 'range') await target(args[0]).evaluate((input, value) => { input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); }, String(args[1]));
    else if (kind === 'fill') await target(args[0]).fill(String(args[1]));
    else if (kind === 'select') await target(args[0]).selectOption(String(args[1]));
    else if (kind === 'file') await target(args[0]).setInputFiles(resolve(args[1]));
    else if (kind === 'download') { const [download] = await Promise.all([page.waitForEvent('download'), target(args[0]).click()]); ensureParent(args[1]); await download.saveAs(args[1]); const value=readFileSync(args[1],'utf8'); steps.push({action:kind,out:args[1],value}); if(args[2]&&!value.includes(args[2]))failures.push({type:'download-content',expected:args[2],value}); console.log('download:',args[1],JSON.stringify(value)); }
    else if (kind === 'drag') { const box = await target(args[0]).boundingBox(); await page.mouse.move(box.x + box.width * args[1], box.y + box.height * args[2]); await page.mouse.down(); await page.mouse.move(box.x + box.width * args[3], box.y + box.height * args[4], { steps: args[5] || 20 }); await page.mouse.up(); }
    else if (kind === 'eval') { const value = await page.evaluate(args[0]); steps.push({ action: kind, expression: args[0], value }); console.log('eval:', JSON.stringify(value)); }
    else if (kind === 'assert') { const value = await page.evaluate(args[0]); steps.push({ action: kind, label: args[1], value }); if (!value) failures.push({ type: 'assertion', expression: args[0], label: args[1] }); console.log('assert:', args[1] || args[0], Boolean(value)); }
    else if (kind === 'until') await page.waitForFunction(args[0], undefined, { timeout: args[1] || 10000 });
    else if (kind === 'shot') await screenshot(args[0], args[1], args[2]);
    else if (kind === 'lines') await lineCheck(args[0], args[1]);
    else if (kind === 'scroll') await target(args[0]).scrollIntoViewIfNeeded();
    else throw new Error(`Unknown action: ${kind}`);
  }
  const layout = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth, sideways: document.documentElement.scrollWidth > innerWidth + 1, title: document.title, figures: document.querySelectorAll('svg').length }));
  if (layout.sideways) failures.push({ type: 'horizontal-overflow', ...layout });
  await screenshot(options.out);
  if (options.lines) await lineCheck(options.out.replace(/\.png$/i, '-lines.png'));
  const report = { browser: await browser.version(), url, viewport: { width: options.width, height: options.height, scale: options.scale }, layout, errors, warnings, failures, steps };
  const reportPath = options.out.replace(/\.png$/i, '.json');
  ensureParent(reportPath);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ layout, errors, warnings, failures: failures.length, report: reportPath }, null, 2));
  process.exitCode = errors.length || failures.length ? 1 : 0;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
}

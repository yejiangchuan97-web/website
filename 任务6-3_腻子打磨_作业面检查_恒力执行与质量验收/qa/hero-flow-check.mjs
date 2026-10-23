import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const qa = dirname(fileURLToPath(import.meta.url)), folder = join(qa, 'hero-artifacts', 'geometry');
mkdirSync(folder, { recursive: true });
const { chromium } = createRequire(import.meta.url)(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--edge-skip-compat-layer-relaunch', '--do-not-de-elevate', '--allow-file-access-from-files'] });
const result = { generatedAt: new Date().toISOString(), passed: false, themes: [], errors: [] };
try {
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, reducedMotion: 'no-preference' });
    page.on('pageerror', e => result.errors.push(e.message));
    await page.addInitScript(() => {
      let factory;
      Object.defineProperty(window, 'createSandingRobot', { configurable: true, get() { return factory; }, set(original) { factory = function(...args) { const robot = original.apply(this, args); window.__flowRobot = robot; return robot; }; } });
    });
    await page.goto(new URL(theme === 'dark' ? '../dark.html' : '../index.html', import.meta.url).href);
    await page.waitForFunction('!!window.sandingLab?.scene');
    await page.locator('[data-tab=dust]').click();
    await page.locator('#stopDust').click();
    await page.locator('[data-repair=filterClean]').click();
    await page.locator('#restartDust').click();
    await page.locator('#resumeSanding').click();
    await page.waitForTimeout(1500);
    const before = await page.evaluate(() => {
      const robot = window.__flowRobot, flow = robot.group.parent.children.find(o => o.isPoints && o.geometry.attributes.position.count === 60), hose = robot.parts.find(m => m.name === 'continuous-flexible-extraction-hose'), s = sandingLab.scene.getStats();
      const port = s.hose.extractorPort;
      sandingLab.scene.setCamera({ az: .9, el: .15, radius: 1.2, tx: port[0] - .08, ty: 1.05, tz: 1.22 });
      return { visible: flow.visible, opacity: flow.material.opacity, points: Array.from(flow.geometry.attributes.position.array), hoseOpacity: hose.material.opacity, hoseDepthWrite: hose.material.depthWrite, geometries: s.geometries };
    });
    assert(before.visible && before.opacity > .7, 'Airflow is visible after settling');
    assert(before.hoseOpacity < .5 && !before.hoseDepthWrite, 'Transparent hose allows airflow to remain visible');
    await page.waitForTimeout(900);
    const after = await page.evaluate(() => { const flow = window.__flowRobot.group.parent.children.find(o => o.isPoints && o.geometry.attributes.position.count === 60); return Array.from(flow.geometry.attributes.position.array); });
    assert(after.some((v, i) => Math.abs(v - before.points[i]) > .001), 'Airflow points travel along the hose');
    const path = join(folder, `flow-settled-${theme}-camera-closeup.png`);
    await page.locator('#heroViewport').screenshot({ path });
    result.themes.push({ theme, opacity: before.opacity, hoseOpacity: before.hoseOpacity, hoseDepthWrite: before.hoseDepthWrite, geometries: before.geometries, moving: true, path });
    await page.locator('#stopDust').click();
    await page.waitForTimeout(1800);
    const stopped = await page.evaluate(() => { const flow = window.__flowRobot.group.parent.children.find(o => o.isPoints && o.geometry.attributes.position.count === 60); return { visible: flow.visible, opacity: flow.material.opacity, frames: sandingLab.scene.getStats().frameCount }; });
    await page.waitForTimeout(400);
    const finalFrames = await page.evaluate(() => sandingLab.scene.getStats().frameCount);
    assert(!stopped.visible && stopped.opacity < .003, 'Isolation hides airflow');
    assert(finalFrames - stopped.frames <= 1, 'Isolation stops continuous frames');
    result.themes.at(-1).isolated = { ...stopped, finalFrames };
    await page.close();
  }
  assert.deepEqual(result.errors, []);
  result.passed = true;
  console.log('PASS settled airflow, transparent hose, moving points, and isolated stop in both themes');
} catch (error) { result.failure = error.stack || String(error); console.error(result.failure); process.exitCode = 1; }
finally { await browser.close(); writeFileSync(join(qa, 'hero-flow-results.json'), JSON.stringify(result, null, 2)); }

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contact } from '../src/model.mjs';

const qa = dirname(fileURLToPath(import.meta.url));
const output = join(qa, 'hero-artifacts', 'geometry');
mkdirSync(output, { recursive: true });
const require = createRequire(import.meta.url);
const { chromium } = require(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const executablePath = [process.env.CHROME_PATH, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(p => p && existsSync(p));
assert(executablePath, 'Chrome or Edge is required');
const browser = await chromium.launch({ executablePath, headless: true, args: ['--edge-skip-compat-layer-relaunch', '--do-not-de-elevate', '--allow-file-access-from-files'] });
const report = { generatedAt: new Date().toISOString(), passed: false, units: 'm', scan: [], memory: null, reduced: null, screenshots: [], errors: [] };
report.build = Object.fromEntries(['index.html', 'dark.html'].map(name => {
  const bytes = readFileSync(join(dirname(qa), name));
  return [name, { sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length }];
}));
const scanOnly = process.argv.includes('--scan-only'), capturesOnly = process.argv.includes('--captures-only');
const point = value => Array.isArray(value) ? value : [value.x, value.y, value.z];
const distance = (a, b) => Math.hypot(...point(a).map((v, i) => v - point(b)[i]));

async function readyPage(dark = false) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', e => { if (e.type() === 'error') report.errors.push(e.text()); });
  // Capture the returned robot through its existing factory, without changing
  // application source. This lets the audit inspect actual world transforms
  // and TubeGeometry vertices rather than trusting duplicated endpoint values.
  await page.addInitScript(() => {
    let factory;
    Object.defineProperty(window, 'createSandingRobot', { configurable: true,
      get() { return factory; },
      set(original) { factory = function(...args) { const robot = original.apply(this, args); window.__heroQaRobot = robot; return robot; }; }
    });
  });
  await page.goto(new URL(dark ? '../dark.html' : '../index.html', import.meta.url).href);
  await page.waitForFunction('!!window.sandingLab?.scene');
  await page.evaluate(() => { window.heroScanBase = structuredClone(sandingLab.state); sandingLab.scene.setDemo(false); });
  return page;
}

async function pose(page, config) {
  return page.evaluate(async c => {
    const base = structuredClone(window.heroScanBase);
    const state = { ...base, tab: c.tab || 'force', bump: c.bump || 0, retreat: c.retreat || 0, selected: c.sample || 0, light: false, raking: false, ruler: false, locked: false, feedback: false, sanding: null, dustRunning: false, isolated: false, trial: false,
      dust: { power: true, connected: c.connected !== false, filterClean: true, bagReady: true, seal: true }, care: { ...base.care, running: false } };
    sandingLab.scene.update(state);
    sandingLab.scene.setExploded(!!c.service);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const stats = sandingLab.scene.getStats(), robot = window.__heroQaRobot;
    robot.group.updateMatrixWorld(true);
    const tires = robot.parts.filter(mesh => mesh.name === 'traction-tire');
    const wheels = tires.map(mesh => ({
      axis: new THREE.Vector3(0, 1, 0).transformDirection(mesh.matrixWorld).toArray(),
      center: mesh.getWorldPosition(new THREE.Vector3()).toArray()
    }));
    const hose = robot.parts.find(mesh => mesh.name === 'continuous-flexible-extraction-hose');
    const attr = hose.geometry.attributes.position, radial = hose.geometry.parameters.radialSegments, tubular = hose.geometry.parameters.tubularSegments;
    const center = ring => { const sum = new THREE.Vector3(); for (let j = 0; j < radial; j++) sum.add(new THREE.Vector3().fromBufferAttribute(attr, ring * (radial + 1) + j)); return sum.divideScalar(radial).applyMatrix4(hose.matrixWorld).toArray(); };
    stats.physicalAudit = { wheels, hoseStart: center(0), hoseEnd: center(tubular) };
    return stats;
  }, config);
}

function checkGeometry(config, stats) {
  assert.equal(stats.webgl, true, 'Real WebGL scene');
  assert(Number.isFinite(stats.meshCount) && stats.meshCount >= 60, 'Finite physical component count');
  const robot = stats.robot;
  assert(robot?.jointErrors && robot?.pose, 'Robot geometry statistics exposed');
  for (const [joint, error] of Object.entries(robot.jointErrors)) assert(Number.isFinite(error) && error < .00001, `${joint} link changes length: ${error}`);
  const h = stats.hose;
  assert(h?.start && h?.end && h?.toolPort && h?.extractorPort, 'Actual hose curve ends are exposed');
  const headError = distance(h.start, h.toolPort), inletGap = distance(h.end, h.extractorPort);
  assert(headError < .00001, `Hose separated from head: ${headError}`);
  const expectedGap = config.connected === false ? h.intendedServiceGap : 0;
  assert(Number.isFinite(expectedGap) && Math.abs(inletGap - expectedGap) < .00001, `Unexpected inlet gap ${inletGap}, expected ${expectedGap}`);
  if (config.connected === false) assert(inletGap > .1, 'Disconnected hose remains visibly separated');
  const actual = stats.physicalAudit;
  assert.equal(actual?.wheels.length, 4, 'Four actual tire meshes');
  for (const wheel of actual.wheels) {
    assert(Math.abs(wheel.axis[1]) < .00001, `Wheel axle tilts vertically during travel: ${JSON.stringify(wheel.axis)}`);
    assert(Math.abs(wheel.axis[2]) > .9999, 'Wheel rolling plane follows x travel');
  }
  const meshHeadError = distance(actual.hoseStart, h.toolPort), meshInletGap = distance(actual.hoseEnd, h.extractorPort);
  assert(meshHeadError < .00001, `Hose mesh ring separates from head: ${meshHeadError}`);
  assert(Math.abs(meshInletGap - expectedGap) < .00001, `Hose mesh end does not meet intended inlet position: ${meshInletGap}`);
  if (config.tab !== 'surface' && config.tab !== 'dust') {
    assert(Math.abs(robot.pose.retreat - (config.retreat || 0)) < .00001, 'Retreat reaches the mechanical slide');
    const bump = config.bump || 0, retreat = config.retreat || 0, gap = contact(bump, retreat, 20).gap;
    assert(Math.abs(robot.pose.slideStroke - (retreat - bump - gap) * .008) < .00001, 'Slide compression and wall displacement use the same contact state');
    if (!config.service) {
      assert(Math.abs(robot.pose.wrist[2] - (.52 + retreat * .008)) < .00001, 'Fixed-position wrist does not follow wall bumps');
      assert(Math.abs(robot.pose.z - (.08 + (bump + gap) * .008)) < .00001, 'Abrasive contact or separation follows the wall');
    }
  }
  assert(Math.abs(robot.pose.service - (config.service ? 1 : 0)) < .00001, 'Service position follows exploded-state request');
  return { config, meshCount: stats.meshCount, geometries: stats.geometries, jointErrors: robot.jointErrors, hoseHeadError: headError, hoseInletGap: inletGap, meshHeadError, meshInletGap, wheelAxes: actual.wheels.map(w => w.axis), expectedGap, slideStroke: robot.pose.slideStroke, pose: robot.pose };
}

try {
  if (!capturesOnly) {
    const page = await readyPage();
    const cases = [];
    for (const bump of [-6, 0, 6]) for (const retreat of [-4, 0, 4]) for (const service of [0, 1]) cases.push({ tab: 'force', bump, retreat, service });
    for (let sample = 0; sample < 6; sample++) for (const service of [0, 1]) cases.push({ tab: 'surface', sample, service });
    for (const connected of [false, true]) for (const service of [0, 1]) cases.push({ tab: 'dust', connected, service });
    for (const c of cases) report.scan.push(checkGeometry(c, await pose(page, c)));
    console.log(`PASS ${cases.length} force, sample, service and hose states`);
    // Warm both sides of the cycle first, so first-use renderer allocation is
    // not confused with a leak from replacing a dynamic hose geometry.
    const cycle = [{ tab: 'surface', sample: 0 }, { tab: 'surface', sample: 5, service: 1 }];
    for (const c of cycle) await pose(page, c);
    const counts = [];
    for (let i = 0; i < 10; i++) counts.push((await pose(page, cycle[i % 2])).geometries);
    assert(counts.every(Number.isFinite), 'Renderer geometry counts exposed');
    assert(Math.max(...counts) - Math.min(...counts) <= 2 && counts.at(-1) <= counts[0] + 2, `Geometry count keeps increasing: ${counts.join(', ')}`);
    report.memory = { swaps: 10, counts, stable: true };
    await pose(page, { tab: 'force' });
    await page.evaluate(() => sandingLab.scene.setDemo(true));
    await page.waitForTimeout(100);
    const before = await page.evaluate(() => sandingLab.scene.getStats());
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => sandingLab.scene.getStats());
    assert.equal(after.reduced, true);
    assert.equal(after.running, false);
    assert(after.frameCount - before.frameCount <= 1, 'Reduced-motion demonstration continuously renders');
    assert.deepEqual(after.toolPosition, before.toolPosition, 'Reduced-motion demonstration keeps moving');
    report.reduced = { before: before.frameCount, after: after.frameCount, running: after.running, unchangedTool: true };
    console.log('PASS 10 pose swaps retain geometry count; reduced motion stops frames');
    await page.close();
  }
  if (!scanOnly) {
    for (const theme of ['light', 'dark']) {
      const page = await readyPage(theme === 'dark');
      for (const part of ['head', 'arm', 'base', 'extractor']) {
        const stats = await pose(page, { tab: part === 'extractor' ? 'dust' : 'force', connected: true, service: part === 'head' ? 1 : 0 });
        const p = stats.robot.pose, baseX = p.shoulder[0] + .09;
        const camera = {
          head: { az: -1.08, el: .24, radius: 1.12, tx: p.x, ty: p.y, tz: p.z + .19 },
          arm: { az: -.9, el: .23, radius: 1.72, tx: (p.shoulder[0] + p.wrist[0]) / 2, ty: 1.38, tz: .83 },
          base: { az: -.65, el: .29, radius: 1.52, tx: baseX, ty: .43, tz: 1.17 },
          extractor: { az: .75, el: .23, radius: .90, tx: baseX + .235, ty: .82, tz: 1.245 }
        }[part];
        await page.evaluate(async value => { sandingLab.scene.setCamera(value); await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); }, camera);
        const path = join(output, `${part}-${theme}-camera-closeup.png`);
        await page.locator('#heroViewport').screenshot({ path });
        const rect = await page.locator('#heroViewport').boundingBox();
        report.screenshots.push({ part, theme, path, method: 'camera close-up, 1x pixels; not a 4x raster export', dimensions: { width: rect.width, height: rect.height }, camera });
      }
      for (const part of ['overview', 'dust']) {
        await page.evaluate(async view => { sandingLab.setTab(view === 'dust' ? 'dust' : 'force'); sandingLab.scene.setDemo(false); sandingLab.scene.setExploded(false); sandingLab.scene.setView(view); await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); }, part);
        const path = join(output, `final-${part}-${theme}.png`);
        await page.locator('#app').screenshot({ path });
        report.screenshots.push({ part, theme, path, method: 'final full-page scene view, 1x pixels', dimensions: { width: 1600, height: 900 } });
      }
      await page.close();
    }
    console.log('Captured eight component close-ups plus four final overview/dust pages (1x pixels)');
  }
  assert.deepEqual(report.errors, [], 'No browser errors');
  report.passed = true;
} catch (error) {
  report.failure = error.stack || String(error);
  console.error(report.failure);
  process.exitCode = 1;
} finally {
  await browser.close();
  writeFileSync(join(qa, 'hero-geometry-results.json'), JSON.stringify(report, null, 2));
  const lines = ['# Hero 实体与局部特写检查', '', `执行时间：${report.generatedAt}`, '', `自动检查结果：${report.passed ? '通过' : '未全部通过'}`, '', `状态扫描：${report.scan.length} 组。检查关节定长、法向退让传递、磨头分层位置、软管端点与脱管间隙。`, '', `几何内存计数：${report.memory ? report.memory.counts.join(' → ') : '本次未扫描'}`, '', `减少动态效果：${report.reduced ? '确认不持续渲染，工具坐标不变' : '本次未扫描'}`, '', '局部图使用相机靠近主对象、1×像素截图，不称作4×像素放大导出。截图的视觉质量需要实际查看。', '', '| 部件 | 主题 | 文件 |', '| --- | --- | --- |', ...report.screenshots.map(s => `| ${s.part} | ${s.theme} | ${s.path.replaceAll('\\', '/')} |`)];
  lines.push('', '构建SHA-256：', '', ...Object.entries(report.build).map(([name, value]) => `- ${name}: ${value.sha256}`));
  if (report.scan.length) {
    const max = fn => Math.max(...report.scan.flatMap(fn));
    lines.push('', '实际网格审计：通过工厂包装读取机器人对象，轮轴取轮胎世界矩阵，软管端点取TubeGeometry首尾环10个独立顶点的中心。', '', '| 指标 | 最大值 |', '| --- | --- |',
      `| 轮轴竖向分量 | ${max(s => s.wheelAxes.map(axis => Math.abs(axis[1])))} |`,
      `| 连杆长度误差 / m | ${max(s => Object.values(s.jointErrors))} |`,
      `| 软管网格首环接口误差 / m | ${max(s => [s.meshHeadError])} |`,
      `| 软管网格末环预期位置误差 / m | ${max(s => [Math.abs(s.meshInletGap - s.expectedGap)])} |`);
  }
  if (report.failure) lines.push('', '```', report.failure, '```');
  writeFileSync(join(qa, 'hero-geometry-record.md'), lines.join('\n'));
}

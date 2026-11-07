/* 课程首页（概览 ⇄ 章节镜头）浏览器检查。
 * 用法：先在仓库根目录 `npm run serve`（8765 端口）或传入 BASE=http://127.0.0.1:端口/，再 `node scripts/qa/home-zoom.cjs`。
 * 截图写 artifacts/screenshots/home-zoom/，结果写 artifacts/reports/home-zoom.json。 */
const {chromium} = require('playwright');
const path = require('node:path'), fs = require('node:fs'), {pathToFileURL} = require('node:url');
const root = path.resolve(__dirname, '../..');
const base = process.env.BASE || 'http://127.0.0.1:8765/';
const shots = path.join(root, 'artifacts/screenshots/home-zoom'), reports = path.join(root, 'artifacts/reports');
fs.mkdirSync(shots, {recursive: true}); fs.mkdirSync(reports, {recursive: true});
const results = [], errors = [];
const ok = (pass, name, detail) => { results.push({pass: Boolean(pass), name, detail}); console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' ' + JSON.stringify(detail) : '')); };
const home = (hash = '') => base + 'course/home/index.html' + hash;

async function context(browser, w, h, theme, extra = {}) {
  const ctx = await browser.newContext({viewport: {width: w, height: h}, ...extra});
  await ctx.addInitScript(t => { try { localStorage.setItem('course-theme', t); } catch {} }, theme);
  return ctx;
}
async function page(ctx, noWebgl = false) {
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(p.url() + ' ' + e.message));
  /* 无 WebGL 检查里 three.js 报“无法创建 WebGL 上下文”是预期的 */
  p.on('console', m => { if (m.type() === 'error' && !(noWebgl && /WebGL context/.test(m.text()))) errors.push(p.url() + ' ' + m.text()); });
  return p;
}
/* 页面不滚动、不横向溢出；可见文字不小于 12px，正文不小于 14px */
const layout = p => p.evaluate(() => {
  const sizes = [];
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('.sr-only,[hidden],dialog:not([open]),script,style')) continue;
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    if (!r.width || !r.height || cs.visibility === 'hidden' || Number(cs.opacity) === 0 || el.closest('.is-cover .overview')) continue;
    sizes.push([parseFloat(cs.fontSize), el.className || el.tagName]);
  }
  sizes.sort((a, b) => a[0] - b[0]);
  return {scroll: document.documentElement.scrollHeight - innerHeight, overflow: document.documentElement.scrollWidth - innerWidth, minFont: sizes[0], body: ['.book-intro', '.cv-lead', '.task .name'].map(s => document.querySelector(s)).filter(Boolean).map(e => parseFloat(getComputedStyle(e).fontSize))};
});
const settle = (p, mode) => p.waitForFunction(m => { const s = CourseHome.state(); return s.mode === m && (!s.stage || (s.stage.zoom === (m === 'chapter' ? 1 : 0) && !s.stage.rotating)); }, mode, {timeout: 8000});
async function clickTarget(p, match) {
  const t = (await p.evaluate(() => CourseHome.targets())).find(match);
  if (!t) throw new Error('target not found');
  await p.mouse.move(t.x, t.y); await p.waitForTimeout(200); await p.mouse.click(t.x, t.y);
  return t;
}

(async () => {
  const browser = await chromium.launch({args: ['--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
  for (const [w, h] of [[1920, 950], [1440, 810], [1366, 640]]) for (const theme of ['light', 'dark']) {
    const tag = `${w}x${h}-${theme}`, ctx = await context(browser, w, h, theme), p = await page(ctx);
    await p.goto(home()); await p.waitForFunction(() => window.CourseHome); await settle(p, 'overview');
    const n = w === 1366 ? 3 : w === 1920 ? 6 : 5;
    await p.evaluate(n => CourseHome.go(n), n); await settle(p, 'overview'); await p.waitForTimeout(500);
    let l = await layout(p);
    ok(l.scroll <= 0 && l.overflow <= 0, `${tag} overview fits viewport`, l);
    ok(l.minFont[0] >= 12 && l.body.every(s => s >= 14), `${tag} overview text sizes`, l.minFont);
    await p.screenshot({path: path.join(shots, `overview-${tag}.png`)});
    await clickTarget(p, t => t.chapter === n);
    await p.waitForURL(u => u.hash === '#chapter-' + n); await settle(p, 'chapter'); await p.waitForTimeout(700);
    l = await layout(p);
    ok(l.scroll <= 0 && l.overflow <= 0, `${tag} chapter ${n} fits viewport`, l);
    ok(l.minFont[0] >= 12 && l.body.every(s => s >= 14), `${tag} chapter text sizes`, l.minFont);
    await p.screenshot({path: path.join(shots, `chapter${n}-${tag}.png`)});
    const tasks = await p.evaluate(() => CourseHome.targets());
    const pickTask = tasks[Math.min(1, tasks.length - 1)];
    await p.mouse.move(pickTask.x, pickTask.y); await p.waitForTimeout(700);
    const hot = await p.evaluate(() => ({chip: document.querySelector('.chip.hot b')?.textContent, card: document.querySelector('.task.hot .id')?.textContent, width: document.querySelector('.chip.hot')?.getBoundingClientRect().width}));
    ok(hot.chip === pickTask.task && hot.card === pickTask.task, `${tag} hovering model ${pickTask.task} shows its name and highlights its card`, hot);
    await p.screenshot({path: path.join(shots, `hover${pickTask.task}-${tag}.png`)});
    await ctx.close();
  }

  /* 直接打开（含从任务页返回）：文字与任务卡片 800 毫秒内完全可见，不等三维模型 */
  {
    const ctx = await context(browser, 1366, 640, 'light'), p = await page(ctx);
    for (const [hash, sel, cards] of [['#chapter-3', '#cv-name', '.cover .task'], ['#chapter-8', '#cv-name', '.cover .task'], ['', '.book-title', '#toc .toc-ch']]) {
      await p.goto('about:blank'); await p.goto(home(hash), {waitUntil: 'commit'});
      const t = await p.waitForFunction(([s, c]) => { const vis = n => { for (let e = n; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 1) return false; } return true; };
        const el = document.querySelector(s), list = [...document.querySelectorAll(c)]; return el && el.textContent.trim() && vis(el) && list.length && list.every(vis) ? performance.now() : false; }, [sel, cards], {polling: 'raf', timeout: 800}).then(h => h.jsonValue(), () => null);
      ok(t !== null && t <= 800, `direct load home${hash || ''}: text and cards fully visible within 800 ms`, t === null ? 'not within 800 ms' : Math.round(t) + ' ms');
    }
    await ctx.close();
  }

  /* 手机：三维在上，章节信息在下，整页可滚动 */
  {
    const ctx = await context(browser, 390, 844, 'light', {isMobile: true, hasTouch: true}), p = await page(ctx);
    for (const [hash, info] of [['', '#book'], ['#chapter-3', '#cv-side']]) {
      await p.goto('about:blank'); await p.goto(home(hash)); await p.waitForFunction(() => window.CourseHome); await p.waitForTimeout(600);
      const r = await p.evaluate(sel => ({scene: document.getElementById('scene').getBoundingClientRect().bottom, info: document.querySelector(sel).getBoundingClientRect().top, overflow: document.documentElement.scrollWidth - innerWidth}), info);
      ok(r.scene <= r.info + 1 && r.overflow <= 0, `phone ${hash || 'cover'}: model above the information, no sideways overflow`, r);
      await p.screenshot({path: path.join(shots, `phone${hash ? '-chapter3' : '-cover'}-390x844.png`), fullPage: true});
    }
    await ctx.close();
  }

  /* 全流程（1440×810 浅色） */
  {
    const ctx = await context(browser, 1440, 810, 'light'), p = await page(ctx);
    await p.goto(home()); await settle(p, 'overview');
    const f0 = (await p.evaluate(() => CourseHome.state())).focus;
    await p.keyboard.press('ArrowRight'); await settle(p, 'overview');
    ok((await p.evaluate(() => CourseHome.state())).focus === f0 % 8 + 1, 'ArrowRight switches chapter');
    await p.mouse.move(720, 300); await p.mouse.wheel(0, 120); await p.waitForTimeout(300); await settle(p, 'overview');
    ok((await p.evaluate(() => CourseHome.state())).focus === (f0 + 1) % 8 + 1, 'wheel switches chapter');
    /* 按住鼠标向左拖动转台，松手吸附到下一章 */
    const probe = await p.evaluate(() => document.getElementById('stage-probe').getBoundingClientRect().width);
    const f1 = (await p.evaluate(() => CourseHome.state())).focus;
    await p.mouse.move(probe + 420, 560); await p.mouse.down(); await p.mouse.move(probe + 330, 560, {steps: 4}); await p.mouse.move(probe + 260, 560, {steps: 4}); await p.mouse.up();
    await settle(p, 'overview');
    const f2 = (await p.evaluate(() => CourseHome.state())).focus;
    ok(f2 !== f1 && !new URL(p.url()).hash, 'dragging the turntable switches chapter and snaps', [f1, f2]);
    const before = (await p.evaluate(() => CourseHome.state())).focus;
    const stageLeft = probe;
    const side = await clickTarget(p, t => t.chapter !== before && t.x > stageLeft + 60 && t.x < 1380 && t.y > 80 && t.y < 520);
    await settle(p, 'overview');
    ok((await p.evaluate(() => CourseHome.state())).focus === side.chapter && !new URL(p.url()).hash, 'clicking a side model brings it into focus', side.chapter);
    await p.click('.toc-ch.on button'); await p.waitForURL(u => u.hash === '#chapter-' + side.chapter); await settle(p, 'chapter');
    ok(true, 'clicking the chapter title enters the chapter');
    await p.click('#back'); await settle(p, 'overview');
    ok(!new URL(p.url()).hash && (await p.evaluate(() => CourseHome.state())).focus === side.chapter, '← 全部章节 pulls back to the overview on the same chapter');
    await p.evaluate(() => CourseHome.go(3)); await settle(p, 'overview');
    await p.focus('.toc-ch.on button'); await p.keyboard.press('Enter'); await p.waitForURL(u => u.hash === '#chapter-3'); await settle(p, 'chapter');
    ok(true, 'keyboard Enter enters the chapter');
    await p.keyboard.press('Escape'); await settle(p, 'overview');
    ok(!new URL(p.url()).hash, 'Escape returns to overview');
    /* “← 全部章节”与 Esc 用 history.back()，不额外堆历史记录 */
    await p.goForward(); await settle(p, 'chapter');
    ok(new URL(p.url()).hash === '#chapter-3', 'browser forward returns to chapter 3');
    await p.goBack(); await settle(p, 'overview');
    ok(!new URL(p.url()).hash, 'browser back returns to overview');
    await p.goForward(); await settle(p, 'chapter');
    const t = await clickTarget(p, t => t.task === '3-4');
    await p.waitForURL(/\/tasks\/3-4\//);
    ok(true, 'clicking the 3-4 model opens the task page', p.url());
    await p.waitForSelector('a.c2-back'); const back = await p.getAttribute('a.c2-back', 'href');
    ok(/course\/home\/index\.html#chapter-3$/.test(back), 'task page back link targets home#chapter-3', back);
    await p.click('a.c2-back'); await p.waitForURL(/home\/index\.html#chapter-3$/);
    const arrive = await p.evaluate(() => CourseHome.state());
    ok(arrive.mode === 'chapter' && arrive.chapter === 3, 'coming back from the task lands in chapter 3 directly', arrive.stage);
    await settle(p, 'chapter'); await p.waitForTimeout(1400); await p.screenshot({path: path.join(shots, 'back-from-task-1440x810-light.png')});
    await p.click('.task[data-task="3-1"] .name'); await p.waitForURL(/\/tasks\/3-1\//);
    ok(true, 'clicking a task card (anywhere on it) opens the task');
    await p.goBack(); await settle(p, 'chapter');
    /* 章节页左下“下一章”：直接从第三章切到第四章（推远—转台—推近） */
    await p.click('.cv-step.is-next'); await p.waitForURL(u => u.hash === '#chapter-4');
    const switched = await p.waitForFunction(() => { const s = CourseHome.state().stage; return s.chapter === 4 && s.zoom === 1; }, null, {timeout: 8000}).then(() => true, () => false);
    ok(switched, 'next-chapter card switches straight to chapter 4');
    await p.goBack(); await settle(p, 'chapter');
    /* 左侧目录：点一章转到这一章，再点一次进入；不再自动轮换 */
    await p.click('#back'); await settle(p, 'overview');
    await p.click('#toc button[data-chapter="7"]'); await settle(p, 'overview');
    ok((await p.evaluate(() => CourseHome.state())).focus === 7 && !new URL(p.url()).hash, 'table of contents brings chapter 7 forward');
    await p.waitForTimeout(8000);
    ok((await p.evaluate(() => CourseHome.state())).focus === 7, 'focus stays put when idle (no auto-rotation)');
    await p.click('#toc button[data-chapter="7"]'); await p.waitForURL(u => u.hash === '#chapter-7'); await settle(p, 'chapter');
    ok(true, 'clicking the current chapter in the table of contents enters it');
    await p.click('#back'); await settle(p, 'overview');
    await p.click('#start'); await p.waitForURL(u => u.hash === '#chapter-1'); await settle(p, 'chapter');
    ok(true, '开始学习 enters chapter 1');
    /* 旧封面地址 */
    for (const n of [1, 5, 8]) {
      await p.goto(base + `course/chapters/0${n}/overview/index.html`); await p.waitForURL(u => u.hash === '#chapter-' + n); await settle(p, 'chapter');
      ok(p.url().endsWith(`course/home/index.html#chapter-${n}`), `old cover URL of chapter ${n} redirects into the chapter`, p.url());
    }
    await ctx.close();
  }
  /* file:// */
  {
    const ctx = await context(browser, 1440, 810, 'light'), p = await page(ctx);
    await p.goto(pathToFileURL(path.join(root, 'course/home/index.html')).href + '#chapter-6'); await settle(p, 'chapter');
    ok((await p.evaluate(() => CourseHome.state())).chapter === 6, 'file:// opens chapter 6 directly');
    await clickTarget(p, t => t.task === '6-1'); await p.waitForURL(/tasks\/6-1\/index\.html/);
    ok(p.url().startsWith('file:'), 'file:// task link works', p.url());
    await p.goto(pathToFileURL(path.join(root, 'course/chapters/02/overview/index.html')).href); await p.waitForURL(u => u.hash === '#chapter-2');
    ok(p.url().startsWith('file:') && p.url().includes('course/home/index.html#chapter-2'), 'file:// old cover redirect', p.url());
    await ctx.close();
  }
  /* 无 WebGL */
  {
    const ctx = await context(browser, 1366, 640, 'light');
    await ctx.addInitScript(() => { const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (type, ...a) { return /webgl/.test(type) ? null : get.call(this, type, ...a); }; });
    const p = await page(ctx, true);
    await p.goto(home()); await p.waitForFunction(() => window.CourseHome);
    const links = await p.$$eval('#chapter-grid a', a => a.filter(x => x.offsetParent).length);
    ok(!(await p.evaluate(() => CourseHome.state().webgl)) && links === 8, 'without WebGL eight chapter links are shown', links);
    await p.screenshot({path: path.join(shots, 'no-webgl-overview-1366x640.png')});
    await p.click('#chapter-grid a[data-chapter="4"]'); await p.waitForURL(u => u.hash === '#chapter-4');
    const cards = await p.$$eval('.tasks a', a => a.filter(x => x.offsetParent).map(x => x.dataset.task));
    ok(cards.join() === '4-1,4-2,4-3', 'without WebGL chapter task cards are links', cards);
    await p.waitForTimeout(1000);
    await p.screenshot({path: path.join(shots, 'no-webgl-chapter4-1366x640.png')});
    await p.click('.task[data-task="4-2"]'); await p.waitForURL(/tasks\/4-2\//);
    ok(true, 'without WebGL a task card opens the task');
    await ctx.close();
  }
  /* 减少动画 */
  {
    const ctx = await context(browser, 1440, 810, 'light', {reducedMotion: 'reduce'}), p = await page(ctx);
    await p.goto(home('#chapter-5')); await settle(p, 'chapter');
    const a = await p.evaluate(() => CourseHome.state().stage.time); await p.waitForTimeout(1200);
    const b = await p.evaluate(() => CourseHome.state().stage.time);
    ok(a === b, 'reduced motion keeps models still', [a, b]);
    await p.keyboard.press('Escape'); await settle(p, 'overview');
    const f = (await p.evaluate(() => CourseHome.state())).focus; await p.waitForTimeout(9000);
    ok((await p.evaluate(() => CourseHome.state())).focus === f, 'reduced motion keeps the chapter in place');
    await ctx.close();
  }
  await browser.close();
  ok(!errors.length, 'no page errors', errors.slice(0, 10));
  const failed = results.filter(r => !r.pass).length;
  fs.writeFileSync(path.join(reports, 'home-zoom.json'), JSON.stringify({date: new Date().toISOString(), base, passed: results.length - failed, failed, results, errors}, null, 2) + '\n');
  process.exit(failed ? 1 : 0);
})();

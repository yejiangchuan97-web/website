/* 统一任务页外壳的页面内检查（在浏览器里执行，不依赖 Playwright）。
 * 用法：页面打开后注入本文件，再 `await window.__shellCheck({task: '4-1', chapter: 4})`，返回 {ok, problems, stations, taskLinks}。
 * scripts/check-chapters.cjs 用 Playwright 在各视口下逐页调用；也可以在浏览器控制台里直接运行同一套检查。
 * 只检查外壳层面（所有任务页共同的约定），各页的模型逻辑由 node scripts/test.mjs 的单元测试覆盖。
 */
window.__shellCheck = async function (opts = {}) {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const until = async (fn, ms = 8000) => {
    const t0 = performance.now();
    while (performance.now() - t0 < ms) { try { if (fn()) return true; } catch {} await wait(100); }
    return false;
  };
  const doc = document.documentElement;
  const out = {task: opts.task || doc.dataset.c2Lab || '', viewport: [innerWidth, innerHeight], problems: [], stations: [], taskLinks: []};
  const bad = msg => out.problems.push(msg);
  const scroll = where => {
    // 规范：宽度 ≥ 900 时页面不纵向滚动（面板内部可以滚）；任何宽度都不横向溢出
    if (innerWidth >= 900 && doc.scrollHeight > innerHeight + 1) bad(`${where}：页面纵向滚动 ${doc.scrollHeight - innerHeight}px`);
    if (doc.scrollWidth > innerWidth + 1) bad(`${where}：页面横向溢出 ${doc.scrollWidth - innerWidth}px`);
  };

  if (!await until(() => window.c2Lab && document.querySelector('.c2-station'))) { bad('统一外壳没有启动'); out.ok = false; return out; }

  // 页头：左上角回主页并定位到本章；中间是本章任务，当前任务有标记
  const back = document.querySelector('.c2-back');
  const chapter = opts.chapter ?? Number(String(out.task).split('-')[0]);
  if (!back) bad('页头缺少左上角返回');
  else if (!new RegExp(`course/home/index\\.html#chapter-${chapter}$`).test(back.href)) bad('左上角没有回主页本章展台：' + back.href);
  const links = [...document.querySelectorAll('.c2-tasks a')];
  out.taskLinks = links.map(a => a.href);
  const current = document.querySelector('.c2-tasks a[aria-current="page"]');
  if (links.length < 1) bad('页头没有本章任务');
  if (!current) bad('页头没有标出当前任务');
  else if (out.task && !current.textContent.trim().startsWith(String(out.task).replace(/[ab]$/, ''))) bad('页头当前任务不对：' + current.textContent.trim());
  if (!document.querySelector('.course-theme-toggle')) bad('缺少深浅色切换');

  // 工位：2～5 个，逐个切换，各自都有三维区、读得到原页面状态、带“试一试”
  const tabs = [...document.querySelectorAll('.c2-station')];
  if (tabs.length < 2 || tabs.length > 5) bad(`工位数 ${tabs.length}，应为 2～5 个`);
  const start = c2Lab.current;
  for (let i = 0; i < tabs.length; i++) {
    c2Lab.select(i);
    if (!await until(() => c2Lab.current === i, 3000)) { bad(`切不到第 ${i + 1} 个工位`); continue; }
    await wait(opts.settle ?? 900);
    const name = tabs[i].textContent.replace(/\s+/g, ' ').trim();
    const stage = document.querySelector('.c2-stage'), r = stage?.getBoundingClientRect();
    const view = stage && [...stage.querySelectorAll('canvas, svg, img, video, iframe')].some(e => { const b = e.getBoundingClientRect(); return b.width > 120 && b.height > 120; });
    const cards = document.querySelectorAll('.c2-panel .c2-challenge').length;
    const state = await until(() => c2Lab.ctx?.lab?.state != null, 3000);
    // 按顺序解锁的工位（如 5-2 人工复核）未解锁时只显示提示，不放挑战卡
    const locked = cards === 0 && /还不能|先完成|未解锁|先回到/.test(document.querySelector('.c2-panel')?.textContent || '');
    out.stations.push({name, cards, locked, stage: r ? [Math.round(r.width), Math.round(r.height)] : null, view, state});
    if (!r || r.height < 150) bad(`${name}：三维区太小或不存在`);
    if (!view) bad(`${name}：三维区里没有可见的画面`);
    if (cards < 2 && !locked) bad(`${name}：“试一试”只有 ${cards} 张`);
    if (!state) bad(`${name}：读不到原页面状态（poll 没有返回）`);
    scroll(name);
  }
  if (tabs.length) c2Lab.select(start >= 0 ? start : 0);

  // 深浅色：切换后 html[data-theme] 要变，再切回来
  const toggle = document.querySelector('.course-theme-toggle');
  if (toggle) {
    const before = doc.dataset.theme;
    toggle.click(); await wait(250);
    if (doc.dataset.theme === before) bad('深浅色切换不起作用');
    toggle.click(); await wait(250);
  }
  out.ok = out.problems.length === 0;
  return out;
};

/* 全部任务页的三维区联系表（印刷教材截图前的一致性检查）。
 * 逐页、逐工位打开 course/catalog.json 里的任务页（3-3 拆成两个实验页），截整页与三维区，
 * 再拼成两张联系表：整页（每页第一个工位）和三维区（全部工位）。同时记录页面上小于 12px 的可见文字。
 * 用法：node scripts/qa/stage-contact-sheet.cjs [--out artifacts/screenshots/stage-unify/after] [--theme light|dark]
 *        [--size 1440x810] [--only 3-1,5-3] [--first] [--root <站点目录>] [--no-sheet]   （--first 只截每页第一个工位）
 * 需要 Playwright。输出：<out>/pages/*.png、<out>/contact-pages.png、<out>/contact-stages.png、<out>/tiny-text.json、<out>/stage-bg.json（三维区两侧抽样底色）
 */
const fs = require('node:fs'), path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');

const args = process.argv.slice(2), arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const root = path.resolve(arg('--root', path.join(__dirname, '../..')));  // --root：截另一份站点（如旧版导出）
const theme = arg('--theme', 'light');
const out = path.resolve(path.join(__dirname, '../..'), arg('--out', `artifacts/screenshots/stage-unify/${theme}`));
const [W, H] = arg('--size', '1440x810').split('x').map(Number);
const only = arg('--only', '') ? arg('--only').split(',') : null;
const firstOnly = args.includes('--first');

const catalog = JSON.parse(fs.readFileSync(path.join(root, 'course/catalog.json'), 'utf8')).tasks;
const pages = catalog.flatMap(t => (t.id === '3-3'
  ? ['reducers', 'conversion'].map(p => ({task: '3-3', name: '3-3-' + p, file: `course/chapters/03/tasks/3-3/${p}.html`}))
  : [{task: t.id, name: t.id, file: t.demo}])).filter(p => !only || only.includes(p.task) || only.includes(p.name));

/* 页面内：列出三维区和面板里字号小于 12px 的可见文字 */
const tinyAudit = () => {
  const res = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const t = walker.currentNode, text = t.textContent.replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const el = t.parentElement; if (!el || seen.has(el)) continue;
    if (!el.closest('.c2-stage, .c2-panel, .c2-top, .c2-bar')) continue;
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
    if (r.bottom < 0 || r.top > innerHeight) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    if (el.closest('[hidden]') || el.closest('.c2-parking, .c3-legacy')) continue;
    // SVG 文字按屏幕上的实际大小算（viewBox 缩放后的字号）
    const m = el instanceof SVGElement ? el.getScreenCTM?.() : null;
    const size = parseFloat(cs.fontSize) * (m ? Math.hypot(m.a, m.b) : 1);
    if (cs.clip !== 'auto' && /rect\(0/.test(cs.clip)) continue; // 仅供读屏的隐藏文字
    if (size < 11.95) { seen.add(el); res.push({size: +size.toFixed(1), text: text.slice(0, 60), where: el.closest('.c2-panel') ? 'panel' : el.closest('.c2-stage') ? 'stage' : 'head', cls: (el.className?.baseVal ?? el.className ?? '').toString().slice(0, 40)}); }
  }
  return res;
};

(async () => {
  fs.mkdirSync(path.join(out, 'pages'), {recursive: true});
  const browser = await chromium.launch({headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const ctx = await browser.newContext({viewport: {width: W, height: H}, colorScheme: theme});
  await ctx.addInitScript(t => { try { localStorage.setItem('course-theme', t); } catch {} }, theme);
  const page = await ctx.newPage();
  const shots = [], tiny = {}, bg = {};
  const probe = await browser.newPage();
  for (const p of pages) {
    await page.goto(pathToFileURL(path.join(root, p.file)).href);
    await page.waitForFunction(() => window.c2Lab && document.querySelector('.c2-station'), null, {timeout: 20000}).catch(() => {});
    await page.evaluate(t => { if (window.CourseTheme?.set) window.CourseTheme.set(t); else document.documentElement.dataset.theme = t; }, theme);
    const n = await page.evaluate(() => document.querySelectorAll('.c2-station').length);
    for (let i = 0; i < (firstOnly ? 1 : Math.max(1, n)); i++) {
      if (n) await page.evaluate(i => window.c2Lab.select(i), i);
      await page.waitForTimeout(i === 0 ? 3500 : 2200);
      const base = `${p.name}-s${i + 1}`;
      const full = path.join(out, 'pages', base + '.png'), stage = path.join(out, 'pages', base + '-stage.png');
      await page.screenshot({path: full});
      const box = await page.evaluate(() => { const r = document.querySelector('.c2-stage')?.getBoundingClientRect(); return r && {x: r.x, y: r.y, width: r.width, height: r.height}; });
      if (box) await page.screenshot({path: stage, clip: box});
      // 三维区底色抽样：左右两侧中线附近、左下角上方各取几点（避开工具条和浮签），记下出现最多的颜色
      if (box) {
        const png = (await page.screenshot({clip: box})).toString('base64');
        bg[base] = await probe.evaluate(async ({png, w, h}) => {
          const img = new Image(); img.src = 'data:image/png;base64,' + png; await img.decode();
          const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
          const g = c.getContext('2d'); g.drawImage(img, 0, 0);
          const sx = img.width / w, pts = [];
          for (const fy of [.35, .5, .65]) for (const fx of [.015, .985]) pts.push([fx * w, fy * h]);
          const hex = ([x, y]) => '#' + [...g.getImageData(Math.round(x * sx), Math.round(y * sx), 1, 1).data.slice(0, 3)].map(v => v.toString(16).padStart(2, '0')).join('');
          const list = pts.map(hex), count = {};
          for (const x of list) count[x] = (count[x] || 0) + 1;
          return {mode: Object.entries(count).sort((a, b) => b[1] - a[1])[0][0], samples: list};
        }, {png, w: box.width, h: box.height});
      }
      shots.push({name: base, task: p.name, station: i, full, stage: box ? stage : full,
        label: await page.evaluate(i => document.querySelectorAll('.c2-station')[i]?.textContent.replace(/[✓\s]+/g, ' ').trim() || '', i)});
      tiny[base] = await page.evaluate(tinyAudit);
      // 第二章：嵌入的原版实验页（file:// 下跨源，逐个 frame 检查其中可见的三维区文字）
      for (const f of page.frames().slice(1)) {
        try {
          tiny[base].push(...await f.evaluate(() => [...document.querySelectorAll('body *')].filter(el => {
            if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return false;
            const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
            return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && +cs.opacity !== 0 && !el.closest('.c2-embed-hide') && parseFloat(cs.fontSize) < 12;
          }).map(el => ({size: parseFloat(getComputedStyle(el).fontSize), text: el.textContent.replace(/\s+/g, ' ').trim().slice(0, 60), where: 'iframe', cls: String(el.className?.baseVal ?? el.className).slice(0, 40)}))));
        } catch {}
      }
    }
    process.stdout.write(p.name + ' ');
  }
  fs.writeFileSync(path.join(out, 'tiny-text.json'), JSON.stringify(tiny, null, 1));
  fs.writeFileSync(path.join(out, 'stage-bg.json'), JSON.stringify(bg, null, 1));
  console.log('\n三维区底色（出现最多的抽样色）：\n' + Object.entries(bg).map(([k, v]) => `${k.padEnd(22)} ${v.mode}  ${v.samples.join(' ')}`).join('\n'));

  /* 拼联系表 */
  const sheet = async (list, file, cols, cellW, key) => {
    const img = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
    const html = `<html><body style="margin:0;background:${theme === 'dark' ? '#0d1218' : '#ffffff'};font:13px/1.3 'PingFang SC',sans-serif;color:${theme === 'dark' ? '#cfd8e3' : '#203040'}">
      <div style="display:grid;grid-template-columns:repeat(${cols},${cellW}px);gap:14px;padding:16px">
      ${list.map(s => `<figure style="margin:0"><img src="${img(s[key])}" style="width:${cellW}px;display:block;border:1px solid #8884"><figcaption style="padding:4px 2px">${s.name} · ${s.label}</figcaption></figure>`).join('')}
      </div></body></html>`;
    const pg = await browser.newPage({viewport: {width: cols * (cellW + 14) + 18, height: 400}});
    await pg.setContent(html); await pg.waitForTimeout(300);
    await pg.screenshot({path: file, fullPage: true}); await pg.close();
  };
  await sheet(shots.filter(s => s.station === 0), path.join(out, 'contact-pages.png'), 5, 360, 'full');
  await sheet(shots, path.join(out, 'contact-stages.png'), 7, 260, 'stage');
  await browser.close();
  console.log(`\n联系表：${path.join(out, 'contact-pages.png')}、contact-stages.png（${shots.length} 张）`);
})().catch(e => { console.error(e); process.exitCode = 1; });

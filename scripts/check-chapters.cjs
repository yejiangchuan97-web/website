/* 统一任务页外壳的整体检查（第一～八章全部任务页）。
 * 逐页打开 course/catalog.json 里的任务页，在 1440×810、1366×640 下注入 scripts/qa/shell-check.page.js 并运行：
 *   页头左上角回主页本章展台、当前任务标记、深浅色切换；2～5 个工位逐个切换，各有三维画面、原页面状态和“试一试”；
 *   页面不纵向滚动、不横向溢出；页头任务链接都指向存在的文件；页面无脚本错误、不访问外网。
 * 用法：node scripts/check-chapters.cjs [--chapter 4] [--site <目录>] [--screenshots <目录>]
 * 需要 Playwright（npm i -D playwright && npx playwright install chromium）。没有 Playwright 时，可在浏览器控制台注入
 * shell-check.page.js 后运行 `await __shellCheck()`，做同样的检查。各页模型逻辑由 node scripts/test.mjs 覆盖。
 */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const {pathToFileURL, fileURLToPath} = require('node:url');
let chromium;
try { ({chromium} = require('playwright')); } catch {
  console.error('需要 Playwright：npm i -D playwright && npx playwright install chromium');
  process.exit(2);
}
const args = process.argv.slice(2), arg = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const root = path.resolve(arg('--site', path.join(__dirname, '..'))), shots = arg('--screenshots', null), only = arg('--chapter', null);
const checker = fs.readFileSync(path.join(__dirname, 'qa', 'shell-check.page.js'), 'utf8');

// 任务页：catalog 里的全部任务；3-3 的入口是跳转页，改查它的两个实验页
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'course/catalog.json'), 'utf8')).tasks;
const pages = catalog.flatMap(t => t.id === '3-3'
  ? ['reducers', 'conversion'].map(p => ({task: '3-3', file: `course/chapters/03/tasks/3-3/${p}.html`}))
  : [{task: t.id, file: t.demo}])
  .filter(p => !only || p.task.split('-')[0] === String(Number(only)));
const VIEWPORTS = [{width: 1440, height: 810}, {width: 1366, height: 640}];

(async () => {
  const browser = await chromium.launch({headless: true}), failures = [], passed = [];
  try {
    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage({viewport});
      page.setDefaultTimeout(20000);
      const errors = [], external = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('request', r => { if (/^https?:/.test(r.url())) external.push(r.url()); });
      for (const {task, file} of pages) {
        errors.length = 0; external.length = 0;
        const where = `${task} ${path.basename(file)} @${viewport.width}×${viewport.height}`;
        await page.goto(pathToFileURL(path.join(root, file)).href);
        await page.addScriptTag({content: checker});
        const r = await page.evaluate(task => window.__shellCheck({task}), task);
        if (shots) { fs.mkdirSync(shots, {recursive: true}); await page.screenshot({path: path.join(shots, `${task}-${path.basename(file, '.html')}-${viewport.width}.png`)}); }
        for (const link of r.taskLinks) {
          const target = link.startsWith('file:') ? fileURLToPath(link.split('#')[0].split('?')[0]) : null;
          if (target && !fs.existsSync(target)) r.problems.push('页头链接指向不存在的文件：' + link);
        }
        if (errors.length) r.problems.push('脚本错误：' + errors.join(' | '));
        if (external.length) r.problems.push('访问了外网：' + external.join(' '));
        if (r.problems.length) failures.push({where, problems: r.problems});
        else passed.push(`${where}：${r.stations.length} 个工位，试一试 ${r.stations.map(s => s.locked ? '锁' : s.cards).join('/')}`);
      }
      await page.close();
    }
  } finally { await browser.close(); }
  console.log(passed.join('\n'));
  if (failures.length) console.error(JSON.stringify(failures, null, 2));
  assert.equal(failures.length, 0, `${failures.length} 处页面检查未通过`);
  console.log(`外壳检查通过：${passed.length} 次（${pages.length} 页 × ${VIEWPORTS.length} 种视口）`);
})().catch(e => { console.error(e.message || e); process.exitCode = 1; });

import {readFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join, relative} from 'node:path';

/** 全课程统一任务页外壳的构建入口（原地模式）。
 * 任务目录里有 src/stations.js 时，把 lab-shell + native 外壳 + 任务自己的 stations.js/.css 内联进页面：
 *   页头（本章任务）→ 工位条（本页活动）→ 三维区 + 操作面板 + 试一试。原页面的三维区与控件原样搬进外壳。
 * 没有 stations.js 时原样返回 html，页面保持旧版式。
 *   html     原页面（已生成好的完整 HTML）
 *   task     任务号，如 '4-1'
 *   page     同一任务有多个页面时的页面名，如 'predict'（可省略）
 */
const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = join(HERE, '../..');
const read = p => readFileSync(p, 'utf8');
const safe = code => code.replace(/<\/script/gi, '<\\/script');

export function stationsDir(task) {
  return join(ROOT, 'course/chapters', task.split('-')[0].padStart(2, '0'), 'tasks', task, 'src');
}
export function hasStations(task) { return existsSync(join(stationsDir(task), 'stations.js')); }

export function chapterInfo(task, page = '') {
  const chapters = JSON.parse(read(join(HERE, 'chapters.json')));
  const chapter = chapters[task.split('-')[0].padStart(2, '0')];
  if (!chapter) throw new Error(`shared/lab-shell/chapters.json 里没有任务 ${task} 所在的章`);
  const own = chapter.tasks.filter(t => (t.task || t.id) === task);
  const nav = (own.find(t => t.page === page) || own[0] || {id: task}).id;
  return {chapter, nav};
}

export function labShell(html, task, page = '') {
  const dir = stationsDir(task), stations = join(dir, 'stations.js');
  if (!existsSync(stations)) return html;
  const own = join(dir, 'stations.css');
  const css = [join(HERE, 'lab-shell.css'), join(HERE, 'native.css'), ...(existsSync(own) ? [own] : [])].map(read).join('\n');
  const js = [join(HERE, 'lab-shell.js'), join(HERE, 'native.js'), stations].map(p => safe(read(p))).join('\n');
  const {chapter, nav} = chapterInfo(task, page);
  html = html.replace('</head>', () => `<style data-lab-shell>${css}</style></head>`);
  // 三维区底色取值器放在最前面：原页面的场景一建好就能用统一底色
  const tone = safe(read(join(HERE, 'stage-tone.js')));
  html = html.replace(/<head[^>]*>/i, m => `${m}<script data-lab-shell>${tone}</script>`);
  // 放在 body 最后：原页面的程序都已运行，接口可用；再把原有元素搬进新版式。
  const at = html.lastIndexOf('</body>');
  return html.slice(0, at) + `<script data-lab-shell>window.CHAPTER_LAYOUT=${JSON.stringify({task, page, nav, chapter})};\n${js}</script>` + html.slice(at);
}

/** 运行时加载外壳的页面（如 shared/workshop 生成的轻量页面）用：返回要插到 </body> 前的标签，路径相对页面所在目录。 */
export function labShellTags(task, page = '', pageDir = stationsDir(task) + '/..') {
  const dir = stationsDir(task);
  if (!existsSync(join(dir, 'stations.js'))) return '';
  const rel = p => relative(pageDir, p).split('\\').join('/');
  const {chapter, nav} = chapterInfo(task, page);
  const own = join(dir, 'stations.css');
  return [
    `<link data-lab-shell rel="stylesheet" href="${rel(join(HERE, 'lab-shell.css'))}">`,
    `<link data-lab-shell rel="stylesheet" href="${rel(join(HERE, 'native.css'))}">`,
    existsSync(own) ? `<link data-lab-shell rel="stylesheet" href="${rel(own)}">` : '',
    `<script data-lab-shell>window.CHAPTER_LAYOUT=${JSON.stringify({task, page, nav, chapter})};</script>`,
    `<script data-lab-shell src="${rel(join(HERE, 'lab-shell.js'))}"></script>`,
    `<script data-lab-shell src="${rel(join(HERE, 'native.js'))}"></script>`,
    `<script data-lab-shell src="${rel(join(dir, 'stations.js'))}"></script>`,
  ].filter(Boolean).join('');
}

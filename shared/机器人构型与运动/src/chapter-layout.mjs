import {labShell, hasStations} from '../../lab-shell/native-layout.mjs';
import {readFileSync} from 'node:fs';
const read = name => readFileSync(new URL(name, import.meta.url), 'utf8');
const safe = code => code.replace(/<\/script/gi, '<\\/script');

/** 第三章页面版式。
 * 任务目录里有 src/stations.js 的页面，使用全课程统一的任务页外壳（shared/lab-shell）：
 *   页头（本章任务）→ 工位条（本页活动）→ 三维区 + 操作面板 + 试一试。原页面的三维区与控件原样搬进外壳。
 * 其余页面继续使用原来的 1600×900 章节版式。
 */
export function chapterLayout(html, task, page = '') {
  if (hasStations(task)) return labShell(html, task, page);
  const css = read('./chapter-layout.css'), js = safe(read('./chapter-layout.js'));
  html = html.replace('</head>', `<style data-chapter-layout>${css}</style></head>`);
  // Run after the markup, before the lessons bind controls or create their renderer.
  html = html.replace(/<script\b/, `<script>window.CHAPTER_LAYOUT={task:${JSON.stringify(task)},page:${JSON.stringify(page)}};${js}</script><script`);
  return html;
}

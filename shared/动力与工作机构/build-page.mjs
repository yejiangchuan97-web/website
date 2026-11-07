/* 生成第二章任务页 index.html：统一页头、工位条与操作面板；三维区嵌入原版实验页。工位代码放在任务目录 src/stations.js。
 * 用法（任务目录的 src/build.mjs）：buildTaskPage(import.meta.url, '2-1')
 */
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {dirname, join, relative} from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../..');
/** 内容摘要作为版本号，避免浏览器沿用旧文件。 */
const ver = file => '?v=' + createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 10);
const SHORT = {'2-1': '动力装置', '2-2': '传递与变换', '2-3': '工作机构'};

export function buildTaskPage(srcUrl, taskId, scripts = ['src/stations.js']) {
  const taskDir = join(dirname(fileURLToPath(srcUrl)), '..');
  const catalog = JSON.parse(readFileSync(join(root, 'course/catalog.json'), 'utf8'));
  const chapter = catalog.tasks.filter(t => t.scene === 2);
  const task = chapter.find(t => t.id === taskId);
  if (!task) throw new Error('catalog.json 中没有任务 ' + taskId);
  const rel = p => relative(taskDir, join(root, p)).split('\\').join('/') + ver(join(root, p));
  const local = p => p + ver(join(taskDir, p));
  const page = {
    task: taskId, title: task.title,
    chapter: {title: '第二章 · 动力与工作机构', href: 'course/chapters/02/overview/index.html'},
    tasks: chapter.map(t => ({id: t.id, title: t.title, short: SHORT[t.id] || t.title, href: t.demo})),
  };
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>${taskId} ${task.title}｜智能建筑机械与机器人</title>
<link rel="stylesheet" href="${rel('shared/lab-shell/lab-shell.css')}">
</head>
<body>
<noscript>此页面需要 JavaScript。请在浏览器中启用脚本后打开。</noscript>
<script>window.C2Page=${JSON.stringify(page)};</script>
<script src="${rel('shared/lab-shell/lab-shell.js')}"></script>
${scripts.map(s => `<script src="${local(s)}"></script>`).join('\n')}
</body>
</html>
`;
  writeFileSync(join(taskDir, 'index.html'), html);
  console.log(`Built ${taskId} ${task.title} -> index.html`);
}

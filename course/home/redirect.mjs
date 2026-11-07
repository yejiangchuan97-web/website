/* 旧章节封面地址 course/chapters/0N/overview/index.html 保留为跳转页：章节封面已并入课程首页的 #chapter-N。 */
import {readFileSync, writeFileSync} from 'node:fs';
const root = new URL('../../', import.meta.url);
export function writeRedirect(chapter) {
  const n = Number(chapter), nn = String(n).padStart(2, '0');
  const catalog = JSON.parse(readFileSync(new URL('course/catalog.json', root), 'utf8'));
  if (!catalog.tasks.some(t => t.scene === n)) throw new Error('No active tasks for chapter ' + n);
  const target = `../../../home/index.html#chapter-${n}`;
  const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>第${'一二三四五六七八'[n - 1]}章｜智能建筑机械与机器人</title><link rel="canonical" href="${target}"><script>location.replace(${JSON.stringify(target)});</script><noscript><meta http-equiv="refresh" content="0;url=${target}"></noscript><style>body{margin:0;padding:48px 24px;background:#e8f0f9;color:#12304f;font:16px/1.8 "PingFang SC","Microsoft YaHei",sans-serif}a{color:#2467c9;font-weight:600}</style></head>
<body><p>章节封面已并入课程首页。<a href="${target}">打开第${'一二三四五六七八'[n - 1]}章 →</a></p></body></html>
`;
  writeFileSync(new URL(`course/chapters/${nn}/overview/index.html`, root), html);
  console.log(`Chapter ${n} cover → course/home/index.html#chapter-${n}`);
}

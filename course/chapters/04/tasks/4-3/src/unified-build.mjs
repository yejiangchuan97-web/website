import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {labShell} from '../../../../../../shared/lab-shell/native-layout.mjs';

/* 任务 4-3：标注、预测、评估三个实验放进同一个文档，由统一任务页外壳（src/stations.js）排成三个工位。
 * predict.html、evaluate.html 只保留为旧链接的跳转页。 */
const HERE = fileURLToPath(new URL('.', import.meta.url));
const lessons = ['annotation', 'predict', 'evaluate'];
const read = name => readFileSync(join(HERE, name), 'utf8');
const inlineScript = value => value.replace(/<\/script/gi, '<\\/script');

export function buildUnifiedHelmet() {
  const metadata = JSON.parse(read('../assets/asset-heads.json'));
  const asset = (width, clear) => {
    const item = metadata.images.find(image => image.width === width);
    let svg = read('../assets/' + item.file);
    if (clear) svg = svg.replace(/<g id="worker-H06"[^>]*>[\s\S]*?<\/g>/, '')
      .replace(/六名工人，其中三名可明确判断戴安全帽、两名未戴安全帽，一名头部被结构遮挡而待复核/, '五名工人，其中三名戴安全帽、两名未戴安全帽');
    return {width:item.width, height:item.height, svg, objects:item.objects.filter(object => !clear || object.classId !== null).map(object => ({id:object.id, cls:object.classId === null ? 'review' : object.classId, bbox:object.bbox, reviewReason:object.reviewReason}))};
  };
  const data = {clear:asset(640, true), wide:asset(960, true), occluded:asset(640, false)};
  // 原实验的样式：变量加 --h43- 前缀、main 改成 #lesson-main，避免覆盖外壳与全课程主题
  const css = [read('style.css'), read('page-extra.css')].join('\n')
    .replace(/--(ink|muted|blue|deep|soft|line|paper|good|bad|warn)\b/g, '--h43-$1')
    .replace(/font-synthesis:none;color:var\(--h43-ink\);background:var\(--h43-paper\)\}/, 'font-synthesis:none}')
    .replace(/(^|[}\s])main\{/g, '$1#lesson-main{');
  const common = `const LESSON_DATA=${JSON.stringify(data)};\nconst $=id=>document.getElementById(id);const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const imageURI=s=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s);let toastTimer;function toast(s){$('toast').textContent=s;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4200);}\n` + read('model.mjs').replace(/^export /gm, '');
  const body = lessons.map(key => `<div class="h43-lesson" id="lesson-${key}" data-lesson="${key}">${read(key + '.body.html')}</div>`).join('');
  const script = [common, ...lessons.map(key => read(key + '.js'))].join('\n');
  const html = `<!doctype html><html lang="zh-CN" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>安全帽与 YOLO</title><style>${css}</style></head>
<body><main id="lesson-main"><div id="workbench">${body}</div></main><div id="toast" role="status" aria-live="polite"></div><noscript><p>请启用 JavaScript 以使用标注、预测和评估实验。</p></noscript><script>${inlineScript(script)}</script></body></html>`;
  writeFileSync(join(HERE, '..', 'index.html'), labShell(html, '4-3'));
  console.log('built index.html · 标注 / 预测 / 评估三个工位');
  // 旧入口：跳到对应工位（带上 ?threshold=）
  for (const key of ['predict', 'evaluate']) {
    const go = `index.html#${key}`;
    writeFileSync(join(HERE, '..', key + '.html'), `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>安全帽识别</title><meta http-equiv="refresh" content="0;url=${go}"><script>location.replace('${go}'+location.search)</script></head><body><p><a href="${go}">打开安全帽识别</a></p></body></html>\n`);
    console.log(`built ${key}.html · 跳转到 ${go}`);
  }
}

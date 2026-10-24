import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {integrateChapter4} from '../../公共资源/感知与识别/chapter-layout.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const pages = [
  {key:'annotation', file:'index.html', title:'标注', description:'人工定义目标'},
  {key:'predict', file:'predict.html', title:'预测', description:'筛选模型输出'},
  {key:'evaluate', file:'evaluate.html', title:'评估', description:'对照真值核验'}
];
const read = name => readFileSync(join(HERE, name), 'utf8');
const inlineJSON = value => JSON.stringify(value).replace(/</g, '\\u003c');
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
  const css = [read('style.css'), read('page-extra.css'), read('widescreen.css'),read('dark-theme.css')].join('\n');
  const common = `const LESSON_DATA=${JSON.stringify(data)};\nconst $=id=>document.getElementById(id);const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const imageURI=s=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s);let toastTimer;function toast(s){$('toast').textContent=s;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4200);}\n` + read('model.mjs').replace(/^export /gm, '');
  const documents = Object.fromEntries(pages.map(page => {
    const script = [read('widescreen.js'), common, read(page.key + '.js'), read('frame-bridge.js')].join('\n');
    return [page.key, `<!doctype html><html lang="zh-CN" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${page.title}实验</title><style>${css}</style></head><body data-lesson="${page.key}"><main id="lesson-main"><div id="workbench">${read(page.key + '.body.html')}</div></main><div id="toast" role="status" aria-live="polite"></div><script>${inlineScript(script)}</script></body></html>`];
  }));
  const navigation = pages.map((page, index) => `<button class="shell-tab" id="tab-${page.key}" data-view="${page.key}" role="tab" aria-selected="false" aria-controls="frame-${page.key}" tabindex="-1"><span class="tab-number">0${index + 1}</span><strong>${page.title}</strong><small>${page.description}</small><span class="tab-arrow" aria-hidden="true">↗</span></button>`).join('');
  const frames = pages.map(page => `<iframe id="frame-${page.key}" class="lesson-frame" data-view="${page.key}" title="${page.title}实验" role="tabpanel" aria-labelledby="tab-${page.key}" hidden></iframe>`).join('');
  for (const page of pages) {
    // Every legacy filename also contains all three lessons for single-file sharing.
    const html = `<!doctype html>
<html lang="zh-CN" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><meta name="theme-color" content="#111d30"><title>安全帽与 YOLO · 三合一教学实验</title><style>${read('shell.css')}</style></head>
<body data-start-view="${page.key}"><div id="lesson-shell">
<header class="shell-header"><div class="shell-brand"><span class="shell-mark" aria-hidden="true">◈</span>安全帽与 YOLO</div><span class="shell-subtitle">任务 4-3 · 施工视觉实验室</span><span class="shell-status">离线可用 · 三个实验，一个入口</span><div class="shell-actions"><button class="shell-action" id="share-button">分享此课堂</button><button class="shell-action" id="fullscreen-button">全屏演示 ↗</button></div></header>
<nav class="shell-tabs" role="tablist" aria-label="安全帽教学实验">${navigation}</nav><div class="shell-frames">${frames}</div><div id="shell-message" role="status" aria-live="polite"></div></div>
<p class="orientation-tip"><strong>横屏观看，操作更清楚</strong>三个实验均保持 16:9 画面，可点击右上角全屏演示。</p><noscript><p class="noscript">请启用 JavaScript 以使用标注、预测和评估实验。</p></noscript>
<script type="application/json" id="lesson-documents">${inlineJSON(documents)}</script><script>${inlineScript(read('shell.js'))}</script></body></html>`;
    writeFileSync(join(HERE, '..', page.file), integrateChapter4(html,'vision'));
    console.log(`built ${page.file} · all 3 lessons embedded · ${Buffer.byteLength(html)} bytes`);
  }
}

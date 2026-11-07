/* 原地模式的统一任务页外壳（全课程共用）：把原页面装进 lab-shell。
 * 原页面的全部元素先移入一个隐藏容器（仍在文档里，原有程序照常工作），
 * 各任务的 src/stations.js 再把需要的三维区和控件搬进外壳。
 * 章节标题和本章任务列表来自 shared/lab-shell/chapters.json，由 native-layout.mjs 写进 window.CHAPTER_LAYOUT。
 */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const all = s => [...document.querySelectorAll(s)];

  // 外壳里的原有滑轨：已走过的一段用主色填充，跟随拖动和程序改值
  const fill = input => {
    const min = +input.min || 0, max = input.max === '' ? 100 : +input.max, v = +input.value;
    input.style.setProperty('--p', (((v - min) / ((max - min) || 1)) * 100).toFixed(1) + '%');
  };
  document.addEventListener('input', e => { if (e.target.matches?.('input[type="range"]')) fill(e.target); }, true);
  setInterval(() => document.querySelectorAll('.c2-panel input[type="range"], .c2-strip input[type="range"]').forEach(fill), 250);

  window.NativeShell = window.C3Shell = {
    $, all,
    start(cfg) {
      const layout = window.CHAPTER_LAYOUT || {}, chapter = layout.chapter || {};
      const legacy = document.createElement('div');
      legacy.className = 'c3-legacy'; legacy.hidden = true;
      [...document.body.children]
        .filter(e => !['SCRIPT', 'STYLE', 'DIALOG', 'TEMPLATE'].includes(e.tagName) && e.id !== 'toast' && !e.matches('.course-theme-toggle'))
        .forEach(e => legacy.append(e));
      document.body.append(legacy);
      document.documentElement.dataset.c3Task = layout.task || '';
      LabShell.native({
        chapter: {title: chapter.title, href: chapter.href},
        tasks: chapter.tasks || [], taskNav: layout.nav, hint: '拖动旋转 · 滚轮缩放', progressKey: layout.nav,
        ...cfg,
      });
    },
  };
})();

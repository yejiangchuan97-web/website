/* Arrange each lesson inside the shared 16:9 teaching screen before it starts. */
(() => {
  const main = document.getElementById('lesson-main');
  const workbench = document.getElementById('workbench');
  if (!main || !workbench) return;
  const lesson = document.body.dataset.lesson;
  const titles = {
    annotation: ['亲手画框，让图像成为数据。', '框住头部 → 指定类别 → 检查标签'],
    predict: ['模型看到了什么？', '固定候选 → 调整阈值 → 比较保留结果'],
    evaluate: ['一次判断，要经得起核对。', '对照真值 → 一对一匹配 → 统计误检与漏检']
  };
  const [title, subtitle] = titles[lesson] || titles.annotation;
  const heading = document.createElement('header');
  heading.className = 'ws-heading';
  heading.innerHTML = `<div><h1>${title}</h1><p>${subtitle}</p></div><button type="button" class="btn ws-knowledge-open" aria-haspopup="dialog" aria-controls="lesson-knowledge" aria-expanded="false"><span aria-hidden="true">▤</span> 知识与练习 <span aria-hidden="true">↗</span></button>`;
  main.prepend(heading);

  const overlay = document.createElement('div');
  overlay.className = 'ws-knowledge-overlay';
  overlay.hidden = true;
  overlay.innerHTML = '<section class="ws-knowledge" id="lesson-knowledge" role="dialog" aria-modal="true" aria-labelledby="knowledge-title"><header class="ws-knowledge-header"><div><span>LEARNING NOTES</span><h2 id="knowledge-title">知识与练习</h2></div><button type="button" class="btn ws-knowledge-close" aria-label="关闭知识与练习">返回实验台 ×</button></header><div class="ws-knowledge-content"></div></section>';
  document.body.append(overlay);
  const knowledge = overlay.querySelector('.ws-knowledge-content');
  const workspace = workbench.querySelector('.workspace');
  const originalRoot = workbench.querySelector('.helmet-main') || workbench;
  const metrics = lesson === 'evaluate' ? document.getElementById('evaluation-metrics').closest('.lesson-section') : null;
  const tools = document.createElement('div');
  tools.className = 'ws-tool-rail';
  const stagePanel = workspace.querySelector(':scope > .panel');
  stagePanel.classList.add('ws-stage-panel');
  stagePanel.append(tools);

  if (lesson === 'annotation') {
    tools.append(stagePanel.querySelector('.image-picker'), stagePanel.querySelector('.toolbar'), stagePanel.querySelector('.progress-strip'));
    const labelHeading = document.createElement('h3');
    labelHeading.className = 'ws-label-heading';
    labelHeading.textContent = '当前 YOLO 标签';
    tools.append(labelHeading, document.getElementById('yoloLine'));
    const labelHelp = document.createElement('p');
    labelHelp.className = 'tiny muted';
    labelHelp.textContent = '选中或调整框，五列数字同步更新。';
    tools.append(labelHelp);
    const exportShortcut = document.createElement('button');
    exportShortcut.type = 'button';
    exportShortcut.className = 'btn ws-export-shortcut';
    exportShortcut.textContent = '检查与导出 →';
    exportShortcut.onclick = () => {
      const target = document.getElementById('checkBtn');
      target.scrollIntoView({block: 'center', behavior: 'smooth'});
      target.focus({preventScroll: true});
    };
    tools.append(exportShortcut);
  } else if (lesson === 'predict') {
    tools.append(stagePanel.querySelector('.prediction-controls'), workspace.querySelector('.score-note'));
  } else {
    tools.append(originalRoot.querySelector('.evaluation-controls'), originalRoot.querySelector('.evaluation-rule'));
    stagePanel.querySelector('.overlay-toolbar').classList.add('ws-overlay-toolbar');
    metrics.classList.add('ws-metrics');
    const explanations = document.createElement('section');
    explanations.className = 'note';
    explanations.setAttribute('aria-label', '指标说明');
    const note = metrics.querySelector('.evaluation-metric-note:not([id])');
    if (note) explanations.append(note);
    knowledge.append(explanations);
  }

  // Move existing nodes, including their IDs, so all lesson logic keeps its targets.
  for (const node of Array.from(originalRoot.children)) {
    if (node !== workspace && node !== metrics) knowledge.append(node);
  }
  workbench.append(workspace);
  if (metrics) workbench.append(metrics);
  if (originalRoot !== workbench) originalRoot.remove();
  workbench.classList.add('ws-board');
  if (metrics) workbench.classList.add('ws-board-with-metrics');

  const opener = heading.querySelector('.ws-knowledge-open');
  const closer = overlay.querySelector('.ws-knowledge-close');
  function setKnowledge(open) {
    overlay.hidden = !open;
    opener.setAttribute('aria-expanded', String(open));
    main.inert = open;
    if (open) closer.focus();
    else opener.focus({preventScroll: true});
  }
  opener.addEventListener('click', () => setKnowledge(true));
  closer.addEventListener('click', () => setKnowledge(false));
  overlay.addEventListener('click', event => { if (event.target === overlay) setKnowledge(false); });
  document.addEventListener('keydown', event => {
    if (overlay.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      setKnowledge(false);
    } else if (event.key === 'Tab') {
      const focusable = Array.from(overlay.querySelectorAll('button, a[href], input, select, textarea, [tabindex]')).filter(element => !element.disabled && element.tabIndex >= 0 && element.getClientRects().length);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }, true);
  window.helmetKnowledge = {open: () => setKnowledge(true), close: () => { if (!overlay.hidden) setKnowledge(false); }};
})();

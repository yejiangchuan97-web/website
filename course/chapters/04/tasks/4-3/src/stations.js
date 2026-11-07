/* 任务 4-3 安全帽识别 —— 标注、预测、评估三个原有实验放在同一页面里，成为三个工位。
 * 原实验的画布、候选框和全部逻辑保持不变（helmetAnnotationState / helmetPredictionState / helmetEvaluationState），
 * 画布搬进左侧大区，原有控件搬进面板；原页面的小问答和“课堂挑战”做成试一试。
 */
(() => {
  'use strict';
  const {$} = NativeShell;
  const h = (tag, cls, ...kids) => { const e = document.createElement(tag); if (cls) e.className = cls; e.append(...kids); return e; };
  const A = () => window.helmetAnnotationState?.(), P = () => window.helmetPredictionState?.(), E = () => window.helmetEvaluationState?.();

  // 旧入口 predict.html / evaluate.html 跳转为 #predict、#evaluate（可带 ?threshold=），落到对应工位
  const [hashId, hashQuery = ''] = location.hash.slice(1).split('?');
  const startId = ['annotation', 'predict', 'evaluate'].includes(hashId) ? hashId : 'annotation';
  history.replaceState(null, '', '#' + startId);

  // 原程序用 hidden 控制显隐的元素（答题反馈、零值说明）外面包一层再搬：adopt 只会取消外层的 hidden
  const wrap = (...nodes) => { const list = nodes.filter(Boolean); if (!list.length) return null; const box = h('div', 'h43-wrap'); list[0].before(box); box.append(...list); return box; };
  const lessonPanel = key => $(`#lesson-${key} .workspace > .panel`);
  const EL = {
    main: $('#lesson-main'), toast: $('#toast'),
    a: {
      top: [$('#lesson-annotation .image-picker'), $('#lesson-annotation .toolbar')],
      stage: [$('#canvasWrap'), $('#lesson-annotation .progress-strip'), lessonPanel('annotation').querySelector('.stage-bottom')],
      classes: $('#lesson-annotation .class-choices'),
      coords: [$('#lesson-annotation .selected-meta'), $('#lesson-annotation .coordinate-grid'), $('#boxList')],
      label: [$('#yoloLine'), $('#formulaGrid'), $('#lesson-annotation .equations'), $('#lesson-annotation .formula-panel .note')],
      check: [$('#checkBtn'), $('#checkResult'), $('#lesson-annotation .review-check'), $('#lesson-annotation .export-stack'), $('#exportNote')],
      quiz: $('#lesson-annotation .lesson-card.question'),
    },
    p: {
      top: $('#lesson-predict .prediction-controls .toolbar'),
      stage: [$('#lesson-predict .helmet-image-stage'), lessonPanel('predict').querySelector('.stage-bottom')],
      threshold: [$('#lesson-predict .threshold-top'), $('#prediction-threshold'), $('#lesson-predict .range-labels'), $('#prediction-threshold-help')],
      list: [$('#lesson-predict .prediction-counts'), $('#prediction-candidate-list')],
      score: $('#lesson-predict .score-note'),
      question: wrap($('#prediction-question'), $('#prediction-answer-feedback')),
      questionTitle: $('#lesson-predict .lesson-section .panel-head h2')?.textContent || '',
    },
    e: {
      top: $('#lesson-evaluate .overlay-toolbar'),
      stage: [$('#lesson-evaluate .helmet-image-stage'), lessonPanel('evaluate').querySelector('.stage-bottom')],
      rule: $('#lesson-evaluate .evaluation-rule'),
      controls: $('#lesson-evaluate .evaluation-controls'),
      metrics: wrap($('#evaluation-metrics'), $('#evaluation-zero-note')),
      metricsToggle: $('#evaluation-toggle-metrics'),
      list: [$('#evaluation-list-summary'), $('#evaluation-prediction-list'), $('#lesson-evaluate .missed-section'), $('#evaluation-selection-note')],
      challenge: wrap($('#evaluation-start-challenge'), $('#evaluation-challenge-form'), $('#evaluation-challenge-feedback')),
      iou: $('#lesson-evaluate .iou-demo-grid'),
    },
  };

  // 工具条一行放下：按钮上不再写快捷键（保留在提示里）
  const relabel = (sel, text, title) => { const e = $(sel); if (e) { e.textContent = text; if (title) e.title = title; } };
  relabel('#selectTool', '↖ 选择', '选择 / 移动框（V）');
  relabel('#drawTool', '＋ 画框', '画新框（R）');
  relabel('#lesson-annotation label.upload', '＋ 导入图片', '导入自己的 PNG / JPEG / WebP 图片');
  /* 左侧大区：三个实验各一块画布，按工位显隐（这些节点由本脚本自己管理，始终留在文档里） */
  const stage = h('div', 'h43-stage');
  const panes = {};
  for (const [id, key] of [['annotation', 'a'], ['predict', 'p'], ['evaluate', 'e']]) {
    panes[id] = h('div', 'h43-pane h43-pane-' + id); panes[id].hidden = true;
    panes[id].append(...EL[key].stage.filter(Boolean));
    stage.append(panes[id]);
  }
  const tops = {
    annotation: h('div', 'h43-top h43-top-annotation', ...EL.a.top.filter(Boolean)),
    predict: h('div', 'h43-top h43-top-predict', ...[EL.p.top].filter(Boolean)),
    evaluate: h('div', 'h43-top h43-top-evaluate', ...[EL.e.top].filter(Boolean)),
  };

  /* 试一试用到的标记（原页面状态里没有的“做过某事”） */
  const flags = {};
  const resetFlags = () => Object.assign(flags, {quiz: false, zoom2: false, seen: new Set(), counted: false, revealed: false});
  resetFlags();
  document.addEventListener('click', e => {
    const ans = e.target.closest?.('[data-answer]');
    if (ans && ans.dataset.answer === 'no' && flags.zoom2) flags.quiz = true;
    if (ans && ans.dataset.answer === 'no' && !flags.zoom2) setTimeout(() => ctxFeedback('答对了。再把画布真的放大到 200%，亲眼看看五列数字。', 'info'), 0);
  });
  $('#evaluation-challenge-form')?.addEventListener('submit', () => setTimeout(() => {
    if ($('#evaluation-challenge-feedback')?.classList.contains('is-correct') && !flags.revealed) flags.counted = true;
  }, 0));
  // 看了解析再提交不算“自己数出”；重新开始独立核验后再算
  $('#evaluation-reveal-answer')?.addEventListener('click', () => { flags.revealed = true; });
  $('#evaluation-start-challenge')?.addEventListener('click', () => { flags.revealed = false; });
  let ctxFeedback = () => {};

  const fill = (input, value, type = 'input') => { if (!input) return; input.value = value; input.dispatchEvent(new Event(type, {bubbles: true})); };
  const check = (input, on) => { if (input && input.checked !== on) { input.checked = on; input.dispatchEvent(new Event('change', {bubbles: true})); } };

  const STATIONS = [
    {
      id: 'annotation', name: '标注', lead: '一个人头一个框：框住可见头部和所戴的安全帽，再看它怎样变成一行 YOLO 标签。',
      hint: '',
      build(c) {
        c.adopt(EL.a.classes, c.section('选中框的类别'));
        c.adopt(EL.a.coords, c.section('原图像素坐标'));
        c.adopt(EL.a.label, c.section('五列 YOLO 标签'));
        c.challenges([
          {id: 'five', icon: '⛑', title: '标全练习 A 的五个人头', hint: '画框、选类别，打开参考框核对', check: s => s.a.key === 'clear' && s.a.boxes.length >= 5 && s.a.issues.length === 0,
            result: '五个头部各一个框、类别正确：这张图可以作为一份训练样本了。'},
          {id: 'zoom', icon: '🔍', title: '放大到 200%，标签会变吗？', hint: '先放大画布，再在下方回答', check: () => flags.quiz,
            result: '放大只改变显示大小，标签始终按原图宽高计算。'},
          {id: 'wide', icon: '↔', title: '换宽幅图，看分母怎么变', hint: '选“练习 B · 宽幅场景”，选中一个框', check: s => s.a.key === 'wide' && Boolean(s.a.line),
            result: '原图宽 960：x 中心和宽度除以 960，y 方向仍除以 640。'},
          {id: 'review', icon: '?', title: '遮挡图里留一个待复核', hint: '选“练习 C”，看不清的头部标“待复核”', check: s => s.a.key === 'occluded' && s.a.boxes.some(b => b.cls === 'review'),
            result: '看不清就留下问题：待复核不是第三个训练类别，这张图只能存草稿。'},
        ]);
        if (EL.a.quiz) c.adopt(EL.a.quiz, c.section('想一想'));
        c.adopt(EL.a.check, c.section('检查与导出'));
      },
    },
    {
      id: 'predict', name: '预测', lead: '同一张图、同一组候选框：拖动置信度阈值，看哪些框被留下、哪些被筛掉。',
      hint: '',
      build(c) {
        c.adopt(EL.p.threshold, c.section(''));
        c.adopt(EL.p.list, c.section('候选结果'));
        c.challenges([
          {id: 'two', icon: '⚖', title: '比较 0.25 和 0.50', hint: '用上方两个按钮切换', check: () => flags.seen.has(0.25) && flags.seen.has(0.5),
            result: '门槛从 0.25 提到 0.50，低分的候选框被筛掉，其中有错的也有对的。'},
          {id: 'filtered', icon: '👁', title: '把被筛除的框也显示出来', hint: '勾选“显示被筛除的框”', check: s => s.p.showFiltered && s.p.filtered > 0,
            result: '虚线框没有消失，只是分数低于门槛，没被保留。'},
          {id: 'empty', icon: '⤒', title: '把阈值拉到一个都不剩', hint: '向右拖动阈值滑条', check: s => s.p.kept === 0,
            result: '门槛高过最高分，模型的输出就全被筛掉了：阈值只筛选，不重新预测。'},
          {id: 'answer', icon: '💬', title: '提高阈值一定更好吗？', hint: '在下方选一个判断', check: s => s.p.answer === 'tradeoff',
            result: '要同时看误检和漏检：低分框里也可能有正确目标。'},
        ]);
        c.adopt(EL.p.question, c.section(EL.p.questionTitle || '想一想'));
        if (EL.p.score) c.adopt(EL.p.score, c.section('读懂这个数字'));
      },
    },
    {
      id: 'evaluate', name: '评估', lead: '把预测和人工真值逐个对上：同类、IoU 达标、一对一，数出正确、误检和漏检。',
      hint: '',
      build(c) {
        c.adopt(EL.e.controls, c.section(''));
        c.adopt(EL.e.metrics, c.section('全图统计', c.adopt(EL.e.metricsToggle)));
        c.adopt(EL.e.list, c.section('逐框核对'));
        c.challenges([
          {id: 'fp', icon: '✗', title: '点一个误检，看原因', hint: '点红色的 FP 框或记录', check: s => s.e.selection?.type === 'prediction' && s.e.predictions.some(p => p.id === s.e.selection.id && p.status === 'fp'),
            result: '错类、重复、偏框、背景：误检的原因各不相同。'},
          {id: 'fn', icon: '○', title: '找到被漏检的人', hint: '在“漏检 FN”里点一项', check: s => s.e.selection?.type === 'truth' && s.e.missed.some(t => t.id === s.e.selection.id),
            result: '真值还在图里，只是没有同类且位置达标的预测与它配对。'},
          {id: 'count', icon: '✍', title: '自己数出 TP、FP、FN', hint: '开始独立核验，填三个数', check: () => flags.counted,
            result: '数对了：一个真值最多配一个预测，剩下的就是误检和漏检。'},
          {id: 'iou', icon: '▣', title: '把 IoU 演示拖到不达标', hint: '在下方拖动预测框', check: s => s.e.iouDemo.iou < s.e.iouThreshold,
            result: '两框错开后交集变小、并集变大，IoU 掉到门槛以下就不能配对。'},
        ]);
        c.adopt(EL.e.challenge, c.section('自己数一遍'));
        c.adopt(EL.e.iou, c.section('IoU：两个框有多接近'));
        if (EL.e.rule) c.adopt(EL.e.rule, c.section('匹配规则'));
      },
    },
  ];

  let currentId = null, lastToast = '';
  const showLesson = id => {
    currentId = id;
    for (const [k, pane] of Object.entries(panes)) pane.hidden = k !== id;
    for (const [k, top] of Object.entries(tops)) top.hidden = k !== id;
    // 标注台的 R / V / Delete / 方向键快捷键只在标注工位生效（原程序以 #lesson-main.inert 判断）
    if (EL.main) EL.main.inert = id !== 'annotation';
    // 标注画布按显示宽度计算角点手柄大小；画布搬进大区、尺寸稳定后让原程序重画一次（不改变参考框开关）
    if (id === 'annotation') for (const t of [80, 400]) setTimeout(() => $('#referenceToggle')?.dispatchEvent(new Event('change')), t);
  };

  NativeShell.start({
    task: '4-3', title: '安全帽识别',
    stage,
    stageTop: Object.values(tops),
    stations: STATIONS,
    select: showLesson,
    poll() {
      const s = {a: A(), p: P(), e: E()};
      if (!s.a || !s.p || !s.e) return null;
      if (s.a.zoom >= 2) flags.zoom2 = true;
      flags.seen.add(Math.round(s.p.threshold * 100) / 100);
      return s;
    },
    reset(id) {
      if (id === 'annotation') {
        const undo = $('#undoBtn');
        for (let i = 0; i < 80 && undo && !undo.disabled; i++) undo.click();
        fill($('#zoom'), '1', 'change'); check($('#referenceToggle'), false);
        flags.quiz = false; flags.zoom2 = false;
        $('#quizFeedback') && ($('#quizFeedback').textContent = '试着缩放画布，再观察上方五列数字。');
      } else if (id === 'predict') {
        fill($('#prediction-threshold'), 0.25); check($('#prediction-show-filtered'), false);
        flags.seen = new Set();
      } else {
        fill($('#evaluation-threshold'), 0.25); fill($('#evaluation-iou-threshold'), 0.5); fill($('#iou-offset'), 30);
        $('#evaluation-clear-selection')?.click();
        flags.counted = false;
      }
    },
    build(c) {
      showLesson(c.station.id);
      ctxFeedback = (t, k) => c.feedback(t, k);
      lastToast = EL.toast?.textContent.trim() || '';
      // 原页面的提示（#toast）转成外壳的提示条
      c.lab.onState(() => {
        const t = EL.toast?.classList.contains('show') ? EL.toast.textContent.trim() : '';
        if (t && t !== lastToast) c.feedback(t, /请|失败|不能|过小|太小|无法/.test(t) ? 'warn' : 'info');
        lastToast = t;
      });
      // 评估：点了一个框，把原页面对它的解释同时显示在提示条里（原解释在面板“逐框核对”下方）
      if (c.station.id === 'evaluate') {
        let lastSel = JSON.stringify(E()?.selection || null);
        c.lab.onState(st => {
          const sel = JSON.stringify(st.e.selection || null);
          if (sel !== lastSel && st.e.selection && !st.e.blind) c.feedback($('#evaluation-selection-note')?.textContent.trim(), 'info');
          lastSel = sel;
        });
      }
    },
  });
  // 旧链接带的阈值（#evaluate?threshold=0.50），只在预测、评估工位生效
  const query = new URLSearchParams(hashQuery).get('threshold');
  if (startId !== 'annotation' && query !== null && query.trim() !== '') {
    const v = Number(query);
    if (Number.isFinite(v) && v >= 0 && v <= 1) fill($(startId === 'evaluate' ? '#evaluation-threshold' : '#prediction-threshold'), v);
  }
})();

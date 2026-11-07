/* 任务 4-2 激光雷达与点云 —— 原页面的三维扫描台、点云和全部控件保持不变，搬进统一外壳；
 * 原来的四个实验中保留三个作为工位（遮挡与 A/B 两帧对齐已按用户意见撤掉，换位补扫并入工位②）。每个工位原有的“先预测、再用证据回答”关卡保留在面板里，并作为最后一张“试一试”卡片。
 * 状态全部读原页面接口 window.__LIDAR__（snapshot / getPoints / records），不另算一套。
 */
(() => {
  'use strict';
  const {$, all} = NativeShell;
  const lab = () => window.__LIDAR__;
  const EL = {
    stage: $('.workspace > .stage'),
    cards: Object.fromEntries(all('.experiment-card[data-experiment]').map(b => [b.dataset.experiment, b])),
    display: $('#displayOptions'),
    beam: $('#beamControls'), density: $('#densityControls'), evidence: $('#evidenceControls'),
    conversion: $('.point-strip .conversion'),
    progress: $('.scan-progress'), secondary: $('.secondary-actions'),
    capture: $('#captureButton'), recent: $('#recentEvidence'), count: $('#evidenceCount'),
    quiz: $('.controls .challenge'), feedback: $('#challengeFeedback'),
    tableBtn: $('#pointTableBtn'), recordBtn: $('#recordBtn'), reset: $('#resetExperiment'),
    toast: $('#toast'),
  };

  // 外壳已有任务名、工位名和提示条：原页面的标题区、手势说明、重复的按钮收起；显示选项直接展开
  for (const e of all('.stage .intro, #gestureHint, #quickCapture, .mobile-inline-controls, #primaryAction, .challenge-heading'))
    e.setAttribute('hidden', '');
  if (EL.display) EL.display.open = true;
  // 搬进面板的原按钮用外壳的按钮样式；“记录”是面板里唯一的主按钮
  for (const b of all('#captureButton, #checkAnswer, #sectionBtn, #scanButton, #stepButton, #clearPicks, #importBtn')) {
    b.classList.remove('text-button', 'capture-button', 'check-answer'); b.classList.add('c2-btn', 'c2-small');
  }
  EL.capture?.classList.replace('c2-small', 'c2-primary');

  /* —— 挑战判定用的标记。“↺ 重来”后只认重来之后的记录和回答 —— */
  const since = {beam: 0, density: 0, evidence: 0};
  const answered = new Set(), flags = {pulse: false, section: false};
  const stamp = r => Date.parse(r.createdAt) || 0;
  const recs = id => (lab()?.records || []).filter(r => r.experiment === id && r.source === 'simulation' && stamp(r) >= since[id]);
  const poleHits = () => (lab()?.getPoints() || []).filter(p => p.objectId === 'thin-pole').length;
  $('#sectionBtn')?.addEventListener('click', () => { flags.section = true; });
  $('#checkAnswer')?.addEventListener('click', () => {
    const id = lab()?.snapshot().state.experiment;
    if (id && EL.feedback?.classList.contains('correct')) answered.add(id);
  });
  const quizCard = id => ({
    id: 'answer', icon: '❓', title: '用证据回答', hint: '下方先选预测，再核对', check: () => answered.has(id),
    result: '答案不是猜出来的，是用你刚记录的扫描条件和坐标核对出来的。',
  });

  const STATIONS = [
    {
      id: 'beam', name: '一束光到一个点', hint: '拖动旋转 · 滚轮缩放 · 方向键换光束',
      lead: '拖方位角、仰角选一束光，慢放它的发射和回波，看它落成哪个 XYZ 点。',
      build(c) {
        c.adopt(EL.beam, c.section('选一束光'));
        c.adopt(EL.conversion, c.section('从距离到坐标'));
        c.challenges([
          {id: 'pulse', icon: '▶', title: '慢放一束光', hint: '按三维区右下角', check: () => flags.pulse,
            result: '光飞出去、碰到最近的物体、再飞回来：往返时间除以 2 才是单程距离。'},
          {id: 'pole', icon: '🎯', title: '打中细柱', hint: '方位角转到 346° 附近', check: s => s.ray?.hit && s.ray.objectId === 'thin-pole',
            result: '同样的距离读数，换个方向就是另一个点——方向和距离缺一不可。'},
          {id: 'miss', icon: '🕳', title: '找一束没回波的光', hint: '朝开放端打一束', check: s => s.ray && !s.ray.hit,
            result: '没有碰到物体就没有回波，点云里这里一个点也不会补。'},
          quizCard('beam'),
        ]);
        evidence(c);
      },
    },
    {
      id: 'density', name: '点云怎样变密', hint: '拖动旋转 · 滚轮缩放 · 视角改变不增加点',
      lead: '把方位角间隔在 10°、2°、1° 之间切换，数一数细柱被扫到几个点；再把雷达挪个位置看看。',
      build(c) {
        c.adopt(EL.density, c.section('改采样'));
        c.adopt([EL.progress, EL.secondary], c.section('本帧扫描'));
        c.challenges([
          {id: 'coarse', icon: '🕳', title: '让细柱漏掉', hint: '用 10° 稀疏扫描', check: s => s.state.step === 10 && s.state.progress >= 0.999 && s.pole === 0,
            result: '相邻两束光之间隔得太开，细柱正好从缝里漏过去了。'},
          {id: 'fine', icon: '🔍', title: '再把细柱扫出来', hint: '换 1° 细密扫描', check: s => s.state.step === 1 && s.state.progress >= 0.999 && s.pole > 0,
            result: '细柱一直都在，是更密的角采样给了光束碰到它的机会。'},
          {id: 'moveB', icon: '🚶', title: '换个位置再扫', hint: '挡箱后面空着？换到 B 位', check: s => s.state.position === 'B' && s.state.progress >= 0.999,
            result: '挡箱后面其实有墙：A 位的光被挡箱挡住了，挪个位置重新扫才看得见。没点不等于没东西。'},
          quizCard('density'),
        ]);
        evidence(c);
      },
    },
    {
      id: 'evidence', name: '在点云里找证据', hint: '拖动旋转 · 滚轮缩放 · 点击点云取点',
      lead: '在点云里点两个点量距离，换成公开样本再试，想想点距算不算通道净宽。',
      build(c) {
        const g = c.section('取点与量测');
        c.adopt(EL.tableBtn, g.firstChild);
        c.adopt(EL.evidence, g);
        c.adopt(EL.display, c.section('点怎么显示'));
        c.challenges([
          {id: 'pick', icon: '⌖', title: '取两个点量距离', hint: '点击点云选 P1、P2', check: s => Boolean(s.picks?.[0] && s.picks?.[1]),
            result: '两点距离只是一个几何量，它连的是哪两个边界，要你自己核对。'},
          {id: 'sample', icon: '🌐', title: '换成公开样本看看', hint: '选 PCL 公开样本', check: s => s.state.source === 'sample',
            result: '真实点云有缺口、疏密不均，单位和来源都要先核对。'},
          {id: 'section', icon: '📏', title: '看一看截面示例', hint: '按“何时才是净宽”', check: () => flags.section,
            result: '同一截面两侧的端点，距离才可能是净宽；错开前后就不算。'},
          quizCard('evidence'),
        ]);
        evidence(c);
      },
    },
  ];

  /* 每个工位都有的“记录证据”：原页面的记录按钮和最近一条记录 */
  function evidence(c) {
    const g = c.section('留下证据');
    c.adopt(EL.count, g.firstChild); // 标题行里的计数也要由外壳停放，换工位时不能被丢掉
    c.adopt([EL.capture, EL.recent], g);
    g.append(c.row(c.button('实验单与导出', () => EL.recordBtn?.click(), {small: true})));
    c.adopt(EL.quiz, c.section('先预测，再用证据回答'));
  }

  let lastToast = '';
  NativeShell.start({
    task: '4-2', title: '激光雷达与点云',
    stage: EL.stage,
    stations: STATIONS,
    current: () => lab()?.snapshot().state.experiment,
    select: id => { if (lab()?.snapshot().state.experiment !== id) lab()?.setState({experiment: id}); },
    reset(id) {
      since[id] = Date.now(); answered.delete(id);
      if (id === 'beam') flags.pulse = false;
      if (id === 'evidence') flags.section = false;
      EL.reset?.click();
    },
    poll() {
      const s = lab().snapshot();
      if (s.playing.pulse) flags.pulse = true;
      s.pole = s.state.experiment === 'density' ? poleHits() : -1;
      return s;
    },
    build(c) {
      // 原页面的提示（#toast）转成三维区上方的提示条
      lastToast = '';
      const watch = new MutationObserver(() => {
        const t = EL.toast.textContent.trim();
        if (!EL.toast.hidden && t && t !== lastToast) { lastToast = t; c.feedback(t, /请|不由|不伪造|先/.test(t) ? 'warn' : 'info'); }
        if (EL.toast.hidden) lastToast = '';
      });
      if (EL.toast) watch.observe(EL.toast, {attributes: true, childList: true, characterData: true, subtree: true});
      c.onCleanup(() => watch.disconnect());
    },
  });

  /* 原页面用 [data-experiment] 标记实验切换按钮（第四章检查脚本 check-chapter4.cjs 也按它点击）。
   * 原按钮已收进隐藏容器，把标记移到外壳的工位按钮上；原程序会顺手更新它们的 active / 进度条，补一个隐藏的进度条节点。 */
  all('.c2-station').forEach((b, i) => {
    const id = STATIONS[i].id, old = EL.cards[id];
    if (!old) return;
    old.removeAttribute('data-experiment');
    b.dataset.experiment = id;
    const bar = document.createElement('span'); bar.className = 'card-progress'; bar.hidden = true; bar.append(document.createElement('i'));
    b.append(bar);
  });
})();

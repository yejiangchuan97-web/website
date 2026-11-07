/* 任务 6-2 地砖铺贴 —— 原页面的三维场景、操作模型与控件保持不变，搬进统一外壳。
 * 原页面的三个关卡（吸牢再提起 / 看清再对缝 / 压稳再复核）就是三个工位；
 * 吸盘布局（选研究对象）放在三维区上方，原有的三项仪表放在三维区底部，其余控件进面板。
 * 状态全部来自 window.tilingLab.snapshot()，切换工位调原页面的 act('stage')。
 */
(() => {
  'use strict';
  const {$, all} = NativeShell;
  const lab = () => window.tilingLab;
  const snap = () => lab().snapshot();
  const act = (type, value) => lab().act(type, value);

  const EL = {
    stage: $('.workspace > .scene-area'),
    instruments: $('#instruments'),
    cups: $('.cup-options'),
    offset: $('[data-panel="grip"] .control-section'),
    gripMore: $('#gripMore'),
    gripActions: $('[data-panel="grip"] .action-row'),
    alignActions: $('#recognize')?.parentElement,
    alignPad: $('.alignment-pad'),
    occlusion: $('#occlude')?.parentElement,
    occlusionNote: $('#occlude')?.parentElement?.nextElementSibling,
    acceptAlign: $('#acceptAlign'), toPress: $('#toPress'),
    modes: $('[data-mode]')?.parentElement,
    target: $('[data-panel="press"] .control-section'),
    pressActions: $('#pressRun')?.parentElement,
    pressMore: $('#pressMore'),
    checkActions: $('#ruler')?.parentElement,
    finish: $('#finish'),
    slip: $('#slip'),
  };

  // 外壳里已有工位名、引子和挑战卡：原来的说明弹窗入口、证据行、底栏、页头都不再出现；
  // 比较实验直接展开（面板里不放折叠菜单）。
  for (const e of all('#cupInfo, .scene-hint, .mobile-action')) e.setAttribute('hidden', '');
  for (const d of [EL.gripMore, EL.pressMore]) if (d) d.open = true;
  // 原标签前的“① ②”是原面板的步骤序号，外壳里由分组标题代替
  for (const l of all('.controls label')) {
    const t = l.firstChild;
    if (t?.nodeType === 3 && /^[①②③]\s*/.test(t.textContent)) t.textContent = t.textContent.replace(/^[①②③]\s*/, '');
  }
  // 每个面板只留一个主按钮：试提 / 开始纠偏 / 缓慢下压
  for (const b of [EL.acceptAlign, EL.finish]) b?.classList.remove('primary');
  // 完成后的“实训记录”弹窗不再弹出，完成情况由挑战卡和工位 ✓ 表示
  const summary = $('#summaryDialog');
  if (summary) summary.showModal = () => {};

  /* 外壳自己记的经历（原模型只记当前状态） */
  const seen = {passedLayouts: new Set(), isolatedPass: false, slipped: false, overpressed: false, forceOK: false, highChecked: false};
  EL.slip?.addEventListener('click', () => { if (lab()?.snapshot().state.align.visibility !== 'clear') seen.slipped = true; });

  const STATIONS = [
    {
      id: 'grip', name: '吸牢，再提起',
      lead: '选吸盘布局、挪吸盘架，再低位试提。',
      build(c) {
        const g = c.section('吸盘架位置');
        c.adopt(EL.offset, g);
        const g2 = c.section('比较条件：间距、真空、密封');
        c.adopt(EL.gripMore, g2);
        const g3 = c.section('试提');
        c.adopt(EL.gripActions, g3);
        c.challenges([
          {id: 'peel', icon: '🫨', title: '看砖掀边', hint: '吸盘偏着就试提', check: s => s.state.grip.observedFailure,
            result: '吸力够也会翘边：吸盘偏在一侧，砖的重心落到了支承区外。'},
          {id: 'pass', icon: '✅', title: '试提通过', hint: '先把吸盘架对准中心', check: s => s.state.done.grip,
            result: '对中以后，同样的吸力就能把砖稳稳提起。'},
          {id: 'layouts', icon: '🔁', title: '两种布局都提起来', hint: '换一种布局再试提', check: () => seen.passedLayouts.size >= 2,
            result: '三种布局总面积相同，理论吸力一样；差别在支承和密封。'},
          {id: 'leak', icon: '💨', title: '漏一个盘也提起来', hint: '4 个盘、漏气、隔离支路', check: () => seen.isolatedPass,
            result: '隔离漏气支路，剩下的吸盘保住了真空——只是余量变小了。'},
        ]);
      },
    },
    {
      id: 'align', name: '看清，再对缝',
      lead: '认出砖边再纠偏；遮住镜头试试看。',
      build(c) {
        const g = c.section('识别与纠偏');
        c.adopt([EL.alignActions, EL.alignPad], g);
        const g2 = c.section('让相机看不见');
        c.adopt([EL.occlusion, EL.occlusionNote], g2);
        const g3 = c.section('检查砖缝');
        c.adopt([EL.acceptAlign, EL.toPress], g3);
        c.challenges([
          {id: 'blind', icon: '🙈', title: '遮住镜头', hint: '看画面里留下了什么', check: s => s.state.align.blockedSeen,
            result: '看不见就停止纠偏；相机小窗里留的是旧观测，不是现在的砖。'},
          {id: 'slip', icon: '🫳', title: '遮着时推一下砖', hint: '先遮挡，再滑移扰动', check: () => seen.slipped,
            result: '砖动了，相机没看到——旧读数不能拿来纠偏。'},
          {id: 'again', icon: '🔍', title: '恢复后重新识别', hint: '移开遮挡，再识别', check: s => s.state.align.reacquired,
            result: '视野恢复只是能看了，重新识别以后才知道砖现在在哪。'},
          {id: 'pass', icon: '✅', title: '通过砖缝检查', hint: '纠偏到位后检查', check: s => s.state.done.align,
            result: '两条砖缝和转角都进了窗口：看得见，纠偏才有依据。'},
        ]);
      },
    },
    {
      id: 'press', name: '压稳，再复核',
      lead: '比一比两种压法，再用靠尺查高差。',
      build(c) {
        const g = c.section('压入方式');
        c.adopt([EL.modes, EL.target, EL.pressActions], g);
        const g2 = c.section('换条件：铺贴层与基层');
        c.adopt(EL.pressMore, g2);
        const g3 = c.section('复核与卸盘');
        c.adopt([EL.checkActions, EL.finish], g3);
        c.challenges([
          {id: 'over', icon: '💥', title: '把砖压过头', hint: '固定压入量调深', check: () => seen.overpressed,
            result: '固定压入量不管力多大都往下压，遇到硬层就过压。'},
          {id: 'force', icon: '🎚', title: '边压边测力，压到位', hint: '换“边压边测力”再下压', check: () => seen.forceOK,
            result: '边压边感觉力：力到了就停，不会一直往下压。'},
          {id: 'high', icon: '📐', title: '力对了，砖却偏高', hint: '基层高出 2 mm，放靠尺', check: () => seen.highChecked,
            result: '力合适不等于砖面平——靠尺查的是高度，不是力。'},
          {id: 'done', icon: '✅', title: '铺好并卸下吸盘', hint: '力和高差都过关', check: s => s.state.done.press,
            result: '力和高差都过关才卸盘；粘结和空鼓还要在现场复核。'},
        ]);
      },
    },
  ];

  const FRESH = {
    grip: () => { seen.passedLayouts.clear(); seen.isolatedPass = false; },
    align: () => { seen.slipped = false; },
    press: () => { seen.overpressed = false; seen.forceOK = false; seen.highChecked = false; },
  };

  let lastMessage = '';
  NativeShell.start({
    task: '6-2', title: '地砖铺贴',
    stage: EL.stage,
    stageTop: [EL.cups],
    stations: STATIONS,
    hint: '拖动旋转 · 滚轮缩放',
    current: () => lab()?.snapshot().state.stage,
    select: id => { if (lab() && snap().state.stage !== id) act('stage', id); },
    reset: id => {
      act('reset');
      if (id !== 'grip') act('stage', id);
      FRESH[id]?.();
      lastMessage = snap().state.message;
    },
    poll() {
      const s = snap(), st = s.state, r = s.readings;
      if (st.grip.trial) {
        seen.passedLayouts.add(st.grip.layout);
        if (st.grip.failed && st.grip.isolated) seen.isolatedPass = true;
      }
      if (st.stage === 'press') {
        if (st.press.damaged) seen.overpressed = true;
        if (st.press.mode === 'force' && r.press.forceOK && r.press.stable && !r.press.damaged) seen.forceOK = true;
        if (st.press.checked && st.press.base > 0 && r.press.forceOK && !r.press.heightOK) seen.highChecked = true;
      }
      return s;
    },
    build(c) {
      if (EL.cups) EL.cups.hidden = c.station.id !== 'grip';
      c.stripAdopt(EL.instruments);
      lastMessage = lab()?.snapshot().state.message || '';
      c.lab.onState(s => {
        const {message, kind} = s.state;
        if (message && message !== lastMessage) { lastMessage = message; c.feedback(message, kind === 'warn' ? 'warn' : 'info'); }
      });
    },
  });
})();

/* 任务 6-3 腻子打磨 —— 原页面的三维工坊、墙面试片、集尘剖视和验收板保持不变，搬进统一外壳；四个关卡成为四个工位。
 * 三维区里原有的视角条、演示开关和各关的画面层（力读数、试片、集尘状态、验收板）留在原位，面板里是原有的操作控件。
 * 原页面没有本地存储，“试一试”按 sandingLab.state 实时判断。
 */
(() => {
  'use strict';
  const {$, all} = NativeShell;
  const lab = () => window.sandingLab;
  const P = id => $(`[data-panel="${id}"]`);
  const sections = id => [...(P(id)?.querySelectorAll(':scope > .control-section') || [])];
  const EL = {
    stage: $('.scene-area'),
    force: {cs: sections('force'), buttons: $('[data-panel="force"] .two-buttons'), record: $('#recordForce'), note: $('[data-panel="force"] .connection')},
    surface: {cs: sections('surface'), info: $('#abrasiveInfo'), buttons: $('[data-panel="surface"] .two-buttons'),
      light: $('#surfaceLight')?.closest('label'), accept: $('#acceptPatch'), note: $('[data-panel="surface"] > .micro')},
    dust: {cs: sections('dust'), seal: $('#seal')?.closest('label'), restart: $('#restartDust'), resume: $('#resumeSanding'), note: $('[data-panel="dust"] .connection')},
    care: {cs: sections('care'), submit: $('#submitCare'), note: $('[data-panel="care"] > .micro')},
    notice: $('#feedback'),
  };

  // 小节标题由外壳给出：原来带①②编号的标题行收起，滑轨标签只去掉编号
  for (const cs of [...EL.force.cs, ...EL.surface.cs, ...EL.dust.cs, ...EL.care.cs]) {
    const label = cs.querySelector(':scope > label');
    if (!label) continue;
    if (!label.htmlFor && !label.classList.contains('check-row')) label.classList.add('s63-heading');
    for (const n of label.childNodes) if (n.nodeType === 3) n.textContent = n.textContent.replace(/^\s*[①②③④⑤]\s*/, '');
  }

  // 原页头的“操作与依据”（教学边界与资料来源）放到三维区右上角，和演示开关并排
  const help = $('#help');
  if (help) { help.textContent = '依据与资料'; $('.scene-area .hero-state')?.append(help); }

  // 只在本页里出现过的事件（原状态会被后续操作覆盖）记下来
  const seen = {locked: false, coarse: false, damaged: false, isolated: false, trial: false, faults: new Set()};
  const statuses = s => (s.patches || []).map(p => lab().game.surfaceStatus(p).key);

  const STATIONS = [
    {
      id: 'force', name: '稳住接触力', lead: '墙面局部凸起时，磨盘是硬顶上去，还是沿墙面法向退让？对比两种控制方式的接触力。',
      build(c) {
        c.adopt(EL.force.cs[0], c.section('控制方式'));
        c.adopt(EL.force.cs[1], c.section('墙面与目标力'));
        const g = c.section('观察与记录');
        c.adopt([EL.force.buttons, EL.force.record], g);
        c.challenges([
          {id: 'fixed', icon: '🧱', title: '固定位置顶住凸起', hint: '固定位置下让墙面凸起', check: s => !!s.fixedSeen,
            result: '位置不变、墙面凸起，磨盘被压得更紧，接触力随之上升。'},
          {id: 'follow', icon: '↔', title: '开恒力，看它退让', hint: '同样的凸起，开启恒力', check: s => s.followSeen,
            result: '力偏大就后退、偏小就贴近，力回到目标附近。'},
          {id: 'lock', icon: '⛔', title: '把力顶到停机线', hint: '固定位置下把凸起调到最大', check: () => seen.locked,
            result: '超过示例停机线，进给立即锁定，必须复位才能继续。'},
          {id: 'record', icon: '📋', title: '记录一次对比', hint: '两种方式都看过后记录', check: s => s.done.force,
            result: '固定位置与反馈后的接触力已记下；接触稳定，还要再检查表面。'},
        ]);
        if (EL.force.note) c.adopt(EL.force.note, c.body);
      },
    },
    {
      id: 'surface', name: '磨出好表面', lead: '在墙上的小试片上试磨：换磨料、改压紧、在同一点停留，用侧光比较留下的痕迹。',
      build(c) {
        const g1 = c.section('磨料');
        c.adopt(EL.surface.cs[0], g1);
        if (EL.surface.info) c.adopt(EL.surface.info, g1.querySelector('h3'));
        c.adopt(EL.surface.cs[1], c.section('接触与运动'));
        const g = c.section('试磨与检查');
        c.adopt([EL.surface.buttons, EL.surface.light, EL.surface.accept, EL.surface.note], g);
        c.challenges([
          {id: 'coarse', icon: '🪨', title: '用 P80 磨一遍', hint: '看粗砂留下的深痕', check: () => seen.coarse,
            result: '粗磨粒去除快，但会留下明显砂痕，还得换细磨料消痕。'},
          {id: 'damage', icon: '⚠', title: '故意过磨一次', hint: '过度压紧或同点停留', check: () => seen.damaged,
            result: '过磨伤到了腻子层，再磨也补不回材料，只能重新批补。'},
          {id: 'ready', icon: '✨', title: '交出一块细匀样板', hint: '打开侧光后提交', check: s => s.done.surface,
            result: '起伏和明显砂痕都减小，也没有过磨。'},
        ]);
      },
    },
    {
      id: 'dust', name: '把粉尘收住', lead: '集尘变弱了：在剖视集尘器里找出故障，停机处理，试运行通过后再恢复打磨。',
      build(c) {
        c.adopt(EL.dust.cs[0], c.section('故障情境'));
        const g2 = c.section('停机处理');
        c.adopt([EL.dust.cs[1], EL.dust.seal], g2);
        const g3 = c.section('恢复作业');
        c.adopt([EL.dust.restart, EL.dust.resume], g3);
        c.challenges([
          {id: 'isolate', icon: '🔌', title: '先停机隔离', hint: '处理之前先断电', check: () => seen.isolated,
            result: '先停磨、断电，才能拆检软管、滤芯和尘袋。'},
          {id: 'trial', icon: '🌀', title: '吸尘试运行通过', hint: '处理故障后试运行', check: () => seen.trial,
            result: '通路恢复，吸力正常——确认之后才能再开磨盘。'},
          {id: 'all', icon: '🧯', title: '三种故障都排除', hint: '滤芯、软管、尘袋', check: () => seen.faults.size >= 3,
            result: '堵塞、脱落、装满——吸尘失效的原因不同，处理之前都要先停机。'},
        ]);
        if (EL.dust.note) c.adopt(EL.dust.note, c.body);
      },
    },
    {
      id: 'care', name: '验收与养护', lead: '在三维区下方用侧光和靠尺判读三个局部，再在这里按顺序完成收工养护。',
      build(c) {
        c.adopt(EL.care.cs[0], c.section('收工动作'));
        const g = c.section('交接');
        c.adopt([EL.care.submit, EL.care.note], g);
        c.challenges([
          {id: 'inspect', icon: '🔦', title: '判读三个局部', hint: '先开侧光、放靠尺', check: s => s.inspected.every(Boolean),
            result: '细匀面、明显旋纹、墙边漏磨——大面看着平，也要查边角。'},
          {id: 'care', icon: '🧰', title: '按顺序收工', hint: '停磨 → 收余尘 → 断电 → 检查记录', check: s => s.care.completed,
            result: '养护从正确停机开始：先收余尘，再断电检查清洁。'},
          {id: 'submit', icon: '✅', title: '提交验收与养护记录', hint: '质量和设备一起交接', check: s => s.done.care,
            result: '轨迹走完不等于合格，质量和设备都要交接清楚。'},
        ]);
      },
    },
  ];

  // 原页面状态的局部复位（原页面只有整页重新开始）
  const RESET = {
    force: () => { lab().state.done.force = false; $('#forceReset')?.click(); seen.locked = false; },
    surface() {
      const S = lab().state;
      if (S.sanding) lab().finishPass();
      S.done.surface = false; S.patches = S.patches.map(() => lab().game.createPatch()); S.selected = 0;
      seen.coarse = seen.damaged = false; lab().render();
    },
    dust() { lab().state.done.dust = false; seen.isolated = seen.trial = false; seen.faults.clear(); $(`[data-fault="${lab().state.fault}"]`)?.click(); },
    care() {
      const S = lab().state;
      Object.assign(S, {care: lab().game.initialMaintenance(), careLog: [], inspected: [false, false, false], raking: false, ruler: false});
      S.done.care = false; lab().render();
    },
  };

  let lastNotice = '';
  NativeShell.start({
    task: '6-3', title: '腻子打磨',
    stage: EL.stage,
    stations: STATIONS,
    current: () => lab()?.state.tab,
    select: id => lab()?.setTab(id),
    reset: id => RESET[id]?.(),
    poll() {
      const s = lab().state;
      if (s.locked) seen.locked = true;
      const keys = statuses(s);
      if (keys.includes('damaged')) seen.damaged = true;
      if (s.patches.some(p => p.passes > 0 && p.scratch >= .75)) seen.coarse = true;
      if (s.isolated) seen.isolated = true;
      if (s.trial) seen.trial = true;
      if (s.dustRunning) seen.faults.add(s.fault);
      return s;
    },
    build(c) {
      // 原工坊只在尺寸变化或交互时重绘；换工位、三维区重新排版后补一次重绘，避免画面停在空白帧
      for (const t of [80, 400, 1000]) setTimeout(() => lab()?.scene?.resize(), t);
      lastNotice = EL.notice?.textContent.trim() || '';
      c.lab.onState(() => {
        const t = EL.notice?.textContent.trim() || '';
        if (t && t !== lastNotice) {
          lastNotice = t;
          const kind = EL.notice.dataset.kind;
          c.feedback(t, kind === 'warn' ? 'warn' : kind === 'success' ? 'ok' : 'info');
        }
      });
    },
  });
})();

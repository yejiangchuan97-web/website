/* 任务 6-4 室内喷涂 —— 原页面的三维现场、喷涂模型和作业流程保持不变，搬进统一外壳。
 * 原页面的五个阶段（规划 → 试喷 → 喷涂 → 巡检 → 交付）合成三个工位：
 *   ① 规划试喷（plan、trial） ② 正式喷涂（spray） ③ 巡检交付（inspect、deliver）。
 * 阶段仍由原页面推进（#actionPrimary、#steps），这里只是换了按钮和排版；读数与判定都来自 sprayLab.snapshot()。
 */
(() => {
  'use strict';
  const {$, all} = NativeShell;
  const lab = () => window.sprayLab;
  const M = window.M;
  const EL = {
    stage: $('.scene-shell'),
    toast: $('#toast'),
    action: $('#actionPrimary'),
    play: $('#play'),
    reset: $('#reset'),
    params: [$('#spacing')?.closest('.parameter'), $('#distance')?.closest('.parameter'), $('#planNote')],
    flow: [$('#speed')?.closest('.parameter'), $('.guard-field'), $('.switches')],
    color: $('.color-field'),
    trial: [$('#trialResult'), $('#retryTrial')],
    readouts: $('.readouts'),
    playback: $('.playback'),
    issues: [$('#issueList'), $('.repair-actions')],
    delivery: [$('#deliverySummary'), $('#export')],
    steps: id => $(`#steps [data-stage="${id}"]`),
  };
  // 外壳已有工位名和挑战卡：原来的任务卡、阶段徽标、底部流程条收起；原提示条改由外壳显示
  for (const e of [$('.mission-card'), $('.stage-badge'), EL.toast]) e?.setAttribute('hidden', '');

  const STAGE_TO_STATION = {plan: 'plan', trial: 'plan', spray: 'spray', inspect: 'inspect', deliver: 'inspect'};
  const snap = () => lab()?.snapshot();
  const passCheck = s => !!s?.trialDone;
  const gapOf = p => M.overlap(p).gap;
  const edgeDose = p => [M.depositionAt(0, p).dose, M.depositionAt(0.5, p).dose];

  // 试喷完成那一刻的参数（参数一改，原页面就把 trialDone 清掉，这里留下“做过”的记录）
  const flags = {gapTrial: false, overlapTrial: false, evenTrial: false, nozzleView: false, repaired: false, exported: false};
  let wasTrialDone = false;
  EL.delivery[1]?.addEventListener('click', () => { if (snap()?.stage === 'deliver') flags.exported = true; });

  /** 工位锁：前面的阶段没做完时，面板里只放一张“先去哪一站”的卡片。 */
  function lockable(c, text, goto) {
    const lock = c.h('div', 'c64-lock');
    const go = c.button(goto.label, () => window.c2Lab.select(goto.index), {small: true});
    lock.append(c.h('span', 'c64-lock-icon', '🔒'), c.h('p', '', text), go);
    const content = c.h('div', 'c64-content');
    c.body.append(lock, content);
    return {
      content,
      set(locked) { lock.hidden = !locked; content.hidden = locked; },
    };
  }

  function readoutGroup(c, into) {
    const g = c.section('墙面读数', null, into);
    c.adopt(EL.readouts, g);
  }

  const STATIONS = [
    {
      id: 'plan', name: '规划试喷', lead: '调喷距和道间距，先试喷左边两道，看喷幅之间有没有留下漏带。',
      build(c) {
        const g1 = c.section('喷幅与道间距');
        c.adopt(EL.params, g1);
        const g2 = c.section('速度与窗洞');
        c.adopt(EL.flow, g2);
        const g3 = c.section('试喷');
        c.adopt(EL.color, g3);
        c.adopt(EL.trial[0], g3);
        const primary = c.button('开始试喷', () => EL.action.click(), {primary: true});
        const row = c.row(primary);
        g3.append(row);
        c.adopt(EL.trial[1], row);
        const locked = c.h('p', 'c3-note', '已经开始正式喷涂，参数锁定了。想换一套方案，点右上角“↺ 重来”。');
        g3.append(locked);
        c.lab.onState(s => {
          const started = ['spray', 'inspect', 'deliver'].includes(s.stage);
          const busy = s.playing && s.active === 'trial';
          primary.textContent = started ? '已开喷' : busy ? '试喷中…' : s.trialDone ? '正式喷涂' : '开始试喷';
          primary.disabled = started || busy;
          EL.trial[1].hidden = started || !s.trialDone;
          locked.hidden = !started;
        });
        c.challenges([
          {id: 'gap', icon: '🧩', title: '试喷出一条漏带', hint: '道间距比喷幅宽', check: () => flags.gapTrial,
            result: '道间距比喷幅还宽，两道之间就空出一条没涂到的带子。'},
          {id: 'overlap', icon: '🎯', title: '让两道喷幅搭上', hint: '调小间距或拉远喷嘴', check: () => flags.overlapTrial,
            result: '喷嘴离墙越远喷幅越宽；间距小于喷幅，相邻两道才会搭接。'},
          {id: 'even', icon: '⚖️', title: '两端不堆厚', hint: '打开流量随速度调整', check: () => flags.evenTrial,
            result: '起收段减速时流量也跟着减小，两端和中段的涂层就一样厚。'},
        ]);
      },
    },
    {
      id: 'spray', name: '正式喷涂', lead: '机器人按试喷后的方案喷满整面墙。可以暂停、换视角，近看喷枪在窗边停喷。',
      build(c) {
        const gate = lockable(c, '先在①试喷一次，再来正式喷涂。', {label: '去①试喷', index: 0});
        const g1 = c.section('作业', null, gate.content);
        c.adopt(EL.playback, g1);
        const primary = c.button('开始喷涂', () => EL.action.click(), {primary: true});
        g1.append(c.row(primary));
        readoutGroup(c, gate.content);
        c.lab.onState(s => {
          gate.set(!s.trialDone && !['spray', 'inspect', 'deliver'].includes(s.stage));
          const done = s.stage === 'spray' && s.progress >= 1;
          primary.hidden = s.stage === 'spray' && !done;
          primary.textContent = s.stage === 'spray' ? '去巡检' : ['inspect', 'deliver'].includes(s.stage) ? '已喷完' : '开始喷涂';
          primary.disabled = s.playing || ['inspect', 'deliver'].includes(s.stage);
        });
        c.challenges([
          {id: 'full', icon: '🎬', title: '喷满整面墙', hint: '开始喷涂，等它走完', check: s => ['spray', 'inspect', 'deliver'].includes(s.stage) && (s.stage !== 'spray' || s.progress >= 1),
            result: '涂层只记实际喷过的地方，覆盖率是一道一道累积出来的。'},
          {id: 'nozzle', icon: '🔍', title: '近看喷头', hint: '喷涂时点上方“喷头”', check: () => flags.nozzleView,
            result: '喷嘴始终正对墙面、离墙一样远，喷幅宽度才不会变。'},
          {id: 'window', icon: '🪟', title: '窗面一点不沾', hint: '①里选“完整喷幅避让”', check: s => s.stage !== 'plan' && s.stage !== 'trial' && s.summary?.complete && s.summary.pollution === 0,
            result: '只看喷嘴中心不够：喷幅边缘扫过窗框也会沾上，要整幅避让。'},
        ]);
      },
    },
    {
      id: 'inspect', name: '巡检交付', lead: '打开质检视图，点墙面找出漏喷和污染，返修达标后交付。',
      build(c) {
        const gate = lockable(c, '整面墙喷完后，才能巡检。', {label: '去②喷涂', index: 1});
        const g1 = c.section('待处理', null, gate.content);
        c.adopt(EL.issues, g1);
        readoutGroup(c, gate.content);
        const g2 = c.section('交付', null, gate.content);
        c.adopt(EL.delivery, g2);
        const primary = c.button('开始巡检', () => EL.action.click(), {primary: true});
        g2.querySelector('h3').after(c.row(primary));
        c.lab.onState(s => {
          const open = ['inspect', 'deliver'].includes(s.stage) || (s.stage === 'spray' && s.progress >= 1);
          gate.set(!open);
          g1.hidden = s.stage !== 'inspect';
          EL.delivery.forEach(e => { if (e) e.hidden = s.stage !== 'deliver'; });
          primary.textContent = s.stage === 'spray' ? '开始巡检' : s.stage === 'deliver' ? '新开一面' : '交付项目';
          primary.disabled = s.playing || (s.stage === 'inspect' && !s.summary?.ready);
        });
        c.challenges([
          {id: 'pick', icon: '👆', title: '点墙面查一处', hint: '打开质检视图再点', check: s => !!s.selection,
            result: '质检视图里的颜色分别代表漏喷、涂层偏薄、偏厚和窗面受喷。'},
          {id: 'repair', icon: '🛠', title: '返修一处', hint: '点选后按“返修此处”', check: () => flags.repaired,
            result: '漏喷的补喷，窗面沾漆的擦净，厚薄不对的清掉重喷。'},
          {id: 'ready', icon: '✅', title: '达到交付目标', hint: '覆盖 ≥99.5%，窗面无污染', check: s => s.summary?.ready,
            result: '喷满、窗面干净、涂层厚薄合适，这面墙才能交付。'},
          {id: 'export', icon: '📄', title: '导出作业记录', hint: '交付后点“导出记录”', check: () => flags.exported,
            result: '参数、过程和每次返修都留在记录里，可以复查。'},
        ]);
      },
    },
  ];

  let lastStation = STAGE_TO_STATION[snap()?.stage] || 'plan';
  new MutationObserver(() => {
    const t = EL.toast.textContent.trim();
    if (!t || !window.c2Lab?.ctx) return;
    window.c2Lab.ctx.feedback(t, /污染|不支持|暂停/.test(t) ? 'warn' : 'info');
  }).observe(EL.toast, {childList: true, characterData: true, subtree: true});

  NativeShell.start({
    task: '6-4', title: '室内喷涂',
    stage: EL.stage,
    stations: STATIONS,
    hint: '拖动旋转 · 滚轮缩放',
    // 只在原页面自己换了阶段（如试喷后开始喷涂）时带着工位走；学生点到还没解锁的工位时不被拉回
    current() {
      const st = STAGE_TO_STATION[snap()?.stage];
      if (st && st !== lastStation) { lastStation = st; return st; }
      return null;
    },
    select(id) {
      const s = snap(); if (!s || STAGE_TO_STATION[s.stage] === id) return;
      const target = id === 'inspect' && !EL.steps('deliver')?.disabled && s.stage === 'deliver' ? 'deliver' : id;
      const b = EL.steps(target);
      if (b && !b.disabled) { b.click(); lastStation = STAGE_TO_STATION[target]; }
    },
    // 原页面只有“整面墙重新开工”：重来即回到①重新规划
    reset(id) { EL.reset.click(); lastStation = 'plan'; if (id !== 'plan') setTimeout(() => window.c2Lab.select(0), 0); },
    poll() {
      const s = snap();
      if (s.trialDone && !wasTrialDone) {
        const gap = gapOf(s.params), [d0, d1] = edgeDose(s.params);
        if (gap > 0) flags.gapTrial = true; else flags.overlapTrial = true;
        if (d0 >= 0.85 && d0 <= 1.2 && d1 >= 0.85 && d1 <= 1.2 && s.params.compensate) flags.evenTrial = true;
      }
      wasTrialDone = s.trialDone;
      if (s.active === 'spray' && s.playing && s.stats?.view === 'nozzle') flags.nozzleView = true;
      if (s.active === 'repair') flags.repaired = true;
      return s;
    },
  });
})();

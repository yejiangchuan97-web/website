/* 任务 5-2 钢筋绑扎机器人 —— 原页面的三维绑扎工位与控件保持不变，搬进统一外壳。
 * 原页面的三个环节（对点绑扎 / 人工复核 / 看懂这一扣）就是三个工位；状态读 window.__TYING_HERO__。
 * 原页面没有自带关卡存储，“试一试”的完成记录由外壳保存。
 */
(() => {
  'use strict';
  const {$, all} = NativeShell;
  const hero = () => window.__TYING_HERO__;
  const HG = () => hero().model;
  const EL = {
    stage: $('#scene-shell'),
    reset: $('#reset'),
    feedback: $('#feedback'),
    metrics: $('.control-deck .metrics'), metric: all('.control-deck .metric'),
    cycle: $('.control-deck .cycle-monitor'),
    tie: {points: $('#point-list'), align: $('#tie-panel .align-card'), actions: $('#tie-panel .action-group')},
    review: {safe: $('#review-panel .safe-card'), safeBtn: $('#review-safe'), points: $('#review-point-list'),
      closeup: $('#review-closeup'), actions: $('#review-panel .action-group'), complete: $('#complete')},
    study: {focus: $('#study-panel .study-focus'), player: $('#study-panel .study-player'), fault: $('#study-panel .fault-lab')},
  };
  // 外壳已有工位名、挑战卡和提示：原页面的任务卡、操作提示、导语和“回到工位”链接收起
  for (const e of all('#mission-card, .scene-top .stagebar, .orbit-hint, #tie-panel .operation-note, #study-back, #complete-study, .align-card .section-heading > span, .study-focus > p, .fault-lab > p:not(.fault-feedback)'))
    e.setAttribute('hidden', '');
  // 计量卡按工位分开：0 已绑交点，1 复核完成，2 待处理
  const metricBox = list => {
    const box = document.createElement('div');
    box.className = 'metrics c52-metrics';
    box.append(...list.map(i => EL.metric[i]).filter(Boolean));
    return box;
  };
  // 原页面“操作说明”里的模型范围，缩成一句放在每个工位面板末尾
  const SCOPE = '教学模拟：画面比例、动作速度与交点布置为教学设定，不代表某一实际机型；实际操作与停机维护按所用设备的说明书执行。';
  const metricsTie = metricBox([0]), metricsReview = metricBox([1, 2]);

  // 原页面状态里没有的操作记录
  // “只用微调键对准”：一次微调让枪口从偏离交点变成对准交点才算
  let jogAligned = false, pausedMid = false;
  const aligned = () => { const h = hero(); return h && h.state.game.stage === 'tying' && !!h.model.alignedPoint(h.state.game); };
  const watchJog = () => { const before = aligned(); setTimeout(() => { if (!before && aligned()) jogAligned = true; }, 0); };
  document.addEventListener('click', e => { if (e.target.closest?.('[data-jog]')) watchJog(); }, true);
  document.addEventListener('keydown', e => { if (/^Arrow/.test(e.key) && !/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) watchJog(); }, true);
  // “完成绑扎，进入复核”之后工位条跟着换到“人工复核”
  $('#go-review')?.addEventListener('click', () => setTimeout(() => {
    if (hero()?.state.mode === 'review') window.c2Lab?.select(1);
  }, 0));
  // 完成卡里的“再操作一次”：原页面已重置，工位回到第一站
  $('#complete-reset')?.addEventListener('click', () => setTimeout(() => {
    jogAligned = pausedMid = false; everMarked.clear(); window.c2Lab?.select(0);
  }, 0));
  const everMarked = new Set();

  let station = 'game';
  const STATIONS = [
    {
      id: 'game', name: '对点绑扎', lead: '点选交点让机械臂就位，枪口稳定后启动绑扎；四个点都绑好，再进复核样区。',
      build(c) {
        if (hero()?.state.game.stage !== 'tying') {
          const g = c.section('四个点已绑完');
          const p = c.h('p', 'c3-note', '复核样区已打开。想从头再绑一次，按右上角“↺ 重来”。');
          const b = c.h('button', 'button primary', '去人工复核'); b.type = 'button';
          b.addEventListener('click', () => window.c2Lab?.select(1));
          g.append(p, b);
          return;
        }
        const g = c.section('选交点');
        c.adopt(EL.tie.points, g);
        const g2 = c.section('微调枪口，启动绑扎');
        c.adopt([EL.tie.align, EL.tie.actions], g2);
        const g3 = c.section('当前动作');
        c.adopt([metricsTie, EL.cycle], g3);
        g3.classList.add('c52-deck');
        c.challenges([
          {id: 'first', icon: '🎯', title: '亲手绑好一个点', hint: '选点 → 等稳定 → 启动', check: s => s.tied >= 1,
            result: '枪口就位、稳住不动，绑丝才能同时绕住两根钢筋。'},
          {id: 'jog', icon: '✥', title: '只用微调键对准', hint: '先偏开，再用 ↑↓←→ 推回交点', check: () => jogAligned,
            result: '枪口离交点稍远一点，“启动”就不让按——对不准就不绑。'},
          {id: 'pause', icon: '⏸', title: '绑到一半暂停看看', hint: '动作中按“暂停动作”', check: () => pausedMid,
            result: '暂停时画面定格在当前动作：此时枪口仍压在交点上。'},
          {id: 'four', icon: '▦', title: '四个点全部绑好', hint: '可以逐个，也可以连续', check: s => s.tied === 4 || s.stage !== 'tying',
            result: '四点完成。下一步不是收工，而是逐点复核。'},
        ]);
      },
    },
    {
      id: 'review', name: '人工复核', lead: '换到另一组预置样例：工具归位、模拟停机隔离后，逐点近看、轻拉，发现问题就标记、补绑、再复核。',
      build(c) {
        const locked = hero()?.state.game.stage === 'tying';
        if (locked) {
          const g = c.section('还不能复核');
          const p = c.h('p', 'c3-note', '复核在四个点都绑好之后进行。先回到“对点绑扎”完成四点。');
          const b = c.h('button', 'button primary', '回到对点绑扎'); b.type = 'button';
          b.addEventListener('click', () => window.c2Lab?.select(0));
          g.append(p, b);
          return;
        }
        const g = c.section('先停机，再靠近');
        c.adopt([EL.review.safe, EL.review.safeBtn], g);
        const g2 = c.section('逐点检查');
        c.adopt([EL.review.points, EL.review.closeup, EL.review.actions, EL.review.complete], g2);
        const g3 = c.section('复核进度');
        c.adopt(metricsReview, g3);
        c.challenges([
          {id: 'missing', icon: '🔍', title: '找出漏绑的点', hint: '近看哪个交点没有绑丝', check: () => everMarked.has('B'),
            result: '没有绑丝包住交点——看一眼就能发现，标记后补绑。'},
          {id: 'loose', icon: '🤏', title: '轻拉找出松扣', hint: '看着绑好了，拉一下才知道', check: () => everMarked.has('C'),
            result: '外观像绑好了，轻拉才露出位移：复核不能只靠看。'},
          {id: 'done', icon: '✅', title: '补绑后全部复核通过', hint: '补绑完要重新隔离、重新轻拉', check: s => s.stage === 'done',
            result: '补绑不等于合格：重新隔离、重新轻拉，四点都过了才交接。'},
        ]);
      },
    },
    {
      id: 'study', name: '看懂这一扣', lead: '镜头靠近绑扎头、打开外壳：拖动进度看送丝轮推着绑丝绕过交点，再试试送丝受阻。',
      build(c) {
        const g = c.section('慢看一次绑扎');
        c.adopt([EL.study.focus, EL.study.player], g);
        const g2 = c.section('送丝受阻');
        c.adopt(EL.study.fault, g2);
        c.challenges([
          {id: 'full', icon: '🎞', title: '完整看一次正常绑扎', hint: '正常工况，进度走到底', check: s => !s.study.fault && s.study.p >= 0.99,
            result: '定位 → 就位 → 送丝 → 扭结 → 离开，绑丝先成环再收紧。'},
          {id: 'jam', icon: '⚠', title: '让送丝卡住', hint: '切到“送丝受阻”再播放', check: s => s.study.fault && s.study.p >= 0.51,
            result: '送丝轮还在转，绑丝却停在导向槽里，没有绕全。'},
          {id: 'handle', icon: '🛡', title: '按顺序处置卡丝', hint: '保留异常 → 停机隔离 → 查供丝路径', check: s => s.study.inspected,
            result: '先停、再隔离、后检查；实际清障按设备说明书执行。'},
        ]);
      },
    },
  ];

  const stateOf = () => {
    const h = hero(), s = h.state, g = s.game, m = h.model;
    if (g.busy && s.paused) pausedMid = true;
    for (const p of g.points) if (p.marked) everMarked.add(p.id);
    return {mode: s.mode, stage: g.stage, tied: m.tiedCount(g), checked: m.checkedCount(g), study: s.study, game: g, paused: s.paused};
  };

  let lastMessage = '';
  const start = () => NativeShell.start({
    task: '5-2', title: '钢筋绑扎机器人',
    stage: EL.stage,
    stations: STATIONS,
    hint: '拖动旋转 · 滚轮缩放',
    current() {
      const s = hero()?.state; if (!s) return null;
      // 复核未解锁时留在“人工复核”说明页；四点绑完后“对点绑扎”保持在原工位，不被页面拉走
      if (station === 'review' && s.mode === 'game' && s.game.stage === 'tying') return 'review';
      if (station === 'game' && s.mode === 'review' && s.game.stage !== 'tying') return 'game';
      return s.mode;
    },
    select(id) { station = id; hero()?.setMode(id); },
    poll: stateOf,
    reset() { EL.reset?.click(); jogAligned = pausedMid = false; everMarked.clear(); },
    build(c) {
      station = c.station.id;
      // 工位内容建好之后再追加范围说明（cfg.build 先于工位自己的 build 执行）
      queueMicrotask(() => { if (c.body.isConnected) c.body.append(c.h('p', 'c52-scope', SCOPE)); });
      lastMessage = hero()?.state.game.message || '';
      c.lab.onState(s => {
        if (s.mode === 'study') return;
        const t = s.game.message || '';
        if (t && t !== lastMessage) {
          lastMessage = t;
          c.feedback(t, /还|偏离|先|无需|不能|没有|松动|位移|标记/.test(t) && !/完成|通过/.test(t) ? 'warn' : 'info');
        }
      });
    },
  });

  // 原页面的程序在本脚本之前已运行；等三维接口可用后再启动外壳
  const wait = () => (hero() ? start() : setTimeout(wait, 50));
  wait();
})();

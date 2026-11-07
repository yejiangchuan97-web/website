/* 任务 5-1 钢筋加工与作业面识读 —— 原页面的三维工地、机械动画与检查台保持不变，搬进统一外壳。
 * 原页面的三个环节（加工接力 / 楼面巡查 / 分区交接）就是三个工位，仍按原页面的顺序解锁。
 * 原页面每一环节要完成的事情直接做成“试一试”卡片（完成时的提示沿用原页面自己的反馈文字）；原页面没有本地存储，完成情况读自 __REBAR_GAME__.snapshot()。
 */
(() => {
  'use strict';
  const {$} = NativeShell;
  const game = () => window.__REBAR_GAME__;
  const EL = {
    field: $('#field'),
    order: $('#orderCard'), note: $('#siteNote'), setting: $('#machineSetting'),
    carry: $('#carryCard'), tools: $('#taskTools'), action: $('#actionBtn'), next: $('#nextBtn'),
    inspect: $('#inspectBtn'), inspectCount: $('#inspectionCount'),
    feedback: $('#feedback'), stageBtn: n => $(`.chapters [data-stage="${n}"]`),
    restart: $('#confirmRestart'),
  };
  const IDS = ['process', 'site', 'zone'];
  // 外壳里已有工位条与“去下一站”：原页面的手势说明、环节跳转按钮收起
  for (const e of [$('.gesture'), EL.next]) e?.classList.add('c5-off');

  /* 主操作按钮所在的一行，三个工位共用同一个原按钮 */
  const actionRow = document.createElement('div'); actionRow.className = 'c5-act';

  // 搬进面板但保持原页面给的显隐（如加工设置只在需要时出现，由原页面 render() 控制）
  const keep = (c, nodes, into) => nodes.forEach(n => { const was = n.hidden; c.adopt(n, into); n.hidden = was; });

  let pending = null; // 切换被原页面拒绝（未解锁/正在加工）时，回到原工位后再提示
  const snap = () => game()?.snapshot();
  const unlocked = (n, st) => n === 0 || (n === 1 && st.state.stock === 3) || (n === 2 && st.stageReady);

  const STATIONS = [
    {
      id: 'process', name: '加工接力', lead: '按订单把一根弯曲钢筋送过调直机、切断机和弯曲机：拖材料上机，或点机械标签上料。',
      build(c) {
        const g = c.section('今天的加工订单');
        c.adopt(EL.order, g);
        const g2 = c.section('上料与加工');
        c.adopt([EL.carry, EL.tools], g2); keep(c, [EL.setting], g2);
        actionRow.replaceChildren(); g2.append(actionRow); c.adopt(EL.action, actionRow);
        c.challenges([
          {id: 'straight', icon: '〰', title: '把钢筋调直', hint: '送入调直机', check: s => s.state.stock >= 1},
          {id: 'cut', icon: '✂', title: '切出 2400 mm', hint: '先把挡块移到 2400 mm', check: s => s.state.stock >= 2},
          {id: 'bend', icon: '↱', title: '弯出 90° 直角', hint: '转角调到 90° 再启动', check: s => s.state.stock >= 3},
        ]);
      },
    },
    {
      id: 'site', name: '楼面巡查', lead: '点楼面上的标记找齐六处位置；搬走堆料和挡路料箱，给洞口放护栏，再用检查台看钢筋样板。',
      build(c) {
        const g = c.section('现场发现');
        c.adopt(EL.note, g);
        const g2 = c.section('六处位置');
        c.adopt(EL.tools, g2);
        const g3 = c.section('现场工具');
        c.adopt(EL.carry, g3);
        actionRow.replaceChildren(); g3.append(actionRow); c.adopt(EL.action, actionRow);
        c.challenges([
          {id: 'read', icon: '👁', title: '认清边线、柱边和交点', hint: '点这三处标记', check: s => ['slab', 'column', 'joint'].every(k => s.state.visited.includes(k))},
          {id: 'clear', icon: '📦', title: '腾出作业面和通道', hint: '堆料、料箱搬到场外料架', check: s => s.state.game.materialMoved && s.state.game.routeCleared},
          {id: 'guard', icon: '🚧', title: '给洞口围上护栏', hint: '拿起护栏，点洞口', check: s => s.state.game.openingGuarded},
          {id: 'inspect', icon: '🔍', title: '完成四项样板检查', hint: '漏绑、间距、垫块、松扣', check: s => s.state.inspected.length >= 4},
        ]);
      },
    },
    {
      id: 'zone', name: '分区交接', lead: '拿起一枚彩色区标，点楼面上的区域放下去：分清机器人候选区、人工处理区和禁止进入区。',
      build(c) {
        const g = c.section('现场说明');
        c.adopt(EL.note, g);
        const g2 = c.section('区标');
        c.adopt(EL.tools, g2);
        actionRow.replaceChildren(); g2.append(actionRow); c.adopt(EL.action, actionRow);
        c.challenges([
          {id: 'regular', icon: '🟩', title: '规则大面', hint: '交点规则、空间开阔', check: s => s.state.game.zones.regular === 'auto'},
          {id: 'column', icon: '🟧', title: '柱边节点', hint: '钢筋密集、工具难进', check: s => s.state.game.zones.column === 'manual'},
          {id: 'opening', icon: '🟥', title: '洞口周边', hint: '真实缺口', check: s => s.state.game.zones.opening === 'blocked'},
          {id: 'handoff', icon: '📋', title: '提交交接图', hint: '三处都放好后提交', check: s => s.state.finished},
        ]);
      },
    },
  ];

  const tone = cls => (cls === 'success' ? 'ok' : cls === 'notice' ? 'warn' : 'info');
  let lastNotice = '';
  NativeShell.start({
    task: '5-1', title: '钢筋加工与作业面识读',
    stage: EL.field,
    stations: STATIONS,
    hint: '拖动转动场景 · 滚轮缩放',
    current: () => IDS[snap()?.state.stage ?? 0],
    select(id) {
      const n = IDS.indexOf(id), st = snap();
      if (!st || st.state.stage === n || pending?.reset) return; // 刚重新开始：外壳回到原工位时不再提示“未解锁”
      if (st.busy) { pending = ['先完成或继续当前加工，再换工位。', 'warn']; return; }
      if (!unlocked(n, st)) {
        pending = [n === 1 ? '先完成加工接力的三台机械，楼面巡查才会解锁。' : '先完成楼面巡查和四项样板检查，再来分区交接。', 'warn'];
        return;
      }
      EL.stageBtn(n)?.click();
    },
    reset() { EL.restart?.click(); pending = Object.assign(['已全部重新开始：从加工接力做起。', 'info'], {reset: true}); },
    poll() {
      const st = snap();
      // 还没解锁的工位在工位条上标一把锁
      document.querySelectorAll('.c2-station').forEach((b, i) => b.classList.toggle('c5-locked', !unlocked(i, st)));
      return st;
    },
    build(c) {
      const id = c.station.id;
      EL.inspect.hidden = id !== 'site'; EL.inspectCount.hidden = id !== 'site';
      const redo = document.querySelector('.c2-redo');
      if (redo) { redo.textContent = '↺ 重新开始'; redo.title = '清空加工、巡查与分区进度，从加工接力重新做起'; }
      lastNotice = EL.feedback?.textContent.trim() || '';
      if (pending && IDS[snap()?.state.stage ?? 0] === id) { const [t, k] = pending; pending = null; setTimeout(() => c.feedback(t, k), 0); }
      c.lab.onState(() => {
        const t = EL.feedback?.textContent.trim() || '';
        if (t && t !== lastNotice) { lastNotice = t; c.feedback(t, tone(EL.feedback.className)); }
      });
    },
  });
})();

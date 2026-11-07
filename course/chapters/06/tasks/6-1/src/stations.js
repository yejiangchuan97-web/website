/* 任务 6-1 砌筑机器人 —— 原页面的三维工作台、砌筑闯关、人工难点实验和机器人取放演示保持不变，搬进统一外壳。
 * 三个工位：人工砌墙（原“先亲手砌一砌”和“发现人工难点”合并为五步）/ 拌砂浆（砂浆搅拌机）/ 机器人取放。
 * 三维区上方放“选研究对象”：人工砌墙的五步、机器人的原站位/换站位；面板里是原有的改变条件的控件和试一试。
 */
(() => {
  'use strict';
  const {$, all} = NativeShell;
  const lab = () => window.masonryLab;
  const game = () => lab()?.game;
  const issueBlocks = all('#issueControls > .control-block');
  const robotBlocks = all('#robotControls > .control-block');
  const mortarBlocks = all('#mortarControls > .control-block');
  const EL = {
    stage: $('.stage-wrap'),
    metrics: $('.metrics'), live: $('#liveReadout'),
    manual: $('#manualControls'),
    mortarFeed: mortarBlocks[0], mortarMix: mortarBlocks[1], mortarOut: mortarBlocks[2],
    issuePicker: $('#issueChoices'), issueSlider: issueBlocks[1], observation: $('#issueControls .observation'), connection: $('#issueControls .connection'),
    platformPicker: $('#robotControls .segmented'), platformNote: $('#platformNote'),
    timeline: robotBlocks[1], datum: robotBlocks[2],
    explodeLabel: $('label[for="explode"]'), explode: $('#explode'),
    reset: $('#reset'),
  };
  // 外壳里已有工位名、引子和小标题：原来的阶段标题、“去下一站”链接、重复的小标签收起
  for (const e of all('#issuesToRobot, #issueControls .section-label, #robotControls .section-label, #mortarControls .section-label')) e.setAttribute('hidden', '');

  /* 三维区上方：人工砌墙的五步。前两步动手砌（原闯关第 1、2 关），后三步是人工难点：
   * 通缝 = 原闯关第 3 关（上下皮错缝），灰缝不匀、基准偏移 = 原“人工难点”实验。 */
  const STEPS = [
    {name: '摆砖', lesson: 0, goal: '把砖摆成顺砖、丁砖、侧砖'},
    {name: '拼墙厚', lesson: 1, goal: '用砖拼满一皮墙厚'},
    {name: '通缝', lesson: 2, hard: true, goal: '让上下皮的竖缝错开'},
    {name: '灰缝不匀', issue: 'mortar', hard: true, goal: '每皮差一点，墙顶差多少？'},
    {name: '基准偏移', issue: 'datum', hard: true, goal: '把墙拉回地上的基准线'},
  ];
  const stepPicker = document.createElement('div');
  stepPicker.className = 'c61-picker c61-steps';
  stepPicker.setAttribute('role', 'radiogroup'); stepPicker.setAttribute('aria-label', '人工砌墙的步骤');
  const stepButtons = STEPS.map((st, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('role', 'radio');
    b.innerHTML = `<b>${i + 1}</b><span>${st.name}</span>${st.hard ? '<em>难点</em>' : ''}`;
    b.addEventListener('click', () => goStep(i));
    stepPicker.append(b);
    return b;
  });
  const goStep = i => {
    const st = STEPS[i], L = lab(); if (!L) return;
    if (st.issue) {
      if (L.snapshot().tab !== 'issues') L.setTab('issues');
      document.querySelector(`[data-issue="${st.issue}"]`)?.click();
    } else {
      if (L.snapshot().tab !== 'manual') L.setTab('manual');
      game()?.setLesson(st.lesson);
    }
    // 不等外壳下一次轮询，立刻刷新面板分组和步骤条
    try { window.c2Lab?.ctx?._state(poll()); } catch {}
  };
  const stepOf = s => s.tab === 'issues' ? (s.issue === 'datum' ? 4 : 3) : s.manual.lesson;
  // 三维区左上角：当前这一步要做什么（代替原来的场景名）
  const goal = document.createElement('div');
  goal.className = 'c61-goal'; goal.setAttribute('aria-live', 'polite');
  EL.stage?.append(goal);
  const stepDone = s => [s.manual.completed[0], built.size > 0, s.manual.completed[2], fixed.mortar, fixed.datum];

  // 挑战和步骤勾选用到的“做到过”标记（原状态只记当前值）
  let built = new Set(), sawMortar = false, sawDatum = false, fixed = {}, robot = {};
  const clearMarks = id => {
    if (id === 'manual') { built = new Set(); sawMortar = false; sawDatum = false; fixed = {}; }
    if (id === 'robot') robot = {};
  };

  const STATIONS = [
    {
      id: 'manual', name: '人工砌墙', lead: '亲手砌一段墙，找出人工最容易出错的地方。',
      build(c) {
        const g = c.section('砌筑台');
        c.adopt(EL.manual, g);
        const g1 = c.section('改变它');
        c.adopt(EL.issueSlider, g1);
        const g2 = c.section('现场会发生什么');
        c.adopt(EL.observation, g2);
        const g3 = c.section('机器人怎样介入');
        c.adopt(EL.connection, g3);
        c.challenges([
          {id: 'thick', icon: '📏', title: '拼出墙厚', hint: '第 2 步：240 或 365 mm', check: () => built.size > 0,
            result: '24 墙一块丁砖正好跨过墙厚；一砖半墙是 240 + 10 + 115 = 365 mm。'},
          {id: 'bond', icon: '🧩', title: '消掉通缝', hint: '第 3 步：换皮并错开', check: s => s.manual.completed[2],
            result: '顺丁换皮、错开 62.5 mm，竖缝不再上下连通。机器人也要先排好砖，再给每块砖一个目标。'},
          {id: 'mortar', icon: '〰', title: '把灰缝调匀', hint: '第 4 步：先放大，再归零', check: () => fixed.mortar,
            result: '每皮差一点，几皮下来就累计成明显的高差；要靠材料和标高一起控制。'},
          {id: 'datum', icon: '🎯', title: '对准基准', hint: '第 5 步：把墙拉回基准线', check: () => fixed.datum,
            result: '基准偏了，每块砖都会稳定地放偏。机器人也一样：先对准共同基准，动作才有意义。'},
        ]);
        const show = s => {
          const issue = s.tab === 'issues';
          g.hidden = issue; g1.hidden = g2.hidden = g3.hidden = !issue;
        };
        c.lab.onState(show);
      },
    },
    {
      id: 'mortar', name: '拌砂浆', lead: '投料、开机拌匀，再倾翻出料、送到砌筑位。',
      build(c) {
        const g = c.section('投料');
        c.adopt(EL.mortarFeed, g);
        const g2 = c.section('搅拌');
        c.adopt(EL.mortarMix, g2);
        const g3 = c.section('出料与送料');
        c.adopt(EL.mortarOut, g3);
        c.challenges([
          {id: 'recipe', icon: '🥣', title: '按示例投料', hint: '砂 4 · 水泥 1 · 水 1', check: s => s.mortar.recipeHit,
            result: '砂、水泥、水按设定的份数投进滚筒，砂浆质量先从配料开始。'},
          {id: 'mixed', icon: '🌀', title: '拌匀再出料', hint: '拌到 100%，再摇手轮', check: s => s.mortar.poured.includes('good'),
            result: '滚筒转动时叶片不停翻料，拌匀后颜色一致，再倾翻倒进灰车。'},
          {id: 'wet', icon: '💧', title: '拌一筒太稀的', hint: '多加水，拌匀看看', check: s => s.mortar.wetMixed,
            result: '水多了砂浆太稀，铺灰会流淌，灰缝厚度就难控制。'},
          {id: 'deliver', icon: '🧱', title: '送到砌筑位', hint: '合格的料倒进灰槽', check: s => s.mortar.delivered.includes('good'),
            result: '砂浆要连续送到砌筑位：供料一断，人工和机器人都得停下来等。'},
        ]);
      },
    },
    {
      id: 'robot', name: '机器人取放', lead: '在上方选站位，一步步看机械臂取砖、转向、落砖。',
      build(c) {
        const g = c.section('拆开一次取放');
        if (EL.platformNote) { EL.platformNote.classList.add('c61-note'); c.adopt(EL.platformNote, g); }
        c.adopt(EL.timeline, g);
        const g2 = c.section('闭环定位实验');
        c.adopt(EL.datum, g2);
        const g3 = c.section('夹具外壳');
        const row = c.h('div', 'c61-explode'); g3.append(row);
        c.adopt([EL.explodeLabel, EL.explode], row);
        c.challenges([
          {id: 'full', icon: '▶', title: '完整看一次取放', hint: '播放到“复测”', check: () => robot.full,
            result: '先夹紧再提升，先有支承再松夹：位置和姿态都要对。'},
          {id: 'mobile', icon: '🚚', title: '换个站位再砌', hint: '上方点“换站位”', check: () => robot.mobile,
            result: '移动到新站位后要先稳住、重新测量，才能用同一套目标。'},
          {id: 'fault', icon: '⚠', title: '找出 18 mm 偏差', hint: '勾选站位偏差，播到复测', check: () => robot.fault,
            result: '动作一样准地重复，砖照样放偏：问题出在基准上。'},
          {id: 'fix', icon: '✅', title: '修正后复测为 0', hint: '重新测量基准，再播一次', check: () => robot.fixed,
            result: '测量 → 修正目标 → 再复测，这就是反馈闭环；成墙质量仍要人工复核。'},
        ]);
      },
    },
  ];

  const syncSteps = s => {
    const cur = stepOf(s), done = stepDone(s), next = done.findIndex(d => !d);
    stepButtons.forEach((b, i) => {
      b.setAttribute('aria-checked', String(i === cur));
      b.classList.toggle('done', Boolean(done[i]));
      b.classList.toggle('next', i === next && i !== cur);
      b.querySelector('b').textContent = done[i] ? '✓' : String(i + 1);
    });
    const html = `<b>第 ${cur + 1} 步</b><span>${STEPS[cur].goal}</span>${done[cur] ? '<i>✓ 做到了</i>' : ''}`;
    if (goal.innerHTML !== html) goal.innerHTML = html;
  };

  /* 第 1、2 步只有一两块砖：台面按一段 740 mm 长的墙来画，砖放在墙的中间，
   * 墙长、墙厚的基准线和“墙长方向”标牌一起入画，砖不再是撑满画面的一块蓝色方块。 */
  const scene = lab()?.scene;
  if (scene?.setManual) {
    const setManual = scene.setManual.bind(scene);
    // 灰缝、基准两个难点：原来把右半段整片涂成高亮蓝，改为统一的砖色，偏差靠灰缝厚度和基准线本身看出来
    const shift = (b, dx) => b && {...b, x: b.x + dx};
    scene.setManual = d => setManual(d?.single ? {...d, length: 740, width: 240,
      bricks: d.bricks.map(b => ({...b, selected: false, x: (740 - b.w) / 2, y: (240 - b.d) / 2}))}
      // 第 2 步同理：一皮墙厚小样放在一段墙的中间
      : d?.lesson === 1 && d.length < 740 ? {...d, length: 740, bricks: d.bricks.map(b => shift(b, (740 - d.length) / 2)),
        slots: d.slots?.map(b => shift(b, (740 - d.length) / 2)), ghost: shift(d.ghost, (740 - d.length) / 2)}
      : d?.issue === 'mortar' || d?.issue === 'datum' ? {...d, bricks: d.bricks.map(b => ({...b, selected: false}))} : d);
    if (lab().snapshot().tab === 'manual') game()?.emit();
  }

  function poll() {
    const s = lab().snapshot(), m = s.manual, r = s.robot;
    if (m.lesson === 1 && m.completed[1]) built.add(m.width);
    if (s.tab === 'issues' && s.issue === 'mortar') { if (s.issueAmount > 0) sawMortar = true; else if (sawMortar) fixed.mortar = true; }
    if (s.tab === 'issues' && s.issue === 'datum') { if (s.issueAmount > 0) sawDatum = true; else if (sawDatum) fixed.datum = true; }
    if (s.tab === 'robot' && r.measured) {
      robot.full = true;
      if (r.platform === 'mobile') robot.mobile = true;
      if (r.fault && !r.corrected && r.error > 0) robot.fault = true;
      if (r.fault && r.corrected && r.error === 0) robot.fixed = true;
    }
    return s;
  }

  let lastFeedback = '', lastNoteAt = 0;
  NativeShell.start({
    task: '6-1', title: '砌筑工程与机器人',
    stage: EL.stage,
    stageTop: [stepPicker, EL.platformPicker],
    stations: STATIONS,
    hint: '拖动旋转 · 滚轮缩放',
    current: () => { const t = lab()?.snapshot().tab; return t === 'issues' ? 'manual' : t; },
    select(id) {
      const t = lab()?.snapshot().tab;
      if (id === 'manual' && (t === 'manual' || t === 'issues')) return;
      lab()?.setTab(id);
    },
    reset(id) {
      clearMarks(id);
      if (id === 'manual') {
        const g = game(); if (!g) return;
        g.width = 240; g.kind = 'header';
        for (const i of [2, 1, 0]) { g.lesson = i; g.reset(); }
        if (lab().snapshot().tab === 'issues') {
          for (const k of ['datum', 'mortar']) { document.querySelector(`[data-issue="${k}"]`)?.click(); EL.reset?.click(); }
          lab().setTab('manual');
        }
        g.setLesson(0);
      }
      EL.reset?.click();
    },
    poll,
    build(c) {
      const id = c.station.id;
      stepPicker.hidden = id !== 'manual';
      goal.hidden = id !== 'manual';
      if (EL.platformPicker) EL.platformPicker.hidden = id !== 'robot';
      c.stripAdopt([EL.metrics, EL.live]);
      // 原闯关的文字反馈改为三维区上方的提示条
      lastFeedback = game()?.feedback || '';
      c.lab.onState(s => {
        if (id === 'manual') syncSteps(s);
        const g = game(), text = g?.feedback || '';
        if (id === 'manual' && s.tab === 'manual' && text && text !== lastFeedback) c.feedback(text, g.feedbackTone === 'retry' ? 'warn' : g.feedbackTone === 'success' ? 'ok' : 'info');
        lastFeedback = text;
        // 搅拌机的提示（投料、出料、送料）同样转成提示条
        const m = s.mortar;
        if (id === 'mortar' && m.note && m.noteAt > lastNoteAt) c.feedback(m.note, /先|没|空|不在|太|不好/.test(m.note) ? 'warn' : 'info');
        lastNoteAt = Math.max(lastNoteAt, m.noteAt);
      });
    },
  });
})();

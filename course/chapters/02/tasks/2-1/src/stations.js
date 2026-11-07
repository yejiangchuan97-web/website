/* 任务 2-1 动力装置的基本原理 —— 三维模型沿用原版（motor.html / diesel.html），这里只写右侧操作面板。
 * 两个工位对称：直流电机可以“亲手装一台”，柴油机可以“拆开再装回、装进挖掘机”。
 */
(() => {
  'use strict';

  /* ---------------- 工位 1：直流电机 ---------------- */
  const PARTS = [['stator', '定子'], ['armature', '电枢'], ['support', '支承'], ['brush', '电刷']];
  function motor(c) {
    const {lab, fmt, h} = c;

    /* 调试：电压、负载、接线、看部件 */
    const tune = h('div', 'c2-panel-body');
    const g1 = c.section('电源与负载', null, tune);
    const volt = c.slider({label: '电压', min: 0, max: 24, step: 0.5, value: 24, unit: 'V', onInput: v => lab.set('#voltage', v)});
    const load = c.slider({label: '负载（阻碍转动的力矩）', min: 0, max: 1.4, step: 0.01, value: 0.42, unit: 'N·m', format: v => v.toFixed(2), onInput: v => lab.set('#load', v)});
    const dir = c.segmented([{value: 1, label: '正接 ＋ −'}, {value: -1, label: '反接 − ＋'}], 1, v => lab.click(v > 0 ? '#forwardBtn' : '#reverseBtn'), '接线方向');
    g1.append(volt.el, load.el, dir.el);
    const g2 = c.section('点一个部件，镜头飞过去', null, tune);
    const chips = c.chips([
      {label: '全部', part: 'all'}, {label: '磁铁', part: 'magnet'}, {label: '线圈', part: 'rotor'},
      {label: '换向器', part: 'comm'}, {label: '电刷', part: 'brush'},
    ], it => lab.click(`[data-part="${it.part}"]`));
    g2.append(chips.el);

    /* 组装：原版“组装与接线”，在同一台电机上进行 */
    const build = h('div', 'c2-panel-body'); build.hidden = true;
    const banner = h('div', 'c2-banner'), bannerText = h('span', '', '🔧 组装模式：把电机一件件装起来'); banner.append(bannerText);
    banner.append(c.button('← 回到调试', () => lab.click('#studentExit'), {small: true}));
    build.append(banner);
    const b1 = c.section('① 选零件，再点画面里对应的插槽', null, build);
    const kit = PARTS.map(([id, name]) => {
      const b = h('button', 'c2-chip', name); b.type = 'button';
      b.addEventListener('click', () => lab.click('#kit-' + id));
      return [id, b];
    });
    const kitRow = h('div', 'c2-chips'); kit.forEach(([, b]) => kitRow.append(b));
    b1.append(kitRow);
    const b2 = c.section('② 接线：电源两极接到端子 A、B', null, build);
    const plus = c.segmented([{value: 'A', label: '＋ 接 A'}, {value: 'B', label: '＋ 接 B'}], null, v => lab.set('#wirePositive', v), '正极');
    const minus = c.segmented([{value: 'A', label: '− 接 A'}, {value: 'B', label: '− 接 B'}], null, v => lab.set('#wireNegative', v), '负极');
    const wires = h('div', 'c2-grid2'); wires.append(plus.el, minus.el);
    b2.append(wires);
    const b3 = c.section('③ 先猜它怎么转，再通电', null, build);
    let step = '';
    const guess = c.segmented([{value: 1, label: '↺ 逆时针'}, {value: -1, label: '↻ 顺时针'}, {value: 0, label: '不会转'}], null, v => {
      if (step !== 'verify') lab.click('#studentWireNext');
      setTimeout(() => lab.click(`[data-predict="${v}"]`), 200);
    }, '预测转向');
    const power = c.button('⚡ 通电试验', () => lab.click('#studentPower'), {primary: true});
    b3.append(guess.el, c.row(power, c.button('重新装', () => lab.click('#studentRestart'), {small: true})));
    c.body.append(tune, build);

    const chs = c.challenges([
      {id: 'rev', icon: '🔄', title: '让它反着转', hint: '换一种接线试试', check: s => s.dir < 0 && s.n > 30 && !s.paused && !s.student.active,
        result: '电流方向反了，线圈两边受力也反了，转子就倒着转。'},
      {id: 'fast', icon: '⚡', title: '飙到 3000 转以上', hint: '电压给足，负载调小', check: s => s.n >= 3000 && !s.paused,
        result: '电压越高、负载越小，转得越快。'},
      {id: 'stall', icon: '🛑', title: '把它“憋”停', hint: '负载一直往上加', check: s => s.stalled,
        result: '负载超过电机能给的最大转矩，转不动了（堵转）。这时电流最大，电机最容易发热。'},
      {id: 'build', icon: '🔧', title: '亲手装一台电机', hint: '装零件 → 接线 → 猜转向 → 通电',
        action: {label: '开始组装', fn: () => lab.click('#studentModeBtn')}, check: s => s.student.energized,
        result: '四个部件装对位置、两极分别接 A 和 B、猜对转向，电机就转起来了。'},
    ]);

    const read = c.readouts([{id: 'n', label: '转速', unit: 'r/min'}, {id: 'I', label: '电流', unit: 'A'}, {id: 'T', label: '输出转矩', unit: 'N·m'}, {id: 'P', label: '输出功率', unit: 'W'}]);
    let playing = false, lastFeedback = '';
    const tr = c.transport({onToggle: p => { if (p !== playing) lab.click('#pauseBtn'); }, onStep: () => lab.click('#stepBtn'), onReset: () => lab.click('#resetBtn'), stepText: '单步 15°'});
    c.view('全景', () => lab.click('#viewReset'));
    const look = c.toolSeg([{value: 'cutMode', label: '剖开'}, {value: 'wholeMode', label: '完整'}, {value: 'wireMode', label: '去掉外壳'}], 'cutMode', v => lab.click('#' + v), '外观');
    const em = c.tool('磁场与受力', () => lab.click('#emToggle'), true);
    const chipName = p => ({magnet: '永磁定子', rotor: '电枢与铜线圈', comm: '分裂环换向器', brush: '碳刷与接线端'}[p] || '');
    lab.onState(s => {
      read('n', fmt(s.n)); read('I', fmt(s.I, 1)); read('T', fmt(s.T, 2)); read('P', fmt(s.P));
      volt.sync(s.voltage); load.sync(s.load); dir.set(s.dir); look.set(s.view); em.set(s.showEM);
      playing = !s.paused; tr.setPlaying(playing);
      const st = s.student;
      tune.hidden = st.active; build.hidden = !st.active; chs.section.hidden = st.active;
      if (st.active) {
        step = st.step;
        kit.forEach(([id, b], i) => { b.classList.toggle('done', i < st.installed); b.textContent = (i < st.installed ? '✓ ' : '') + PARTS[i][1]; b.setAttribute('aria-pressed', String(st.selected === id)); });
        plus.set(st.positive || null); minus.set(st.negative || null); guess.set(st.prediction);
        power.textContent = st.energized ? '断电' : '⚡ 通电试验';
        bannerText.textContent = st.energized ? '✅ 装好了，电机转起来了！' : `🔧 组装模式：已装 ${st.installed} / 4`;
        if (st.feedback && st.feedback !== lastFeedback && !/预测正确/.test(st.feedback)) {
          lastFeedback = st.feedback;
          c.feedback(st.feedback.replace(/^✓\s*/, ''), /✓|已安装|已记录|已接通|正确/.test(st.feedback) ? 'ok' : /不匹配|不能|未闭合|请先|先|错误|断开/.test(st.feedback) ? 'warn' : 'info');
        }
      } else if (s.partText) c.showPart(chipName(s.part), s.partText); else c.showPart(null);
    });
  }

  /* ---------------- 工位 2：柴油机 ---------------- */
  const STROKES = ['进气', '压缩', '做功', '排气'];
  function diesel(c) {
    const {lab, fmt} = c;
    const g1 = c.section('让曲轴转起来');
    const angle = c.slider({label: '曲轴转角', min: 0, max: 719.9, step: 0.1, value: 0, unit: '°', format: v => Math.round(v), onInput: v => lab.set('#cycleRange', v)});
    const stroke = c.segmented(STROKES.map((t, i) => ({value: i, label: t})), null, i => lab.click(`#strokes [data-stroke="${i}"]`), '冲程');
    const explode = c.slider({label: '拆开程度', min: 0, max: 100, step: 1, value: 0, unit: '%', onInput: v => lab.set('#explodeRange', v)});
    g1.append(angle.el, stroke.el, explode.el);

    const g3 = c.section('换一台、装上车');
    const engine = c.segmented([{value: 1, label: '单缸'}, {value: 4, label: '四缸'}], 1, v => lab.call('engineLab.setEngine', v), '气缸数');
    const vehicle = c.button('🚜 装进挖掘机', () => lab.click('#vehicleBtn'));
    g3.append(c.row(engine.el, vehicle));

    let wasApart = false;
    c.challenges([
      {id: 'power', icon: '🔥', title: '停在“做功”那一刻', hint: '找到燃气推活塞的冲程', check: s => s.stroke === 2 && !s.running,
        result: '两个气门都关着，燃气膨胀把活塞推下去——四个冲程里只有它在出力。'},
      {id: 'apart', icon: '🔧', title: '拆开，再装回去', hint: '“拆开程度”拉满再拉回 0', check: s => { if (s.explode > 0.9) wasApart = true; return wasApart && s.explode < 0.02; },
        result: '零件都回到原位了。拆开时能看清活塞、连杆、曲轴怎样连在一起。'},
      {id: 'four', icon: '④', title: '让四个缸一起转', hint: '换成四缸，按运行', check: s => s.mode === 4 && s.running,
        result: '四个缸轮流做功，曲轴每转半圈就有一个缸在推，转起来更平稳。'},
      {id: 'car', icon: '🚜', title: '把它装进挖掘机', hint: '看看发动机装在车的哪里', check: s => s.vehicle && s.installation > 0.9,
        result: '发动机在挖掘机后部。它转起来以后，动力还要传到履带和动臂——这就是 2-2“传递与变换”。'},
    ]);

    const read = c.readouts([{id: 'stroke', label: '冲程'}, {id: 'angle', label: '曲轴转角', unit: '°'}, {id: 'rpm', label: '发动机'}, {id: 'cyl', label: '气缸'}]);
    let running = false;
    const tr = c.transport({onToggle: p => { if (p !== running) lab.click('#playBtn'); }, onStep: () => lab.click('#stepBtn'), onReset: () => lab.click('#resetAll'), stepText: '前进 15°',
      speeds: [[0.25, '慢'], [0.5, '中'], [1.2, '快']], speed: 0.5, onSpeed: v => lab.set('#speedRange', v)});
    c.view('全景', () => lab.click('#resetView'));
    c.toolSeg([['iso', '立体'], ['front', '正视'], ['side', '侧视']].map(([value, label]) => ({value, label})), 'iso', v => lab.click(`[data-view="${v}"]`), '视角');
    const cut = c.tool('剖开机体', () => lab.click('#cutToggle'), true);
    const sound = c.tool('🔊 声音', () => lab.click('#audioToggle'), false);
    const watch = c.toolSeg([1, 2, 3, 4].map(n => ({value: n, label: `看${n}缸`})), 1, v => lab.call('engineLab.observeCylinder', v), '观察气缸');
    lab.onState(s => {
      read('stroke', s.stroke == null ? '—' : STROKES[s.stroke]);
      read('angle', fmt(s.angle % 720)); read('rpm', s.rpm || '—');
      read('cyl', s.mode === 4 ? `四缸 · 第${s.observed}缸` : '单缸');
      angle.sync(s.angle % 720); explode.sync(Math.round(s.targetExplode * 100));
      stroke.set(s.stroke); engine.set(s.mode); watch.set(s.observed); watch.el.hidden = s.mode !== 4;
      cut.set(s.cut); sound.set(s.audio);
      vehicle.textContent = s.vehicle ? '从车上取下' : '🚜 装进挖掘机';
      running = s.running; tr.setPlaying(running);
      if (s.partName) c.showPart(s.partName, s.partDesc); else c.showPart(null);
    });
  }

  C2Lab.start({
    ...window.C2Page,
    stations: [
      {id: 'motor', name: '直流电机', src: 'motor.html', build: motor,
        lead: '通上电它就转。让它快、慢、反着转，或者亲手装一台。',
        hint: '拖动旋转 · 滚轮缩放 · 点部件看名称'},
      {id: 'diesel', name: '柴油机', src: 'diesel.html#diesel-single', build: diesel,
        lead: '燃气推活塞，活塞带曲轴。拆开、换四缸、装上车看看。',
        hint: '拖动旋转 · 滚轮缩放 · 点零件标签看介绍'},
    ],
  });
})();

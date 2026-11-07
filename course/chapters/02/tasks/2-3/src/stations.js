/* 任务 2-3 工作机构与施工动作 —— 三维模型沿用原版（mechanisms.html），这里只写右侧操作面板。
 * 本任务只管“运动变成了什么样”：伸缩变转动（液压缸 + 连杆）、转动变直线（丝杠）。快慢和力的换算在 2-2。
 */
(() => {
  'use strict';

  function transport(c, lab, stepSel, stepText) {
    let playing = false;
    const tr = c.transport({
      onToggle: p => { if (p !== playing) lab.click('#play'); },
      onStep: () => lab.click(stepSel), stepText,
      onReset: () => lab.click('#reset'),
      speeds: [['0.5', '慢'], ['1', '中'], ['2', '快']], speed: '1', onSpeed: v => lab.set('#speed', v),
    });
    return s => { playing = Boolean(s.play); tr.setPlaying(playing); };
  }
  function views(c, lab, scope) {
    c.view('全景', () => lab.click(`${scope} [data-view="iso"]`));
    return c.toolSeg([['iso', '轴测'], ['front', '正视'], ['side', '侧视'], ['top', '俯视']].map(([value, label]) => ({value, label})), 'iso', v => lab.click(`${scope} [data-view="${v}"]`), '视角');
  }

  /* ---------------- 工位 1：液压缸带动臂 ---------------- */
  function boom(c) {
    const {lab, fmt} = c;
    const g1 = c.section('推液压缸');
    const stroke = c.slider({label: '液压缸伸出量', min: 0, max: 50, step: 0.5, value: 10, unit: 'mm', format: v => v.toFixed(1), onInput: v => lab.set('#stroke', v)});
    const pose = c.segmented([{value: 'normal-pose', label: '正常姿势'}, {value: 'hyd-dead', label: '缸最难推'}, {value: 'link-dead', label: '连杆最难推'}], null, v => lab.click('#' + v), '姿势');
    g1.append(stroke.el, pose.el);
    const g2 = c.section('改一改杆的长度');
    const grid = c.h('div', 'c2-grid2');
    const a = c.slider({label: '动臂 A', min: 60, max: 120, step: 1, value: 100, unit: 'mm', onInput: v => lab.set('#a', v)});
    const b = c.slider({label: '连杆 B', min: 100, max: 210, step: 1, value: 170, unit: 'mm', onInput: v => lab.set('#b', v)});
    const cc = c.slider({label: '从动臂 C', min: 70, max: 160, step: 1, value: 120, unit: 'mm', onInput: v => lab.set('#c', v)});
    grid.append(a.el, b.el, cc.el);
    g2.append(grid);

    let sawLow = false, sawHigh = false;
    c.challenges([
      {id: 'sweep', icon: '⤴', title: '从最低抬到最高', hint: '把伸出量从头拉到尾', check: s => { if (s.stroke <= s.strokeMin + 0.6) sawLow = true; if (s.stroke >= s.strokeMax - 0.6) sawHigh = true; return sawLow && sawHigh; },
        result: '液压缸只会直线伸缩，动臂却绕固定铰点转了一个角度：直线运动变成了转动。'},
      {id: 'hard', icon: '⚠', title: '找到最难推的姿势', hint: '看力臂读数变得很小', check: s => Number.isFinite(s.moment) && s.moment < 8,
        result: '液压缸的力几乎对准铰点推，力臂很小，推力再大也很难让动臂转——机器设计时要避开这种姿势。'},
      {id: 'shape', icon: '〰', title: '改一根杆，让轨迹变样', hint: '打开轨迹，再拖杆长', check: s => s.a !== 100 || s.b !== 170 || s.c !== 120,
        result: '杆长一变，能转的范围和末端走的路线都跟着变——机构的样子决定了动作的样子。'},
    ]);

    const read = c.readouts([{id: 'stroke', label: '缸伸出', unit: 'mm'}, {id: 'theta', label: '动臂角度', unit: '°'}, {id: 'arm', label: '力臂', unit: 'mm'}, {id: 'len', label: '缸总长', unit: 'mm'}]);
    const sync = transport(c, lab, '#boom-step', '伸出 2 mm');
    const view = views(c, lab, '#boom-lab');
    const trace = c.tool('轨迹', () => lab.click('#trace'), true);
    const forces = c.tool('受力', () => lab.click('#forces'), true);
    lab.onState(s => {
      sync(s);
      read('stroke', fmt(s.stroke, 1)); read('theta', fmt(s.theta, 1)); read('arm', fmt(s.moment, 1)); read('len', fmt(s.len, 1));
      if (Number.isFinite(s.strokeMax) && +stroke.input.max !== +s.strokeMax.toFixed(1)) stroke.input.max = s.strokeMax.toFixed(1);
      stroke.sync(s.stroke); a.sync(s.a); b.sync(s.b); cc.sync(s.c);
      trace.set(s.trace); forces.set(s.forces);
    });
  }

  /* ---------------- 工位 2：丝杠升降 ---------------- */
  function screw(c) {
    const {lab, fmt} = c;
    const g1 = c.section('转丝杠');
    const turns = c.slider({label: '丝杠转了（相对螺母）', min: 0, max: 12.5, step: 0.01, value: 3, unit: '圈', format: v => v.toFixed(2), onInput: v => lab.set('#turns', v)});
    const lead = c.slider({label: '导程：转 1 圈滑台走多远', min: 2, max: 12, step: 1, value: 8, unit: 'mm', onInput: v => lab.set('#lead', v)});
    const mode = c.segmented([{value: 'guided', label: '导轨挡住螺母'}, {value: 'sync', label: '螺母跟着转'}], 'guided', v => lab.set('#mode', v), '螺母');
    g1.append(turns.el, lead.el, mode.el);

    let ch = null;
    const guess = c.predict({prompt: '猜：转 5 圈升多高？', inline: true, unit: 'mm', onGuess: v => {
      const st = lab.state; if (!st) return undefined;
      const right = st.lead * 5;
      lab.set('#mode', 'guided'); lab.set('#turns', 0); setTimeout(() => lab.set('#turns', 5), 350);
      if (Math.abs(v - right) < 0.01) { ch.complete('guess'); return true; }
      c.feedback(`看模型：导程 ${st.lead} mm，转 5 圈应该是 ${st.lead} × 5 = ${right} mm。`, 'warn');
      return false;
    }});
    c.body.append(guess.el);
    ch = c.challenges([
      {id: 'guess', icon: '🎯', title: '猜中升高的距离', hint: '移动距离 = 圈数 × 导程',
        result: '转一圈走一个导程。圈数乘导程，就是滑台走的距离。'},
      {id: 'sync', icon: '🔄', title: '让螺母跟着丝杠转', hint: '再转几圈，滑台还升吗？', check: s => s.mode === 'sync' && s.play,
        result: '螺母和丝杠一起转，没有相对转动，滑台就不走了——导轨就是用来挡住螺母的。'},
      {id: 'lead', icon: '📏', title: '同样圈数，走得更远', hint: '把导程调大', check: s => s.lead >= 12 && s.relative > 0.5,
        result: '导程越大，转一圈走得越远；可电机推起来也更费劲。'},
      {id: 'shake', icon: '📳', title: '装个偏心块，让台子抖起来', hint: '点画面上方“偏心振动”，再运行', check: s => s.vibration && s.play,
        result: '转动的零件有偏心，整个台子就跟着振——打夯机、混凝土振动棒就是这么来的。'},
    ]);

    const read = c.readouts([{id: 'rel', label: '相对转动', unit: '圈'}, {id: 'h', label: '滑台升高', unit: 'mm'}, {id: 'lead', label: '导程', unit: 'mm'}, {id: 'rpm', label: '丝杠转速', unit: 'r/min'}]);
    const sync = transport(c, lab, '#screw-step', '转 1 圈');
    views(c, lab, '#screw-lab');
    const vib = c.tool('偏心振动', () => lab.click('#vibration'), false);
    lab.onState(s => {
      sync(s);
      read('rel', fmt(s.relative, 2)); read('h', fmt(s.height, 1)); read('lead', fmt(s.lead)); read('rpm', fmt(s.rpm));
      turns.sync(s.ns); lead.sync(s.lead); mode.set(s.mode); vib.set(s.vibration);
    });
  }

  C2Lab.start({
    ...window.C2Page,
    stations: [
      {id: 'boom', name: '液压缸 · 动臂', src: 'mechanisms.html#boom', build: boom,
        lead: '液压缸只会伸缩，动臂和连杆却在转。看哪些点固定、哪些点在动。', hint: '拖动旋转 · 滚轮缩放'},
      {id: 'screw', name: '丝杠 · 升降台', src: 'mechanisms.html#screw', build: screw,
        lead: '丝杠一直在转，滑台却在直线走。螺母为什么不跟着转？', hint: '拖动旋转 · 滚轮缩放'},
    ],
  });
})();

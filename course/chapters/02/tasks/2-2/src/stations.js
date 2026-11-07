/* 任务 2-2 动力的传递与变换 —— 三维模型沿用原版（transmission.html），这里只写右侧操作面板。
 * 本任务只管“传过去以后，变了多少”：快慢、方向、力的大小。运动形式怎样改变留给 2-3。
 */
(() => {
  'use strict';

  function common(c, lab) {
    let playing = false;
    const tr = c.transport({
      onToggle: p => { if (p !== playing) lab.click('#playBtn'); },
      onStep: () => lab.click('#stepBtn'), onReset: () => lab.click('#resetBtn'), stepText: '前进 0.1 秒',
      speeds: [[0.5, '慢'], [1, '中'], [2, '快']], speed: 1, onSpeed: v => lab.set('#speed', v),
    });
    c.view('全景', () => lab.click('#homeBtn'));
    const cam = c.toolSeg([{value: 'isoBtn', label: '立体'}, {value: 'frontBtn', label: '正视'}], 'isoBtn', v => lab.click('#' + v), '视角');
    return s => { playing = s.playing; tr.setPlaying(playing); };
  }

  /* ---------------- 工位 1：齿轮、带、链 ---------------- */
  function gears(c) {
    const {lab, fmt} = c;
    const g1 = c.section('怎么传');
    const kind = c.segmented([{value: 'gear', label: '齿轮'}, {value: 'belt', label: '皮带'}, {value: 'chain', label: '链条'}], 'gear', v => lab.click(`[data-kind="${v}"]`), '传动方式');
    const size = c.segmented([20, 30, 40, 60].map(z => ({value: z, label: '1 : ' + (z / 20).toFixed(z % 20 ? 1 : 0), title: `2 号轮是 1 号轮的 ${(z / 20)} 倍`})), 40, v => lab.set('#ratio', v), '两个轮的大小');
    const input = c.segmented([{value: 1, label: '小轮带大轮'}, {value: 2, label: '大轮带小轮'}], 1, v => lab.set('#inputAxis', v), '谁是主动轮');
    g1.append(kind.el, c.h('span', 'c2-note', '两个轮的大小比（1 号 : 2 号）'), size.el, input.el);
    const g2 = c.section('输入');
    const rpm = c.slider({label: '输入转速', min: 0, max: 60, step: 1, value: 18, unit: 'r/min', onInput: v => lab.set('#rpm', v)});
    const torque = c.slider({label: '输入转矩', min: 1, max: 30, step: 1, value: 8, unit: 'N·m', onInput: v => lab.set('#torque', v)});
    g2.append(c.h('div', 'c2-grid2'));
    g2.lastChild.append(rpm.el, torque.el);

    c.challenges([
      {id: 'third', icon: '⅓', title: '输出只剩输入的 1/3', hint: '换两个轮的大小比', check: s => s.tr && Math.abs(s.tr.ratio - 3) < 1e-6 && Math.abs(s.tr.nin) > 0,
        result: '传动比 3：输出转速 = 输入转速 ÷ 3。小轮转三圈，大轮才转一圈。'},
      {id: 'fast', icon: '⏩', title: '让输出比输入快', hint: '换个主动轮试试', check: s => s.tr && Math.abs(s.tr.nout) > Math.abs(s.tr.nin) + 0.01,
        result: '大轮带小轮就是增速。可是看看输出转矩：变小了。'},
      {id: 'same', icon: '⇉', title: '让两根轴同一个方向转', hint: '齿轮做不到？换一种传法', check: s => s.tr && s.tr.nin * s.tr.nout > 0,
        result: '皮带和链条两头的轮转向相同；一对齿轮啮合，转向相反。'},
      {id: 'torque', icon: '💪', title: '输出转矩超过 60 N·m', hint: '输入转矩 + 传动比一起想办法', check: s => s.tr && s.tr.tout > 60,
        result: '减速就能增大转矩。但功率没有变多——转得慢了，还有一点摩擦损失。'},
    ]);

    const read = c.readouts([{id: 'in', label: '输入转速', unit: 'r/min'}, {id: 'out', label: '输出转速', unit: 'r/min'}, {id: 'ratio', label: '传动比'}, {id: 'tq', label: '输出转矩', unit: 'N·m'}]);
    const sync = common(c, lab);
    lab.onState(s => {
      sync(s);
      if (!s.tr) return;
      read('in', fmt(s.tr.nin)); read('out', fmt(s.tr.nout, 1)); read('ratio', s.tr.ratio.toFixed(2)); read('tq', fmt(s.tr.tout, 1));
      kind.set(s.params.kind); size.set(s.params.z2); input.set(s.params.input || 1);
      rpm.sync(s.params.rpm); torque.sync(s.params.torque);
    });
  }

  /* ---------------- 工位 2、3：液压缸、气缸 ---------------- */
  function cylinder(c, kind) {
    const {lab, fmt} = c;
    const hyd = kind === 'hyd';
    const g1 = c.section(hyd ? '换向阀：让油往哪边走' : '换向阀：让气往哪边走');
    const valve = c.segmented([{value: -1, label: '← 缩回'}, {value: 0, label: '中位'}, {value: 1, label: '伸出 →'}], 1, v => lab.click(`[data-command="${v}"]`), '换向阀');
    g1.append(valve.el);
    const g2 = c.section(hyd ? '泵、负载和缸' : '气源、负载和缸');
    const flow = hyd
      ? c.slider({label: '泵的流量', min: 0.5, max: 8, step: 0.1, value: 3, unit: 'L/min', format: v => v.toFixed(1), onInput: v => lab.set('#flow', v)})
      : c.slider({label: '供气能力', min: 20, max: 300, step: 5, value: 100, unit: 'L/min', onInput: v => lab.set('#flow', v)});
    const pressure = hyd
      ? c.slider({label: '最高压力', min: 0.5, max: 12, step: 0.1, value: 5, unit: 'MPa', format: v => v.toFixed(1), onInput: v => lab.set('#pressure', v)})
      : c.slider({label: '气源压力', min: 0.1, max: 0.8, step: 0.01, value: 0.6, unit: 'MPa', format: v => v.toFixed(2), onInput: v => lab.set('#pressure', v)});
    const load = hyd
      ? c.slider({label: '负载', min: 0, max: 20000, step: 100, value: 1800, unit: 'N', onInput: v => lab.set('#load', v)})
      : c.slider({label: '负载', min: 0, max: 1500, step: 10, value: 180, unit: 'N', onInput: v => lab.set('#load', v)});
    const bores = hyd ? [40, 50, 63, 80] : [32, 40, 50, 63];
    const bore = c.segmented(bores.map(d => ({value: d, label: '缸径 ' + d})), hyd ? 50 : 40, v => lab.set('#bore', v), '缸径（毫米）');
    const pair = c.h('div', 'c2-grid2'); pair.append(flow.el, pressure.el);
    g2.append(pair, load.el, bore.el);

    let sawOut = false, sawIn = false, sawWait = false;
    c.challenges(hyd ? [
      {id: 'cycle', icon: '↔', title: '伸出去，再收回来', hint: '拨换向阀', check: s => { if (s.state.v > 1e-4) sawOut = true; if (s.state.v < -1e-4) sawIn = true; return sawOut && sawIn; },
        result: '伸出：油进无杆腔，有杆腔的油回油箱；缩回反过来。一边进油，另一边一定在回油。'},
      {id: 'fast', icon: '⏩', title: '让活塞杆跑得更快', hint: '速度 50 mm/s 以上', check: s => Math.abs(s.state.v) * 1000 >= 50,
        result: '流量越大，活塞走得越快。阀管方向，流量管快慢。'},
      {id: 'stuck', icon: '🛑', title: '让它推不动', hint: '负载加大，或者把最高压力调低', check: s => /负载超限/.test(s.state.status),
        result: '要推动负载需要的压力，超过了溢流阀允许的最高压力，油从溢流阀流回油箱，活塞停住。'},
      {id: 'big', icon: '🏋', title: '推动 15000 N 以上的负载', hint: '压力有上限，那就换一个缸', check: s => s.params.load >= 15000 && Math.abs(s.state.v) > 1e-4,
        result: '推力 ≈ 压力 × 活塞面积。缸径大，同样压力推得更重——但同样流量下走得更慢。'},
    ] : [
      {id: 'cycle', icon: '↔', title: '伸出去，再收回来', hint: '拨换向阀', check: s => { if (s.state.v > 1e-3) sawOut = true; if (s.state.v < -1e-3) sawIn = true; return sawOut && sawIn; },
        result: '气缸和液压缸一样：一腔进气，另一腔排气。'},
      {id: 'wait', icon: '⏳', title: '看见“先憋气，再动”', hint: '负载加到 500 N 以上，再伸出', check: s => { if (/充气建压/.test(s.state.status) && s.params.load >= 500) sawWait = true; return sawWait && Math.abs(s.state.v) > 1e-3; },
        result: '空气能被压缩：负载大时，要先把缸里的气压憋高，活塞才开始动。液压油几乎压缩不了，就没有这么明显。'},
      {id: 'stuck', icon: '🛑', title: '让它推不动', hint: '负载调大，或者气压调低', check: s => /负载超限/.test(s.state.status),
        result: '气压乘活塞面积不够推动负载，活塞停住。'},
      {id: 'big', icon: '🏋', title: '推动 1200 N 以上的负载', hint: '气压开大，或换大缸', check: s => s.params.load >= 1200 && Math.abs(s.state.v) > 1e-3,
        result: '推力 ≈ 气压 × 活塞面积。气压最高才零点几兆帕，所以气缸多用在推、夹这类轻活上。'},
    ]);

    const read = c.readouts([{id: 'x', label: '活塞杆伸出', unit: 'mm'}, {id: 'v', label: '速度', unit: 'mm/s'}, {id: 'p', label: '进口压力', unit: 'MPa'}, {id: 'f', label: '推力', unit: hyd ? 'kN' : 'N'}]);
    const sync = common(c, lab);
    lab.onState(s => {
      sync(s);
      const st = s.state, p = s.params;
      read('x', fmt(st.x * 1000)); read('v', fmt(st.v * 1000, 1));
      read('p', fmt(Math.max(st.pA, st.pB) / 1e6, hyd ? 1 : 2));
      read('f', hyd ? fmt(Math.abs(st.force) / 1000, 1) : fmt(Math.abs(st.force)));
      valve.set(st.command); flow.sync(p.flow); pressure.sync(p.pressure); load.sync(p.load); bore.set(p.bore);
      c.showPart(null);
    });
  }

  C2Lab.start({
    ...window.C2Page,
    stations: [
      {id: 'gear', name: '齿轮 · 皮带 · 链条', src: 'transmission.html#gear', build: gears,
        lead: '同样转进去，换种传法，出来的快慢、方向、力气都会变。', hint: '拖动旋转 · 滚轮缩放 · 点部件看名称'},
      {id: 'hyd', name: '液压缸', src: 'transmission.html#hyd', build: c => cylinder(c, 'hyd'),
        lead: '泵把油压进缸里，活塞杆就被推出去。拨阀门、调流量、加负载。', hint: '拖动旋转 · 滚轮缩放 · 点部件看名称'},
      {id: 'air', name: '气缸', src: 'transmission.html#air', build: c => cylinder(c, 'air'),
        lead: '压缩空气也能推活塞。和液压比一比：空气会被压缩。', hint: '拖动旋转 · 滚轮缩放 · 点部件看名称'},
    ],
  });
})();

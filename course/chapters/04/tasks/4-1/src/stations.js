/* 任务 4-1 机器人自身状态感知 —— 原页面的三维、数据模型和同步曲线保持不变，搬进统一外壳。
 * 原页面的四种状态案例（坡面停驻 / 起步与制动 / 路面颠簸 / 原地转向）就是四个工位。
 * 三维区下面紧挨着三条同步曲线和时间轴（同一时间轴，是本页的主体）；面板里是读数、改变条件和试一试。
 * 原页面没有自带关卡，“试一试”全部从 window.__STATE_LAB__.snapshot() 读状态判定。
 */
(() => {
  'use strict';
  const {$, all} = NativeShell;
  const lab = () => window.__STATE_LAB__;
  const snap = () => lab()?.snapshot();
  const EL = {
    stage: $('#viewport'),
    readings: $('#readings'), axis: $('#axisReadings'), explain: $('#liveExplanation'),
    controls: {slope: $('#slopeControls'), drive: $('#driveControls'), bump: $('#bumpControls'), turn: $('#turnControls')},
    gravity: $('#gravityControl'),
    waves: $('.wave-section'), timeline: $('.timeline'), phases: $('.phase-row'),
    compare: $('#compareToggle'), axes: $('#axesToggle'),
  };
  // 外壳里已有工位条、工位名和“重来”：原来的页头、状态页签、标题、复位、说明文字收起
  for (const e of all('.condition-title, .wave-title, .wave-footer > span:last-child, .phase-row > span, .phase-row > p')) e.setAttribute('hidden', '');

  // 同步曲线：放在三维区和底栏（时间轴）之间，四个工位共用（不随工位切换搬动）
  const band = document.createElement('div');
  band.className = 'c41-waves';
  band.append(...[EL.waves].filter(Boolean));

  const flags = {}, moved = {}, startTime = {};
  // 原页面每个案例打开时就停在一个典型时刻；“停在……”类挑战要等学生自己动过时间轴才算
  const mark = (k) => { flags[k] = true; };
  $('#phaseButtons')?.addEventListener('click', e => { if (e.target.closest('[data-time]')) { const k = snap()?.state.case; if (k) moved[k] = true; } });
  const near = (a, b, d) => Math.abs(a - b) <= d;

  const STATIONS = [
    {
      id: 'slope', name: '坡面停驻', lead: '停在斜面上不动，为什么还有加速度读数？调坡角，看三根轴怎样分。',
      build(c) {
        const g = c.section('此刻的数据'); c.adopt([EL.readings, EL.axis, EL.explain], g);
        const g2 = c.section('改变条件'); c.adopt([EL.controls.slope, EL.gravity], g2);
        c.challenges([
          {id: 'flat', icon: '⚖', title: '让它平放在地上', hint: '坡角调到 0°', check: s => s.state.tilt === 0 && s.state.time >= 3,
            result: '平放时 x、y 接近 0，z 约 9.81 m/s²：一动不动，也有重力的读数。'},
          {id: 'roll', icon: '↔', title: '换成左右倾斜', hint: '看哪根轴的读数变了', check: s => s.state.tiltAxis === 'roll' && Math.abs(s.state.tilt) >= 5 && s.state.time >= 3,
            result: '左右倾斜时变的是 y 轴，前后倾斜变的是 x 轴；合起来仍约 9.81 m/s²。'},
          {id: 'hold', icon: '⏸', title: '停在坡上看倾斜变化', hint: '定位到“坡面保持”', check: s => moved.slope && s.state.tilt !== 0 && s.state.time >= 3.2 && !s.state.playing && s.sample.angular === 0,
            result: '停在坡上不动，车身斜着，倾斜变化却是 0——“斜着”和“正在变斜”是两回事。'},
          {id: 'nog', icon: '🧲', title: '关掉“包含重力”', hint: '静止时三轴变成多少', check: s => !s.state.gravity,
            result: '去掉重力的影响后，停着不动的三轴都接近 0；车身斜了多少，还得看含重力的读数。'},
        ]);
      },
    },
    {
      id: 'drive', name: '起步与制动', lead: '同样在往前走，起步、匀速、制动时，数据完全不一样。',
      build(c) {
        const g = c.section('此刻的数据'); c.adopt([EL.readings, EL.explain], g);
        const g2 = c.section('改变条件'); c.adopt(EL.controls.drive, g2);
        c.challenges([
          {id: 'whole', icon: '▶', title: '从起步看到停稳', hint: '从头播放一遍', check: () => flags.driveWhole,
            result: '加速度先正、再为 0、再为负；速度先升、再平、再降；走过的路一直在增加。'},
          {id: 'cruise', icon: '0', title: '停在匀速段', hint: '还在走，加速度是多少', check: s => s.sample.phase === '匀速前进' && !s.state.playing,
            result: '还在前进，但速度不再变化，所以前向加速度为 0。'},
          {id: 'brake', icon: '➖', title: '找到负的加速度', hint: '车这时还在往前走', check: s => s.sample.ax < 0 && !s.state.playing,
            result: '制动时速度在减小，加速度为负——车并没有往后退。'},
          {id: 'fast', icon: '🚀', title: '把最高速度调到 0.8', hint: '起步加速度会变吗', check: s => s.state.speed >= 0.79,
            result: '同样 2 秒加到更高的速度，起步加速度更大，停下的位置也更远。'},
        ]);
      },
    },
    {
      id: 'bump', name: '路面颠簸', lead: '车速不变，只改路面的起伏，把起伏和加速度波形对上。', note: '上下起伏放大 8 倍显示，读数不放大',
      build(c) {
        const g = c.section('此刻的数据'); c.adopt([EL.readings, EL.axis, EL.explain], g);
        const g2 = c.section('改变条件'); c.adopt([EL.controls.bump, EL.gravity], g2);
        c.challenges([
          {id: 'flat', icon: '🛣', title: '换成平整路面', hint: '波形还在吗', check: s => s.state.roughness === 0,
            result: '路面平整，上下方向的加速度不再波动。'},
          {id: 'rough', icon: '〰', title: '换成明显起伏', hint: '波形高了还是矮了', check: s => s.state.roughness === 2,
            result: '起伏越明显，上下方向的加速度摆得越大。'},
          {id: 'inside', icon: '📍', title: '停在颠簸中间', hint: '时间拖到 2～6 秒', check: s => moved.bump && s.state.roughness > 0 && s.state.time > 2.2 && s.state.time < 5.8 && !s.state.playing,
            result: '颠簸时上下方向的加速度忽正忽负；波形的最高、最低点，并不是路面的最高、最低点。'},
          {id: 'compare', icon: '📊', title: '和基准叠在一起比', hint: '换个起伏，打开“叠加基准”', check: s => s.state.compare && s.state.roughness !== 1,
            result: '虚线是“轻微起伏”的基准，实线和它一比，差别一眼就能看出来。'},
        ]);
      },
    },
    {
      id: 'turn', name: '原地转向', lead: '都转 90°，转得快和转得慢，会留下不一样的曲线。',
      build(c) {
        const g = c.section('此刻的数据'); c.adopt([EL.readings, EL.axis, EL.explain], g);
        const g2 = c.section('改变条件'); c.adopt([EL.controls.turn, EL.gravity], g2);
        c.challenges([
          {id: 'slow', icon: '🐢', title: '看完一次慢转', hint: '停转后再看转角', check: s => s.state.turnDuration === 4 && s.state.time >= 5.2,
            result: '慢转 4 秒：角速度一直不高，累计转角慢慢到 90°。'},
          {id: 'quick', icon: '🐇', title: '换成快转', hint: '看完 1 秒的转向', check: s => s.state.turnDuration === 1 && s.state.time >= 2.1,
            result: '快转 1 秒也只转到 90°：角速度峰值更高，持续时间更短。'},
          {id: 'half', icon: '🎯', title: '停在转了一半时', hint: '一共转了约 45°', check: s => near(s.sample.yaw, 45, 5) && !s.state.playing,
            result: '转到一半时角速度最大；转过多少和转得多快要分开看。'},
          {id: 'compare', icon: '📊', title: '快转叠上慢转比', hint: '快转时打开“叠加基准”', check: s => s.state.compare && s.state.turnDuration === 1,
            result: '实线快转、虚线慢转：一个高而窄，一个矮而宽，最后都停在 90°。'},
        ]);
      },
    },
  ];

  NativeShell.start({
    task: '4-1', title: '机器人自身状态感知',
    stage: EL.stage,
    hint: '教学模拟 · 拖动旋转 · 滚轮缩放',
    stations: STATIONS,
    current: () => snap()?.state.case,
    select: id => { if (snap()?.state.case !== id) lab()?.chooseCase(id); },
    reset: id => lab()?.chooseCase(id),
    poll() {
      const s = snap(), k = s.state.case;
      if (startTime[k] == null) startTime[k] = s.state.time;
      if (s.state.playing || Math.abs(s.state.time - startTime[k]) > 0.05) moved[k] = true;
      if (s.state.case === 'drive') {
        if (s.state.playing && s.state.time < 1.5) flags.driveStart = true;
        if (flags.driveStart && s.state.time >= 7.4) mark('driveWhole');
      } else flags.driveStart = false;
      return s;
    },
    build(c) {
      if (c.station.id !== 'drive') flags.driveStart = false;
      // 怎么看：视角和方向参照放在三维区左上角，点的是原页面的按钮
      const view = all('[data-view]').find(b => b.getAttribute('aria-pressed') === 'true')?.dataset.view || 'iso';
      c.toolSeg([{value: 'iso', label: '全景'}, {value: 'side', label: '侧视'}, {value: 'top', label: '俯视'}], view,
        v => $(`[data-view="${v}"]`)?.click(), '视角');
      c.tool('方向参照', on => { if (EL.axes && EL.axes.checked !== on) EL.axes.click(); }, EL.axes ? EL.axes.checked : true);
      // 时间轴和关键片段放进底栏（随工位停放，原程序照常读写）
      const stage = document.querySelector('.c2-stage'), strip = document.querySelector('.c2-strip');
      if (stage && strip && band.parentNode !== stage) stage.insertBefore(band, strip);
      c.stripAdopt([EL.timeline, EL.phases].filter(Boolean));
      // 原页面的提示条（减少动态）转成外壳提示
      const toast = $('#toast');
      if (toast && !toast.dataset.c41) {
        toast.dataset.c41 = '1';
        new MutationObserver(() => { if (!toast.hidden && toast.textContent.trim()) { window.c2Lab?.ctx?.feedback(toast.textContent.trim(), 'info'); toast.hidden = true; } })
          .observe(toast, {attributes: true, childList: true, characterData: true, subtree: true});
      }
    },
  });
})();

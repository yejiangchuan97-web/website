/* 任务 3-1 机器人构型与工作空间 —— 原页面的三维与控件保持不变，搬进统一外壳；四个活动成为四个工位。 */
(() => {
  'use strict';
  const {$, all} = C3Shell;
  const lab = () => window.configLab;
  // 换工位时控件会被放回停放处，所以先把要用的元素一次取好
  const EL = {
    jointTop: $('.pendant .joint-top'), rows: $('#jointRows'), tour: $('#tour'), stop: $('#stop'),
    ranges: all('.pendant .range-control'), target: $('.target-panel'), space: $('.space-info'),
    rigs: $('.constraint-cards'), paths: $('.path-controls'), obstacles: $('.obstacle-editor'),
  };
  // 面板里已有小标题，原控件里重复的标题收起来
  EL.target?.firstElementChild?.setAttribute('hidden', '');
  $('#spaceType')?.setAttribute('hidden', '');
  const seen = {types: new Set(), rigs: new Set()};
  let toured = false, directPlayed = false, detourPlayed = false;
  EL.tour?.addEventListener('click', () => { toured = true; });
  $('#playDirect')?.addEventListener('click', () => { directPlayed = true; });
  $('#playDetour')?.addEventListener('click', () => { detourPlayed = true; });
  // 原页面换构型时会自动回到“构型与连接”；在“空间边界”“路径与障碍”里换构型时留在原工位
  $('#typePicker')?.addEventListener('click', e => {
    if (!e.target.closest('[data-type]')) return;
    const keep = lab()?.getState().activity;
    if (keep === 'space' || keep === 'paths') setTimeout(() => lab()?.selectActivity(keep), 0);
  }, true);

  function stopRow(c, group) {
    const stop = c.adopt(EL.stop, group); stop?.classList.add('c3-stop');
  }

  const STATIONS = [
    {
      id: 'constraints', name: '自由度实验', lead: '在上方选一种连接，再拖动刚体，数一数它还剩几种运动方式。',
      build(c) {
        const g = c.section('拖动试试：它还能怎样动');
        c.adopt(EL.rows, g);
        c.challenges([
          {id: 'free', icon: '🧊', title: '自由刚体', hint: '不加任何约束', check: s => seen.rigs.has('free'),
            result: '空中的刚体能沿三个方向平移、绕三个轴转动：6 个自由度。'},
          {id: 'hinge', icon: '🚪', title: '合页门', hint: '只剩下什么运动？', check: s => seen.rigs.has('hinge'),
            result: '合页只允许绕合页轴转动：1 个自由度。'},
          {id: 'slide', icon: '🗄', title: '导轨抽屉', hint: '它往哪个方向走？', check: s => seen.rigs.has('slide'),
            result: '导轨只允许沿导轨平移：1 个自由度。'},
          {id: 'fixed', icon: '🔩', title: '固定连接', hint: '还能动吗？', check: s => seen.rigs.has('fixed'),
            result: '固定连接与支座相对静止：0 个自由度。底座固定，不等于关节没有自由度。'},
        ]);
      },
    },
    {
      id: 'anatomy', name: '构型与连接', lead: '在上方选一种构型，一个关节一个关节地动，看它靠哪种关节运动。',
      build(c) {
        const g = c.section('点动关节');
        c.adopt([EL.jointTop, EL.rows], g);
        const tour = c.adopt(EL.tour, g);
        if (tour) tour.textContent = '▷ 逐轴运动演示';
        stopRow(c, g);
        c.challenges([
          {id: 'types', icon: '🔁', title: '换 3 种构型看看', hint: '在画面上方选构型', check: s => seen.types.size >= 3,
            result: '直线关节让部件平移，转动关节让部件绕轴转：连接方式不同，动起来就不同。'},
          {id: 'tour', icon: '▶', title: '看一遍逐轴演示', hint: '一次只动一个关节', check: () => toured,
            result: '每个关节只负责一个运动量：P 是沿导轨平移，R 是绕轴线转动。'},
          {id: 'lock', icon: '🔒', title: '锁住一个关节', hint: '点关节行右边的锁', check: s => s.locks.some(Boolean),
            result: '锁住一轴，能独立调节的量就少了一个。'},
          {id: 'six', icon: '⑥', title: '点动一下关节型六轴', hint: '选“关节型六轴”，拖一个关节', check: s => s.id === 'articulated' && s.moved,
            result: '关节型六轴全是转动关节，六个量合起来才能同时定位置和姿态。'},
        ]);
      },
    },
    {
      id: 'space', name: '空间边界', lead: '机器人能到的地方有边界。打开画面里的“工作空间”，再缩行程、换工具、试目标点。',
      build(c) {
        const g = c.section('行程与工具');
        const pair = c.h('div', 'c2-grid2'); g.append(pair);
        c.adopt(EL.ranges, pair);
        const g2 = c.section('试一个目标点：能不能到？');
        c.adopt(EL.target, g2);
        c.challenges([
          {id: 'shrink', icon: '📏', title: '行程缩到 60% 以下', hint: '拖“行程”滑块', check: s => s.scale <= 0.6,
            result: '行程变小，能到的范围跟着缩小。'},
          {id: 'tool', icon: '🔧', title: '换一个更长的工具', hint: '工具长度调到 120 以上', check: s => s.length >= 120,
            result: '工具变长，工作点跟着外移，边界也就变了。'},
          {id: 'out', icon: '🎯', title: '试一个够不着的点', hint: '按“超出范围”或自己填', check: s => s.reachMiss,
            result: '目标点在边界外，关节怎么转都到不了。'},
        ]);
      },
    },
    {
      id: 'paths', name: '路径与障碍', lead: '能到终点，不等于能走过去。同一起终点，比一比直连和绕行。',
      build(c) {
        const g = c.section('起点到终点');
        c.adopt(EL.paths, g);
        const g2 = c.section('挪动障碍');
        c.adopt(EL.obstacles, g2);
        c.challenges([
          {id: 'load', icon: '📥', title: '载入对照', hint: '先载入起点和终点', check: s => s.route != null,
            result: '起点、终点都能到——这只说明“能到”，还没说明“能过去”。'},
          {id: 'direct', icon: '⛔', title: '看直连撞上障碍', hint: '播放直接运动', check: s => s.directBlocked,
            result: '关节直接插值时，连杆或工具扫过了障碍，运动被叫停。'},
          {id: 'detour', icon: '✅', title: '让它绕过去', hint: '播放绕行样例', check: s => s.detourOk,
            result: '换一条路线，整台机器人都没碰到障碍，才算真正能通过。'},
          {id: 'move', icon: '🧱', title: '挪动障碍再试', hint: '改障碍的位置或高度', check: s => s.obstacleMoved,
            result: '障碍一变，原来能过的路线可能就不行了——每次都要重新检查。'},
        ]);
      },
    },
  ];

  let q0 = null, obstacle0 = null;
  C3Shell.start({
    task: '3-1', title: '机器人构型与工作空间',
    stage: $('section.stage'),
    stageTop: [$('#typePicker'), EL.rigs],
    stations: STATIONS,
    current: () => lab()?.getState().activity,
    select: id => lab()?.selectActivity(id),
    reset: () => $('#reset')?.click(),
    poll() {
      const s = lab().getState();
      seen.types.add(s.id); if (s.rig) seen.rigs.add(s.rig);
      if (!q0 || q0.id !== s.id) q0 = {id: s.id, q: s.q.slice()};
      const moved = s.q.some((v, i) => Math.abs(v - q0.q[i]) > 1);
      const key = JSON.stringify(s.obstacles.map(o => [o.enabled, o.c, o.size]));
      if (obstacle0 == null) obstacle0 = key;
      const result = $('.path-results')?.textContent || '';
      const directBlocked = directPlayed && /直连[：:][^绕]*(受阻|碰撞|干涉)/.test(result) && !s.moving;
      const detourOk = detourPlayed && /绕行[：:][^直]*通过/.test(result) && !s.moving;
      const targetText = ($('#targetInfo')?.textContent || '') + ($('#toast')?.textContent || '');
      return {...s, moved, directBlocked, detourOk, obstacleMoved: key !== obstacle0, reachMiss: /不可达|够不着|超出|无法到达|不能到达|范围外|没有符合|位置解|无解/.test(targetText)};
    },
    build(c) {
      // 三维区上方：自由度实验选“连接”，其余工位选“构型”（选中的构型在三个工位之间保持不变）
      const picker = $('#typePicker');
      if (picker) picker.hidden = c.station.id === 'constraints';
      if (EL.rigs) EL.rigs.hidden = c.station.id !== 'constraints';
      // 障碍物只属于“路径与障碍”：离开时关掉显示，不带到其他工位
      const obstacles = $('#obstacleToggle');
      if (c.station.id !== 'paths' && obstacles?.classList.contains('active')) obstacles.click();
    },
  });
})();

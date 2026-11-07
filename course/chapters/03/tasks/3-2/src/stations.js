/* 任务 3-2 六轴机械臂与点动示教 —— 原页面的三维与控件保持不变，搬进统一外壳；四个活动成为四个工位。
 * 示教器（参照系、点动方式、J1–J6）每个工位都在；停止按钮和速度放在三维区底栏，随时够得着。
 */
(() => {
  'use strict';
  const {$, all} = C3Shell;
  const lab = () => window.robotLab;
  const EL = {
    stage: $('section.stage-card'),
    frames: $('.control-panel .frame-tabs'), frameText: $('.control-panel .frame-description'), jogMode: $('.control-panel .jog-setting'),
    rows: $('#jogRows'), speed: $('.control-panel .speed-control'), tool: $('.control-panel .tool-control'), notice: $('#notice'), stop: $('#stop'),
    tour: $('#tour'), axisCards: $('#axisCards'),
    compare: $('.comparison'), legend: $('.frame-legend'),
    teach: $('.teach-workspace'),
    challenge: $('.challenge-workspace'),
  };
  $('.control-panel .keyboard-note')?.setAttribute('hidden', '');
  EL.notice?.setAttribute('hidden', '');

  const flags = {tour: false, base: false, tool: false, rotate: false, played: false};
  EL.tour?.addEventListener('click', () => { flags.tour = true; });
  $('#compareBase')?.addEventListener('click', () => { flags.base = true; });
  $('#compareTool')?.addEventListener('click', () => { flags.tool = true; });
  $('#rotateTCP')?.addEventListener('click', () => { flags.rotate = true; });
  $('#play')?.addEventListener('click', () => { flags.played = true; });

  /* 示教器放在三维区底栏，像真的示教器一样分三块：
   * 左：六个轴，每个都有滑轨和 −/+ 点动；
   * 右：参照系（关节 / 基坐标 / 工具坐标，决定左边六格各控制什么），再右是点动方式、速度、停止。 */
  let q0 = null;
  const turned = (s, i, deg) => q0 && Math.abs(s.q[i] - q0[i]) >= deg;

  const STATIONS = [
    {
      id: 'axes', name: '认识六轴', lead: '一次只转一个关节，看哪些部分跟着动。先选参照系，再拖滑轨或按 −/+ 点动。',
      build(c) {
        const g = c.section('六个关节');
        c.adopt(EL.axisCards, g);
        const tour = c.adopt(EL.tour, g); if (tour) tour.textContent = '▷ 六轴巡回演示';
        c.challenges([
          {id: 'tour', icon: '▶', title: '看一遍六轴巡回演示', hint: '六个关节依次转', check: () => flags.tour,
            result: 'J1 带整臂转，J2、J3 摆动大臂小臂，J4—J6 在腕部调整工具朝向。'},
          {id: 'j1', icon: '↻', title: '转动底座 J1', hint: '转 30° 以上', check: s => turned(s, 0, 30),
            result: '底座一转，后面的大臂、小臂、手腕全都跟着转——这就是一条运动链。'},
          {id: 'j3', icon: '💪', title: '抬起小臂 J3', hint: '转 20° 以上', check: s => turned(s, 2, 20),
            result: 'J3 只带动它后面的部分，J1、J2 不受影响。'},
          {id: 'wrist', icon: '✋', title: '只转手腕 J6', hint: '看工具怎么转', check: s => turned(s, 5, 45),
            result: 'J6 只让法兰和工具自转，工具的位置几乎不变，朝向变了。'},
        ]);
      },
    },
    {
      id: 'frames', name: '坐标对照', lead: '同样是“沿 +Z 走”，按基座和按工具，方向可能不一样。',
      build(c) {
        const g = c.section('同一起点，对照两种 +Z');
        c.adopt([EL.compare], g);
        c.challenges([
          {id: 'base', icon: '⬆', title: '沿基座 +Z 走一次', hint: '按“沿基座 +Z 走 40 mm”', check: () => flags.base,
            result: '基坐标固定在底座上，+Z 永远竖直向上。'},
          {id: 'tool', icon: '↗', title: '沿工具 +Z 走一次', hint: '按“沿工具 +Z 走 40 mm”', check: () => flags.tool,
            result: '工具坐标跟着工具走，工具斜着，+Z 就斜着。'},
          {id: 'toolFrame', icon: '🧭', title: '用工具坐标点动', hint: '参照系选“工具坐标”', check: s => s.frame === 'tool' && s.moved,
            result: '对准工件时用工具坐标更顺手：前后左右都按工具自己的方向。'},
          {id: 'rotate', icon: '🔄', title: '工具点不动，只改朝向', hint: '试“保持 TCP 改朝向”', check: () => flags.rotate,
            result: '六个关节一起配合，可以只改工具朝向，而工作点停在原处。'},
        ]);
      },
    },
    {
      id: 'teach', name: '示教与搬运', lead: '先带它走一遍、记下几个点；再用点动和夹爪把工件搬到落料区。',
      build(c) {
        const g = c.section('示教：记录与回放');
        c.adopt(EL.teach, g);
        const g2 = c.section('搬运：工件与落料区');
        c.adopt([EL.challenge, EL.tool], g2);
        c.challenges([
          {id: 'one', icon: '📍', title: '记下示教点', hint: '点动后按“记录当前点”', check: s => s.points.length >= 2,
            result: '示教点记下的是六个关节的角度，还有工具和夹爪的状态。'},
          {id: 'play', icon: '▶', title: '让它自己回放', hint: '按“回放”', check: s => flags.played && s.moving,
            result: 'PTP 回放是关节一起转到下一个点，工具走的不一定是直线。'},
          {id: 'grab', icon: '✊', title: '抓起工件', hint: '先开始挑战，离工件 18 mm 内合上夹爪', check: s => s.holding,
            result: '抓住了！移动时工件跟着夹爪走。'},
          {id: 'place', icon: '📦', title: '放到落料区', hint: '低位对准中心，再张开', check: s => s.challenge.score >= 1,
            result: '放好了。把这几个姿态记成示教点，下次它就能自己搬。'},
        ]);
      },
    },
  ];

  let lastNotice = '';
  C3Shell.start({
    task: '3-2', title: '六轴机械臂与点动示教',
    stage: EL.stage,
    stations: STATIONS,
    // 原页面的“示教与回放”“搬运挑战”合成一个工位，用搬运挑战的场景（有工件和落料区）
    current: () => { const a = $('.learning-nav .active')?.dataset.activity; return a === 'challenge' ? 'teach' : a; },
    select: id => $(`.learning-nav [data-activity="${id === 'teach' ? 'challenge' : id}"]`)?.click(),
    reset: () => $('#home')?.click(),
    poll() {
      const s = lab().getState();
      if (!q0) q0 = s.q.slice();
      const moved = s.q.some((v, i) => Math.abs(v - q0[i]) > 1);
      return {...s, moved};
    },
    build(c) {
      // 参照系很重要：放在面板最上面，紧接着就是它控制的六格（J1–J6 或 X/Y/Z/Rx/Ry/Rz）
      const g = c.section('参照系：下面六格按什么方向动');
      c.adopt([EL.frames, EL.frameText], g);
      const g2 = c.section('点动：拖滑轨或按 −/+');
      const pad = c.h('div', 'c3-pendant c3-in-panel'); g2.append(pad);
      c.adopt([EL.jogMode, EL.rows], pad);
      const foot = c.h('div', 'c3-jog-foot'); pad.append(foot);
      c.adopt([EL.speed, EL.stop], foot);
      c.body.prepend(g, g2);
      const notice = EL.notice?.textContent.trim() || '';
      lastNotice = notice;
      c.lab.onState(() => {
        const text = EL.notice?.textContent.trim() || '';
        if (text && text !== lastNotice) { lastNotice = text; c.feedback(text, /限位|停止|不能|无法|超出|碰撞/.test(text) ? 'warn' : 'info'); }
      });
    },
  });
})();

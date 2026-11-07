/* 任务 3-5 移动底盘与行走机构 —— 原页面的三维与控件保持不变，搬进统一外壳；三个页签成为三个工位。
 * 底盘/行走方式的选择放在三维区上方（选研究对象，和 3-1 选构型同一位置），面板里是原有的操纵、观察和闯关控件。
 */
(() => {
  'use strict';
  const {$, all} = C3Shell;
  const lab = () => window.mobileLab;
  const EL = {
    stage: $('.workspace > .stage'),
    wheelPicker: $('#drivePanel .platform-picker'), terrainPicker: $('#terrainPanel .platform-picker'),
    drive: [$('#drivePanel .control-card'), $('#drivePanel .prediction-card'), $('#drivePanel .manual-controls')],
    terrain: [$('#terrainPanel .timeline-card'), $('#terrainPanel .evidence-card')],
    game: [...($('#gamePanel')?.children || [])],
    notice: $('#notice'),
  };
  // 外壳里已有工位名和挑战卡：原来的导语、“去闯关/回到轮式”链接收起；手动驾驶盘直接展开
  for (const e of all('.learning-intro, .learning-note, #enterGame, #backToWheels')) e.setAttribute('hidden', '');
  for (const d of all('.manual-controls, .route-details')) d.open = true;

  const seen = {wheels: new Set(), terrain: new Set()};
  let strafed = false, spun = false, experimented = false, stepped = new Set();
  $('#terrainStep')?.addEventListener('click', () => stepped.add(lab()?.getState().type));
  const records = () => { try { return JSON.parse(localStorage.getItem('mobile-course-v2') || '{}'); } catch { return {}; } };
  const wonCount = () => {
    const r = records(), list = Array.isArray(r) ? r : Object.values(r.best || r.levels || r.stars || r);
    return list.filter(v => (typeof v === 'number' ? v : v?.stars) > 0).length;
  };

  const STATIONS = [
    {
      id: 'drive', name: '轮式操纵', lead: '在上方选一种轮式底盘，调轮速和转角，看它怎样转弯、横移、原地转。',
      build(c) {
        const g = c.section('操纵');
        c.adopt(EL.drive[0], g);
        const g2 = c.section('先预测，再验证');
        c.adopt(EL.drive[1], g2);
        const g3 = c.section('手动驾驶');
        c.adopt(EL.drive[2], g3);
        c.challenges([
          {id: 'three', icon: '🚗', title: '三种底盘都开一开', hint: '差速、转向轮、麦克纳姆', check: () => seen.wheels.size >= 3,
            result: '同样往前走，三种底盘转弯的办法完全不同。'},
          {id: 'spin', icon: '🔄', title: '原地转一圈', hint: '差速或麦克纳姆能做到', check: () => spun,
            result: '两侧轮子反向转，车身就原地打转——转向轮底盘做不到。'},
          {id: 'strafe', icon: '↔', title: '让它横着走', hint: '换麦克纳姆轮试试', check: () => strafed,
            result: '麦克纳姆轮的 45° 滚子把力分到侧面，车头不转也能横移。'},
          {id: 'predict', icon: '🎯', title: '做一个预测实验', hint: '先选预测，再运行', check: () => experimented,
            result: '先想后试：结果和预测不一样时，正是弄懂机构的时候。'},
        ]);
      },
    },
    {
      id: 'terrain', name: '行走方式', lead: '在上方选履带、四足或轨道，一步步看它怎样接地、怎样迈步。',
      build(c) {
        const g = c.section('动作分解');
        c.adopt(EL.terrain[0], g);
        const g2 = c.section('接地观察');
        c.adopt(EL.terrain[1], g2);
        c.challenges([
          {id: 'track', icon: '🛞', title: '一步步看履带', hint: '选履带，按单步', check: () => stepped.has('track'),
            result: '履带贴地的那一段不打滑，回程段从上方绕回来。'},
          {id: 'legs', icon: '🦿', title: '一步步看四足', hint: '选四足，按单步', check: () => stepped.has('legs'),
            result: '总有几条腿撑着地，另外几条抬起换位——这就是步态。'},
          {id: 'rail', icon: '🚆', title: '试试轨道能不能侧移', hint: '选轨道，打开侧移试验', check: s => s.type === 'rail' && s.railProbe,
            result: '轮缘卡在轨道上，横向一点也走不动：轨道限定了路线。'},
        ]);
      },
    },
    {
      id: 'game', name: '驾驶闯关', lead: '把机构特点用起来：通过检查点、窄道，停进车位，必要时倒车。',
      build(c) {
        const g = c.section('选关、驾驶、看记录');
        c.adopt(EL.game, g);
        c.challenges([
          {id: 'win', icon: '🏁', title: '通过一关', hint: '选一关，开始驾驶', check: s => s.game.status === 'won' || wonCount() >= 1,
            result: '过关了！停靠要同时满足位置、朝向和停稳。'},
          {id: 'stars', icon: '⭐', title: '拿到 3 星', hint: '少碰撞、路线紧凑', check: s => (s.game.status === 'won' && s.game.stars >= 3),
            result: '三星：不碰撞、少绕路——这正是现场驾驶要的。'},
          {id: 'three', icon: '🗺', title: '通过 3 关', hint: '一关比一关难', check: () => wonCount() >= 3,
            result: '窄道、换道、倒车——机构的特点决定了怎么开。'},
        ]);
      },
    },
  ];

  let lastNotice = '';
  C3Shell.start({
    task: '3-5', title: '移动底盘与行走机构',
    stage: EL.stage,
    stageTop: [EL.wheelPicker, EL.terrainPicker],
    stations: STATIONS,
    current: () => lab()?.getState().tab,
    select: id => lab()?.switchTab(id),
    poll() {
      const s = lab().getState(), cmd = s.command || {};
      if (s.tab === 'drive') seen.wheels.add(s.type); else if (s.tab === 'terrain') seen.terrain.add(s.type);
      const turning = Math.abs(cmd.w) > 0.05 || (s.type === 'diff' && Math.sign(cmd.left) !== Math.sign(cmd.right) && Math.abs(cmd.left) > 0.01);
      if (turning && Math.abs(cmd.vx) < 0.02 && Math.abs(cmd.vy) < 0.02 && s.type !== 'car') spun = true;
      if (s.type === 'mecanum' && Math.abs(cmd.vy) > 0.02) strafed = true;
      if (s.experiment && s.experiment.status !== 'idle' && s.experiment.choice != null) experimented = true;
      return s;
    },
    build(c) {
      if (EL.wheelPicker) EL.wheelPicker.hidden = c.station.id !== 'drive';
      if (EL.terrainPicker) EL.terrainPicker.hidden = c.station.id !== 'terrain';
      lastNotice = EL.notice?.textContent.trim() || '';
      c.lab.onState(() => {
        const t = EL.notice?.textContent.trim() || '';
        if (t && t !== lastNotice) { lastNotice = t; c.feedback(t, /碰|撞|超|失败|不/.test(t) ? 'warn' : 'info'); }
      });
    },
  });
})();

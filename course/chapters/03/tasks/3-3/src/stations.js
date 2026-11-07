/* 任务 3-3 关节传动（减速器 reducers.html / 运动转换 conversion.html）——原页面的三维与控件保持不变，搬进统一外壳。
 * 每种机构是一个工位；页面原有的三关挑战（谁被固定 / 转一圈 / 停到目标）直接做成“试一试”卡片，完成记录沿用原页面。
 */
(() => {
  'use strict';
  const {$, all} = C3Shell;
  const lab = () => window.MechanismLab;
  const page = (window.CHAPTER_LAYOUT || {}).page === 'conversion' ? 'conversion' : 'reducers';
  const EL = {
    stage: $('figure.figure'),
    readouts: $('.readouts'), transport: $('.transport'),
    dials: $('.observation .dial-pair'), turns: $('.observation .input-progress'), rows: $('#motionRows'), equation: $('#equation'),
    experiment: $('.experiment'), legend: $('.legend'),
    mission: $('#challengeDetails .mission'),
  };
  // 外壳里已有工位条和挑战卡：原来的关卡页签、折叠标题收起
  $('#missiontabs')?.setAttribute('hidden', '');
  $('#levelTag')?.setAttribute('hidden', '');
  $('.experiment .section-label')?.setAttribute('hidden', '');

  const MODES = page === 'reducers'
    ? [{id: 'planet', name: '行星减速器', lead: '太阳轮转进去，行星架慢慢转出来。找出谁固定、谁输出、转一圈剩多少。'},
       {id: 'harmonic', name: '谐波减速器', lead: '波发生器转一圈，柔轮只退后两齿——减速比可以非常大。'}]
    : [{id: 'screw', name: '丝杠 · 钻孔定位', lead: '钻孔机器人：丝杠转，螺母带着钻头一点点走，对准墙板上的孔位。'},
       {id: 'rack', name: '齿条 · 送料滑台', lead: '送料滑台：齿轮转，齿条托着砖走得又快又远，送到机器人抓取位。'},
       {id: 'crank', name: '曲柄 · 往复锯', lead: '往复锯：电机一直同向转，锯条在砌块的锯缝里来回拉。'}];
  // 机器人里怎么选：三种转换机构放在一起比，当前这一种高亮
  const PICK = [
    {id: 'screw', name: '丝杠', good: '一圈走得少，停得准，推不回去', use: '钻孔进给、升降轴'},
    {id: 'rack', name: '齿条', good: '一圈走得多，行程可以很长', use: '送料滑台、机器人地轨'},
    {id: 'crank', name: '曲柄', good: '电机不用反转，自己来回', use: '往复锯、推料、泵'},
  ];
  const TITLES = {
    planet: ['谁被固定住了？', '转一圈，会剩多少？', '停到目标位置'],
    harmonic: ['谁被固定住了？', '找到“退后两齿”', '停到目标位置'],
  };
  const ICONS = ['🔍', '🔄', '🎯'];

  const scores = () => { try { return JSON.parse(localStorage.getItem('mechanism-lab-33-v2') || '{}'); } catch { return {}; } };

  const STATIONS = MODES.map(m => ({
    ...m,
    build(c) {
      if (page === 'reducers') { const g = c.section('观察：输入与输出'); c.adopt([EL.dials, EL.turns], g); }
      let titles = TITLES[m.id];
      if (!titles) { titles = []; for (const i of [2, 1, 0]) { lab()?.level(i); titles[i] = $('#missionTitle')?.textContent || ''; } }
      // 三关排成一行：点卡片就进入那一关，下面是这一关的题目
      const ch = c.challenges([0, 1, 2].map(i => ({
        id: 'm' + i, icon: ICONS[i], title: titles[i] || `第 ${i + 1} 关`,
        check: () => Boolean(scores()[m.id]?.[i]),
      })), '试一试：三关挑战');
      ch.section.classList.add('c3-levels');
      ch.section.querySelectorAll('.c2-challenge').forEach((li, i) => {
        li.tabIndex = 0; li.setAttribute('role', 'button');
        const go = () => { lab()?.level(i); mark(); };
        li.addEventListener('click', go);
        li.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      });
      c.adopt(EL.mission, ch.section);
      const g2 = c.section('每个零件转了多少');
      c.adopt([EL.rows, EL.equation], g2);
      const g3 = c.section('做实验');
      c.adopt(EL.experiment, g3);
      if (page === 'conversion') {
        const gp = c.section('机器人里为什么选它');
        const t = c.h('div', 'c3-pick'); gp.append(t);
        for (const p of PICK) {
          const row = c.h('div', 'c3-pick-row' + (p.id === m.id ? ' on' : ''));
          row.innerHTML = `<b>${p.name}</b><span>${p.good}</span><em>${p.use}</em>`;
          t.append(row);
        }
      }
      const g4 = c.section('零件：点名称看位置');
      c.adopt(EL.legend, g4);
      // 当前关卡的卡片加框
      const mark = () => {
        const lv = lab()?.state.level ?? 0;
        ch.section.querySelectorAll('.c2-challenge').forEach((li, i) => li.classList.toggle('c3-current', i === lv));
      };
      c.lab.onState(mark); mark();
    },
  }));

  C3Shell.start({
    task: '3-3', title: page === 'reducers' ? '关节传动 · 减速器' : '关节传动 · 运动转换',
    stage: EL.stage,
    stations: STATIONS,
    current: () => lab()?.state.mode,
    select: id => $(`#modules [data-mode="${id}"]`)?.click(),
    reset: () => $('#reset')?.click(),
    poll: () => ({...lab().state}),
    build(c) { c.stripAdopt([EL.transport, EL.readouts].filter(Boolean)); },
  });
})();

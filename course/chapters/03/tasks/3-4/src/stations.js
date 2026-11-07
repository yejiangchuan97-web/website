/* 任务 3-4 末端执行器与 TCP —— 原页面的三维与控件保持不变，搬进统一外壳；四个任务页签成为四个工位。
 * 工具柜放在三维区上方（选研究对象，和 3-1 选构型同一位置）；每个工位面板就是原页面对应的操作区。
 */
(() => {
  'use strict';
  const {$} = C3Shell;
  const lab = () => window.toolLab;
  const EL = {
    stage: $('.lab-centre .stage'), tools: $('#toolPicker'),
    panels: {tools: $('#toolsPanel'), pivot: $('#pivotPanel'), calibrate: $('#calibratePanel'), challenge: $('#challengePanel')},
    stop: $('#stop'), notice: $('#notice'),
  };
  // 外壳里已有工位名和挑战卡：原面板标题、进度徽章、讲解卡、“下一关”按钮收起
  for (const sel of ['.control-panel .panel-heading', '#enterPivot', '.insight-card']) $(sel)?.setAttribute('hidden', '');
  const flags = {find: false, actuate: false};
  $('#findTCP')?.addEventListener('click', () => { flags.find = true; });
  $('#actuate')?.addEventListener('click', () => { flags.actuate = true; });
  const pivotSeen = new Set();

  const STATIONS = [
    {
      id: 'tools', name: '工具换装', lead: '在上方选一种工具装上，找到它真正干活的那一点（TCP）。',
      challenges: [
        {id: 'explore', icon: '🧰', title: '换 3 种工具', hint: '在上方工具柜里点', check: s => s.explored.length >= 3,
          result: '不同工具的工作点在不同位置：喷枪在喷嘴口，夹爪在两指中间。'},
        {id: 'find', icon: '🎯', title: '找到工作点', hint: '按“这个点在哪”', check: () => flags.find,
          result: '绿色点就是 TCP——机器人说“走到某处”，指的是这个点走过去。'},
        {id: 'act', icon: '⚡', title: '让工具干一次活', hint: '按“开始喷涂”这类动作键', check: () => flags.actuate,
          result: '工具动作和工具参数是两件事：换了工具，参数也要跟着换。'},
      ],
    },
    {
      id: 'pivot', name: '理解 TCP', lead: '同样转一个角度，绕法兰转和绕 TCP 转，尖端走的路完全不同。',
      challenges: [
        {id: 'tcp', icon: '📍', title: '绕 TCP 转一次', hint: '选“绕 TCP”，拖角度或播放', check: () => pivotSeen.has('tcp'),
          result: '绕 TCP 转：尖端停在原地，只是朝向变了。'},
        {id: 'flange', icon: '🔩', title: '再绕法兰转一次', hint: '选“绕法兰”，对比尖端', check: () => pivotSeen.has('flange'),
          result: '绕法兰转：尖端划出一段弧——参照点选错，工具就会偏。'},
        {id: 'param', icon: '🛠', title: '用对工具参数', hint: '参数要和装上的工具一致', check: s => s.done.includes('pivot'),
          result: '参数和工具对上，姿态再怎么变，工作点都不会跑。'},
      ],
    },
    {
      id: 'calibrate', name: '四点标定', lead: '让工具尖端从四个不同姿态碰同一个针尖，算出 TCP 在哪。',
      challenges: [
        {id: 'one', icon: '1️⃣', title: '采集第一个点', hint: '对准针尖，再采集', check: s => s.samples.filter(Boolean).length >= 1,
          result: '记下的是这一刻法兰的位置和姿态。'},
        {id: 'four', icon: '4️⃣', title: '四个姿态都采齐', hint: '每个姿态都要不同', check: s => s.samples.filter(Boolean).length >= 4,
          result: '四个不同姿态指向同一点，才能把 TCP 的位置解出来。'},
        {id: 'solve', icon: '🧮', title: '算出 TCP', hint: '按“计算”', check: s => s.result != null,
          result: '算出来的偏移，就是 TCP 相对法兰的位置。'},
        {id: 'check', icon: '✅', title: '换个姿态复核通过', hint: '按“复核”', check: s => s.done.includes('calibrate'),
          result: '用没参与计算的第五个姿态检验，误差小才算标定成功。'},
      ],
    },
    {
      id: 'challenge', name: '实战闯关', lead: '喷枪换成夹爪，参数却没改——找出错在哪，修好它。',
      challenges: [
        {id: 'start', icon: '🚩', title: '开始闯关', hint: '按“开始闯关”', check: s => s.challenge !== 'idle',
          result: '工作点对不上了。先别急着动，想想是哪里出了问题。'},
        {id: 'answer', icon: '🤔', title: '找出原因', hint: '在三个原因里选', check: s => s.answer === 'tcp',
          result: '对：换了工具，TCP 参数还是旧的。'},
        {id: 'repair', icon: '🔧', title: '修好并复核', hint: '按“修复参数”', check: s => s.challenge === 'passed',
          result: '参数修好，新姿态复核通过——这就是现场换工具后必须做的事。'},
      ],
    },
  ].map(st => ({
    ...st,
    build(c) {
      c.adopt(EL.panels[st.id]);
      const g = c.section('');
      c.adopt(EL.stop, g); EL.stop?.classList.add('c3-stop');
      c.challenges(st.challenges);
    },
  }));

  let lastNotice = '';
  C3Shell.start({
    task: '3-4', title: '末端执行器与 TCP',
    stage: EL.stage,
    stageTop: EL.tools,
    stations: STATIONS,
    current: () => lab()?.getState().tab,
    select: id => lab()?.switchTab(id),
    poll() {
      const s = lab().getState();
      if (s.playing || Math.abs(s.angle) > 1) pivotSeen.add(s.pivot);
      return s;
    },
    build(c) {
      lastNotice = EL.notice?.textContent.trim() || '';
      c.lab.onState(() => {
        const t = EL.notice?.textContent.trim() || '';
        if (t && t !== lastNotice) { lastNotice = t; c.feedback(t, /不|错|停|超|偏/.test(t) ? 'warn' : 'info'); }
      });
    },
  });
})();

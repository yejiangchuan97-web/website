/* 任务 7-1 桥梁巡检机器人 —— 原页面的三维桥梁、三台机器人和巡检流程保持不变，搬进统一外壳。
 * 原页面的四个步骤（看现场 / 走到位 / 看清楚 / 留记录）就是四个工位；
 * A / B / C 三个检查点是“选研究对象”，放在三维区上方。面板里是原页面各步骤自己的控件（#controlPanel 由原程序渲染）。
 */
(() => {
  'use strict';
  const {$, all} = NativeShell;
  const lab = () => window.inspectionLab;
  const EL = {
    stage: $('.scene-area'),
    points: $('#pointList'),
    panel: $('#controlPanel'),
    feedback: $('#feedback'),
    toast: $('#sceneToast'),
    explode: $('#explodeButton'),
  };
  // 原页面的提示气泡改由外壳提示条显示
  EL.toast?.classList.add('c7-muted-toast');

  /* —— 挑战用到的事件标记（只记“做过没有”，判定都来自原页面的状态） —— */
  const fresh = () => ({
    survey: {seen: new Set(), target: false, exploded: false, part: false},
    travel: {wheelStopped: false},
    capture: {retake: false, lampOk: false},
    record: {wrong: false},
  });
  let flags = fresh();
  document.addEventListener('click', e => {
    const b = e.target.closest?.('button');
    if (!b) return;
    if (b.dataset.part !== undefined) flags.survey.part = true;
    if (b.id === 'saveRecordButton') {
      const m = lab()?.model.MISSIONS.find(x => x.id === lab().state.mission), o = $('#observation')?.value, d = $('#disposition')?.value;
      if (m && ((o && o !== m.observation) || (d && d !== m.disposition))) flags.record.wrong = true;
    }
  }, true);

  const photos = s => Object.values(s.entries).flatMap(e => e.photos);
  const STATIONS = [
    {
      id: 'survey', name: '看现场', lead: '在上方点 A / B / C，转一转全桥，看清三处检查点和三台机器人。',
      build(c) {
        c.adopt(EL.panel, c.section('本次委托'));
        c.challenges([
          {id: 'three', icon: '🗺', title: '三处都点一点', hint: '上方切换 A / B / C', check: () => flags.survey.seen.size >= 3,
            result: '桥面、桥台、钢梁在同一座桥上，但到达条件完全不同。'},
          {id: 'target', icon: '🔍', title: '飞到检查部位', hint: '左上角“检查部位”', check: () => flags.survey.target,
            result: '先看清要查的部位，才知道该派哪台机器人、拍什么。'},
          {id: 'explode', icon: '🧩', title: '拆开一台机器人', hint: '左上角“拆开机体”', check: () => flags.survey.exploded,
            result: '外壳里是电池和控制板，它们给驱动和相机供电、协调动作。'},
          {id: 'part', icon: '📷', title: '认一个部件', hint: '左上角“展示相关部件”', check: () => flags.survey.part,
            result: '三台机器人都带巡检相机；不同的是让它到位的行走机构。'},
        ]);
      },
    },
    {
      id: 'travel', name: '走到位', lead: '选一台机器人，按住前进或沿路线行进，看它能不能走到检查点。',
      build(c) {
        c.adopt(EL.panel, c.section('平台与行进'));
        c.challenges([
          {id: 'road', icon: '🛣', title: '开到桥面排水口', hint: '选 A，沿路线行进', check: s => s.entries.road.arrived,
            result: '平顺桥面上，轮式平台走得又快又稳。'},
          {id: 'stuck', icon: '🚧', title: '让轮式车去爬台阶', hint: '选 B，换成轮式试试', check: () => flags.travel.wheelStopped,
            result: '轮子在台阶前停住了：地形决定能用哪种平台。'},
          {id: 'stairs', icon: '🦿', title: '四足走上桥台', hint: '选 B，用四足平台', check: s => s.entries.stairs.arrived && s.entries.stairs.robot === 'dog',
            result: '四条腿交替抬起、落在踏步上，台阶就能过去。'},
          {id: 'wall', icon: '🧲', title: '爬壁机爬上钢梁', hint: '选 C，先做两项确认', check: s => s.entries.wall.arrived,
            result: '先确认能磁吸、系好防坠绳，爬壁机才可以上钢梁。'},
        ]);
      },
    },
    {
      id: 'capture', name: '看清楚', lead: '停稳、对准，先拍能定位的全景，再拍看清现象的近景。',
      build(c) {
        c.adopt(EL.panel, c.section('机器人相机'));
        c.challenges([
          {id: 'wide', icon: '🏞', title: '拍一张合格全景', hint: '到位后选“全景”', check: s => photos(s).some(p => p.valid && p.mode === 'wide'),
            result: '全景交代“在哪里”，以后复查才找得回同一个位置。'},
          {id: 'detail', icon: '🔎', title: '拍一张合格近景', hint: '切到“近景”再拍', check: s => photos(s).some(p => p.valid && p.mode === 'detail'),
            result: '近景交代“看到了什么”，现象要在画面里够大、够清楚。'},
          {id: 'retake', icon: '↩', title: '拍出一张要重拍的', hint: '偏一偏镜头或不补光', check: s => photos(s).some(p => !p.valid),
            result: '不合格的照片也会留下编号，重拍不会覆盖旧证据。'},
          {id: 'lamp', icon: '💡', title: '暗处补光拍清楚', hint: '桥台或钢梁，打开补光', check: s => photos(s).some(p => p.valid && p.camera?.lamp),
            result: '桥下光线暗，补光以后画面才能当证据用。'},
        ]);
      },
    },
    {
      id: 'record', name: '留记录', lead: '把照片能说明的现象写下来，安排后续，再回到原点复查。',
      build(c) {
        c.adopt(EL.panel, c.section('巡检记录'));
        c.challenges([
          {id: 'saved', icon: '📝', title: '登记一条记录', hint: '两张合格照片后登记', check: s => Object.values(s.entries).some(e => e.record),
            result: '记录里有位置、两张照片和处置安排，下一个人能接着做。'},
          {id: 'wrong', icon: '⚠', title: '试试把话说过头', hint: '选一个“已确定……”', check: () => flags.record.wrong,
            result: '照片只能证明看得见的现象，原因和安全结论要靠专业复核。'},
          {id: 'follow', icon: '🔁', title: '完成一次同点复查', hint: '登记后回原点复拍', check: s => Object.values(s.entries).some(e => e.follow),
            result: '同一位置前后两张照片一对比，才知道问题有没有解决。'},
          {id: 'all', icon: '📋', title: '三处都复查完', hint: 'A / B / C 都走一遍', check: s => lab().model.summary(s).allComplete,
            result: '流程走完不等于问题都解决了：两处还要继续跟踪或复核。'},
        ]);
      },
    },
  ];

  // 在上方换检查点时留在当前工位（原页面会跳回“看现场”或“看清楚”）
  let lastMission = null, lastStage = null;
  const current = () => {
    const l = lab(); if (!l) return null;
    const s = l.state;
    if (lastMission && s.mission !== lastMission && s.stage !== lastStage && lastStage) l.changeStage(lastStage);
    lastMission = s.mission; lastStage = s.stage;
    return s.stage;
  };

  let lastNotice = '';
  NativeShell.start({
    task: '7-1', title: '桥梁巡检机器人',
    stage: EL.stage,
    stageTop: [EL.points],
    stations: STATIONS,
    hint: '拖动旋转 · 滚轮缩放 · 点 A / B / C 选点',
    current,
    select: id => { const l = lab(); if (l && l.state.stage !== id) l.changeStage(id); lastStage = id; },
    poll() {
      const s = lab().state, e = s.entries[s.mission];
      flags.survey.seen.add(s.mission);
      if ($('.view-tools [data-view="target"][aria-pressed="true"]')) flags.survey.target = true;
      if (EL.explode?.getAttribute('aria-pressed') === 'true') flags.survey.exploded = true;
      if (s.mission === 'stairs' && e.robot === 'wheel' && e.blocked && !e.arrived) flags.travel.wheelStopped = true;
      return s;
    },
    reset(id) {
      lab()?.reset();
      flags[id] = fresh()[id];
      lastMission = 'road';
      lab()?.changeStage(id); lastStage = id;
    },
    build(c) {
      lastNotice = EL.feedback?.textContent.trim() || '';
      c.lab.onState(() => {
        const t = EL.feedback?.textContent.trim() || '';
        if (t && t !== lastNotice) { lastNotice = t; c.feedback(t, EL.feedback.dataset.kind === 'warn' ? 'warn' : EL.feedback.dataset.kind === 'success' ? 'ok' : 'info'); }
      });
    },
  });
})();

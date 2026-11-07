/* 任务 8-2 保养排查 —— 统一任务页外壳。四个工位：前两个（点检、润滑）结构对称，后两个（喷涂管路、砂浆管道清洗）结构对称：
 * 三维区上方选情境；三维区底部四格读数；面板依次是 维护流程（准备、隔离、能量确认、逐点检查、资料与材料、处理、复查/移交）→ 试一试 → 交接记录。
 * 所有操作都交给 window.MaintLab.dispatch（src/app.js），状态与存储（localStorage course-maintenance-v2）都在那里。
 */
(() => {
  'use strict';
  const S = window.NativeShell, lab = window.MaintLab, M = window.MaintModel;
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const btn = (cls, text, fn) => { const b = h('button', cls, text); b.type = 'button'; if (fn) b.addEventListener('click', fn); return b; };

  const SPEC = {
    engine: {
      normal: ['🛢', '完成一次班后点检', '选“班后点检”，走完流程再复查', '油位补到刻线之间，复查通过才算完成这一单。'],
      anomaly: ['💧', '发现渗油，停下移交', '选“底部渗油”，看过底部后移交', '有渗漏就不做常规保养，问题原样交给检修。'],
      early: ['🔥', '还烫就开冷却液盖？', '停机后不等冷却，直接点冷却液壶', '机体还烫时冷却系统带压，开盖会喷出热液——先等冷却。'],
      anomalyCases: ['leak', 'belt'], anomalyPoint: 'under',
    },
    excavator: {
      normal: ['🔧', '完成一次班后润滑', '选“班后润滑”，六个点都加注再复查', '每个铰点都有新脂挤出，复查通过才算完成。'],
      anomaly: ['💧', '油缸渗漏，停下移交', '选“动臂油缸渗漏”，看过油缸后移交', '渗漏要检修，加多少润滑脂都盖不住问题。'],
      early: ['⚠', '铲斗悬空就去加注？', '铲斗还没落地时点一个黄油嘴', '铲斗悬在空中，人不能进到工作装置下面——先落地。'],
      anomalyCases: ['seep', 'loose'], anomalyPoint: 'boomRod',
    },
  };

  /* 交接记录（四个工位共用一份） */
  let renderRecords = () => {};
  function recordsSection(c) {
    const count = h('span', 'c2-count');
    const gRec = c.section('交接记录', count);
    const list = h('ul', 'm82-records');
    const tools = h('div', 'm82-rec-tools');
    const bExport = btn('c2-btn c2-small', '导出交接卡', () => lab.exportRecord());
    const bClear = btn('c2-btn c2-small m82-clear', '清空全部记录', () => {
      if (!confirm('清空四个工位的全部处理与交接记录？')) return;
      lab.reset(); c.feedback('记录已清空，四个工位都回到开始。', 'info');
    });
    tools.append(bExport, bClear); gRec.append(list, tools);
    let last = '';
    renderRecords = s => {
      const all = s.records || [], k = JSON.stringify(all); if (k === last) return; last = k;
      count.textContent = `${all.filter(x => x.resolved).length} 复查 · ${all.filter(x => !x.resolved).length} 未解决`;
      list.replaceChildren(...(all.length ? all.slice().reverse().map(x => {
        const li = h('li', x.resolved ? 'ok' : 'open');
        li.append(h('span', 'm82-rec-st', M.STATIONS[x.station].label), h('span', 'm82-rec-case', M.label(M.STATIONS[x.station].cases, x.scenario)), h('b', '', x.resolved ? '已复查' : '未解决'));
        li.title = x.unresolved.join('；'); return li;
      }) : [h('li', 'm82-empty', '还没有记录。复查或移交后会出现在这里。')]));
      bExport.disabled = !all.length;
    };
  }

  const caseBar = h('div', 'm82-cases');
  caseBar.setAttribute('role', 'radiogroup'); caseBar.setAttribute('aria-label', '情境');
  let view = null;

  function buildStation(c) {
    const id = c.station.id, st = M.STATIONS[id], spec = SPEC[id];
    const act = ev => lab.dispatch(ev);

    /* 情境 */
    caseBar.replaceChildren(h('span', 'm82-cases-label', '情境'));
    const caseButtons = st.cases.map(([value, text]) => {
      const b = btn('m82-case', text, () => { if (lab.state().work[id].scenario !== value || closed()) act({type: 'case', value}); });
      b.setAttribute('role', 'radio'); b.dataset.value = value;
      if (value === 'unknown') b.classList.add('unk'); else if (value !== 'normal') b.classList.add('abn');
      caseBar.append(b); return b;
    });
    const closed = () => { const w = lab.state().work[id]; return w.verified || w.handoff; };

    /* 三维区底部读数（与 8-1 同一位置）：四格 */
    const read = c.readouts(id === 'engine'
      ? [{id: 'a', label: '发动机'}, {id: 'b', label: '机体温度', unit: '℃'}, {id: 'c', label: '电源'}, {id: 'd', label: '已检查'}]
      : [{id: 'a', label: '铲斗'}, {id: 'b', label: '液压残压', unit: 'bar'}, {id: 'c', label: '先导锁定'}, {id: 'd', label: '已加注'}]);

    /* 维护流程 */
    const gFlow = c.section('维护流程');
    const flow = h('ol', 'm82-flow'); gFlow.append(flow);
    const step = (text, type) => {
      const li = h('li', 'm82-step'), b = btn('m82-step-btn', null, type ? () => act({type}) : null);
      b.append(h('span', 'm82-dot'), h('span', 'm82-step-text', text)); li.append(b); flow.append(li); return {li, b};
    };
    const sPrep = step(st.steps.prepare, 'prepare');
    const sIso = step(st.steps.isolate, 'isolate');
    const sEnergy = step(st.steps.energy, 'energy');
    const sCheck = step(id === 'engine' ? '逐点检查（点模型上的编号）' : '逐个检查铰点（点模型上的编号）');
    sCheck.b.classList.add('static'); sCheck.b.disabled = true;
    const chips = h('div', 'm82-chips');
    const chipButtons = st.points.map(([p, name], i) => {
      const b = btn('m82-chip', null, () => { const w = lab.state().work[id]; if (w.checked[p] && id === 'excavator' && !w.done[p]) act({type: 'service', point: p}); else if (w.checked[p]) lab.focus(p); else act({type: 'inspect', point: p}); });
      b.dataset.point = p; b.append(h('i', '', String(i + 1)), h('span', '', name)); chips.append(b); return b;
    });
    sCheck.li.append(chips);
    const sRead = step('核对型号与资料', 'read');
    const sMat = step(id === 'engine' ? '选机油' : '选润滑脂');
    sMat.b.classList.add('static'); sMat.b.disabled = true;
    const mats = h('div', 'm82-mats');
    const matButtons = st.materials.map(([value, text]) => { const b = btn('m82-mat' + (value === 'spec' ? ' ok' : ''), text, () => act({type: 'material', value})); b.setAttribute('role', 'radio'); b.dataset.value = value; mats.append(b); return b; });
    sMat.li.append(mats);
    const sService = step(st.service, 'service');
    const pct = h('b', 'm82-pct', '0%'); sService.b.append(pct);
    const bar = h('div', 'm82-bar'), fill = h('span'); bar.append(fill); sService.li.append(bar);
    if (id === 'excavator') sService.li.append(h('p', 'm82-tip', '检查过的黄油嘴再点一次就加注；也可以按这一步，按顺序加注下一个。'));
    const ends = h('li', 'm82-step m82-ends');
    ends.append(btn('c2-btn c2-primary', '复查', () => act({type: 'verify'})), btn('c2-btn m82-hand', '移交检修', () => act({type: 'handoff'})));
    flow.append(ends);
    const verdict = h('div', 'm82-verdict'); verdict.hidden = true; gFlow.append(verdict);

    /* 试一试 */
    const mine = (s, fn) => (s.records || []).some(r => r.station === id && fn(r));
    c.challenges([
      {id: 'normal', icon: spec.normal[0], title: spec.normal[1], hint: spec.normal[2], result: spec.normal[3],
        check: s => mine(s, r => r.scenario === 'normal' && r.resolved)},
      {id: 'anomaly', icon: spec.anomaly[0], title: spec.anomaly[1], hint: spec.anomaly[2], result: spec.anomaly[3],
        check: s => mine(s, r => spec.anomalyCases.includes(r.scenario) && !r.resolved && r.unresolved.some(u => !u.startsWith('未发现')))},
      {id: 'early', icon: spec.early[0], title: spec.early[1], hint: spec.early[2], result: spec.early[3],
        check: s => !!s.tried?.[id]?.early},
      {id: 'unknown', icon: '❓', title: '资料不明时不猜', hint: '选资料不明的情境，核对资料后移交', result: '查不到规格就不补加、不混用，把待确认事项交出去。',
        check: s => mine(s, r => r.scenario === 'unknown' && !r.resolved)},
    ]);

    recordsSection(c);

    c.view('全景', () => lab.frame());
    c.view('俯视', () => lab.top());

    let key = '';
    view = s => {
      const w = s.work[id], r = lab.readouts();
      const k = JSON.stringify([w, s.records, r.temp, r.pressure]);
      if (k === key) return; key = k;
      caseButtons.forEach(b => b.setAttribute('aria-checked', String(b.dataset.value === w.scenario)));
      const nPts = st.points.length, nC = st.points.filter(([p]) => w.checked[p]).length, nD = st.points.filter(([p]) => w.done[p]).length;
      if (id === 'engine') {
        read('a', w.prepared ? '已停机' : '运转中'); read('b', r.temp); read('c', w.isolated ? '断开·挂牌' : '接通'); read('d', nC + ' / ' + nPts);
      } else {
        read('a', w.prepared ? '已落地' : '悬空'); read('b', r.pressure); read('c', w.isolated ? '放下·挂牌' : '未锁定'); read('d', nD + ' / ' + nPts);
      }
      const mark = (s0, done) => s0.li.classList.toggle('done', Boolean(done));
      const nChecked = st.points.filter(([p]) => w.checked[p]).length;
      mark(sPrep, w.prepared); mark(sIso, w.isolated); mark(sEnergy, w.energy);
      mark(sCheck, nChecked === st.points.length); mark(sRead, w.read && w.scenario !== 'unknown');
      sRead.li.classList.toggle('bad', w.read && w.scenario === 'unknown');
      mark(sMat, w.material === 'spec' && w.read && w.scenario !== 'unknown');
      sMat.li.classList.toggle('bad', w.material !== 'spec');
      matButtons.forEach(b => b.setAttribute('aria-checked', String(b.dataset.value === w.material)));
      chipButtons.forEach(b => { const p = b.dataset.point, f = M.finding(id, w.scenario, p); b.dataset.state = w.done[p] ? 'done' : w.checked[p] ? (f.abnormal ? 'bad' : 'ok') : 'todo'; b.title = w.checked[p] ? f.text : '点一下检查'; });
      sCheck.li.classList.toggle('bad', M.abnormal(id, w).length > 0);
      mark(sService, w.progress >= 1);
      fill.style.width = Math.round(w.progress * 100) + '%'; pct.textContent = Math.round(w.progress * 100) + '%';
      const order = [[sPrep, w.prepared], [sIso, w.isolated], [sEnergy, w.energy], [sCheck, nChecked === st.points.length], [sRead, w.read], [sService, w.progress >= 1]];
      const next = (w.verified || w.handoff) ? null : order.find(([, d]) => !d)?.[0];
      for (const [s0] of order) s0.li.classList.toggle('next', s0 === next);
      verdict.hidden = !(w.verified || w.handoff);
      verdict.className = 'm82-verdict ' + (w.verified ? 'ok' : 'warn');
      verdict.textContent = w.verified ? '✓ 复查通过，已记入交接记录' : '⇢ 已移交 · 未解决：' + w.unresolved.join('；');
      renderRecords(s);
    };
    view(lab.state());
    const off = lab.onChange((s, ev) => {
      if (ev?.type === 'station' || ev?.type === 'look') return;
      window.c2Lab?.ctx?._state(s);   // 立即刷新面板，不等 200 ms 轮询
      if (s.message && ev) c.feedback(s.message, s.error ? 'warn' : (ev.type === 'verify' ? 'ok' : 'info'));
    });
    c.onCleanup(off);
    c.lab.onState(s => view(s));
  }

  /* ===================== 清洗工位：喷涂管路、砂浆管道 ===================== */
  const FLUSH = {
    spray: {
      read: [{id: 'a', label: '喷涂泵'}, {id: 'b', label: '压力表', unit: '格·示意'}, {id: 'c', label: '样杯'}, {id: 'd', label: '已洗件'}],
      cards: [
        {id: 'cup', icon: '🥛', title: '样杯出液变清', hint: '冲洗时盯着样杯，变清了再停泵', result: '出液从涂料色变清，说明管里的残漆冲出来了。',
          check: s => { const w = s.work.spray; return w.flushed && !w.flushing && w.rinse >= M.SPRAY.clear; }},
        {id: 'zero', icon: '⚠', title: '压力回零再拆枪', hint: '压力表没回零时点一下喷嘴', result: '带压拆枪，涂料会射进皮肤造成高压注射伤——先锁枪泄压。',
          check: s => !!s.tried?.spray?.early},
        {id: 'filter', icon: '🔍', title: '找出堵住的滤网', hint: '选“喷幅变窄”，冲洗后拆开看', result: '残漆干结在枪内滤网上，喷幅就变窄；拆洗通透后恢复。',
          check: s => !!s.tried?.spray?.found},
        {id: 'oil', icon: '🧪', title: '油性涂料选对清洗液', hint: '选“油性涂料”，洗完通过复查', result: '油性涂料要用配套溶剂；水性涂料用清水。以说明书为准。',
          check: s => (s.records || []).some(r => r.station === 'spray' && r.scenario === 'oil' && r.resolved)},
      ],
    },
    mortar: {
      read: [{id: 'a', label: '砂浆泵'}, {id: 'b', label: '压力表', unit: '格·示意'}, {id: 'c', label: '停泵计时', unit: '秒·示意'}, {id: 'd', label: '输浆管'}],
      cards: [
        {id: 'ball', icon: '⏱', title: '初凝前推出清洗球', hint: '停泵后抓紧，一次把球推出来', result: '趁残浆还软，清洗球一次就把整条管推干净。',
          check: s => { const w = s.work.mortar; return w.ball === 'out' && !w.stuckOnce; }},
        {id: 'jam', icon: '🔨', title: '找出堵管段', hint: '选“午休忘洗已结块”，泄压后拆管', result: '压力表异常升高、管子发硬的那段就是堵段；泄压后分段拆开、敲击疏通。',
          check: s => !!s.tried?.mortar?.found},
        {id: 'person', icon: '🚫', title: '出口不对人', hint: '出口对着旁边的人去推球', result: '推球时余浆和球会猛地冲出，出口只能对准桶。',
          check: s => !!s.tried?.mortar?.person},
        {id: 'tank', icon: '🪣', title: '废水进沉淀桶', hint: '出口对准沉淀桶，把球推出来', result: '废水进沉淀桶沉淀，清水回用、沉渣按现场要求处理，不进下水口。',
          check: s => { const w = s.work.mortar; return w.ball === 'out' && w.aim === 'tank'; }},
      ],
    },
  };

  function buildFlush(c) {
    const id = c.station.id, st = M.STATIONS[id], spec = FLUSH[id];
    const act = ev => lab.dispatch(ev);
    const ws = () => lab.state().work[id];
    const closed = () => { const w = ws(); return w.verified || w.handoff; };

    caseBar.replaceChildren(h('span', 'm82-cases-label', '情境'));
    const caseButtons = st.cases.map(([value, text], i) => {
      const b = btn('m82-case' + (i ? ' abn' : ''), text, () => { if (ws().scenario !== value || closed()) act({type: 'case', value}); });
      b.setAttribute('role', 'radio'); b.dataset.value = value; caseBar.append(b); return b;
    });
    const read = c.readouts(spec.read);

    const gFlow = c.section('维护流程');
    const flow = h('ol', 'm82-flow'); gFlow.append(flow);
    const step = (text, type) => {
      const li = h('li', 'm82-step'), b = btn('m82-step-btn', null, type ? () => act({type}) : null);
      const t = h('span', 'm82-step-text', text);
      b.append(h('span', 'm82-dot'), t); li.append(b); flow.append(li);
      if (!type) { b.classList.add('static'); b.disabled = true; }
      return {li, b, t};
    };
    const chipRow = (s0, list, onClick, cls = 'm82-mat') => {
      const row = h('div', 'm82-mats');
      const items = list.map(([value, text]) => { const b = btn(cls, text, () => onClick(value)); b.setAttribute('role', 'radio'); b.dataset.value = value; row.append(b); return b; });
      s0.li.append(row); return items;
    };
    const sPrep = step(st.steps.prepare, 'prepare');
    const sIso = step(st.steps.isolate, 'isolate');
    const sEnergy = step(st.steps.energy, 'energy');
    const ui = {};
    if (id === 'spray') {
      ui.liquid = step('选清洗液');
      ui.liquids = chipRow(ui.liquid, st.liquids, value => act({type: 'liquid', value}));
      ui.suction = step('吸料管移到清洗桶', 'suction');
      ui.flush = step('低压循环冲洗', 'flush');
      const cup = h('div', 'm82-cup'); ui.cupDot = h('i'); ui.cupText = h('span', '', '样杯'); ui.cupBar = h('div', 'm82-bar'); ui.cupFill = h('span'); ui.cupBar.append(ui.cupFill);
      cup.append(ui.cupDot, ui.cupText); ui.flush.li.append(cup, ui.cupBar);
      ui.parts = step('拆洗喷嘴和滤网（每件点两次）');
      const chips = h('div', 'm82-chips');
      ui.partChips = st.points.map(([p, name], i) => { const b = btn('m82-chip', null, () => act({type: 'part', point: p})); b.dataset.point = p; b.append(h('i', '', String(i + 1)), h('span', '', name)); chips.append(b); return b; });
      ui.parts.li.append(chips);
      ui.store = step('装回后');
      ui.stores = chipRow(ui.store, st.stores, value => act({type: 'store', value}));
      ui.waste = step('废液倒入回收桶', 'waste');
    } else {
      ui.hopper = step('清水冲洗料斗', 'hopper');
      ui.aim = step('喷枪出口对准');
      ui.aims = chipRow(ui.aim, st.aims, value => act({type: 'aim', value}));
      ui.ball = step('塞清洗球，清水推过整条管', 'ball');
      const chips = h('div', 'm82-chips m82-segs');
      ui.segChips = [0, 1, 2, 3].map(i => {
        const b = btn('m82-chip m82-seg', null, () => act({type: 'segment', seg: i}));
        const bar = h('em'); b.append(h('i', '', String(i + 1)), h('span', '', ''), bar); b._bar = bar; chips.append(b); return b;
      });
      ui.ball.li.append(chips);
      ui.segTip = h('p', 'm82-tip', '堵管时：泄压后点管段——拆开管卡 → 敲击疏通 → 装回。条色是残浆变硬程度（示意）。'); ui.ball.li.append(ui.segTip);
      ui.nozzle = step('拆洗喷枪喷嘴', 'nozzle');
      ui.drain = step('放空存水（冬季必做）', 'drain');
    }
    const ends = h('li', 'm82-step m82-ends');
    ends.append(btn('c2-btn c2-primary', '复查', () => act({type: 'verify'})), btn('c2-btn m82-hand', '移交检修', () => act({type: 'handoff'})));
    flow.append(ends);
    const verdict = h('div', 'm82-verdict'); verdict.hidden = true; gFlow.append(verdict);
    gFlow.append(h('p', 'm82-note', '计时、压力（格）和颜色都是课堂示意。清洗介质与顺序以设备与材料说明书为准。'));

    c.challenges(spec.cards);
    recordsSection(c);
    c.view('全景', () => lab.frame());
    c.view('俯视', () => lab.top());

    let key = '';
    view = s => {
      const w = s.work[id], r = lab.readouts();
      const k = JSON.stringify([w, s.records, r.sprayPressure, r.mortarPressure]);
      if (k === key) return; key = k;
      caseButtons.forEach(b => b.setAttribute('aria-checked', String(b.dataset.value === w.scenario)));
      const mark = (s0, d) => s0.li.classList.toggle('done', Boolean(d));
      mark(sPrep, w.prepared); mark(sIso, w.isolated); mark(sEnergy, w.energy);
      let order;
      if (id === 'spray') {
        const need = M.SPRAY.liquid[w.scenario];
        read('a', w.flushing ? '冲洗中' : w.prepared ? '已停止' : '喷涂中'); read('b', r.sprayPressure);
        read('c', w.flushed || w.flushing ? M.rinseLook(w.rinse) : '—'); read('d', st.points.filter(([p]) => w.done[p]).length + ' / ' + st.points.length);
        ui.liquid.t.textContent = '选清洗液（本单：' + M.SPRAY.paint[w.scenario] + '涂料）';
        ui.liquids.forEach(b => b.setAttribute('aria-checked', String(b.dataset.value === w.liquid)));
        ui.liquids.forEach(b => b.classList.toggle('ok', b.dataset.value === need));
        mark(ui.liquid, w.liquid === need); ui.liquid.li.classList.toggle('bad', !!w.liquid && w.liquid !== need);
        mark(ui.suction, w.suction === 'clean');
        ui.flush.t.textContent = w.flushing ? '冲洗中……够清了就按这里停泵' : w.flushed ? '低压循环冲洗（可以再冲一次）' : '低压循环冲洗';
        ui.flush.li.classList.toggle('running', w.flushing);
        mark(ui.flush, w.flushed && !w.flushing && w.rinse >= M.SPRAY.clear);
        ui.cupText.textContent = '样杯：' + (w.flushed || w.flushing ? M.rinseLook(w.rinse) : '还没接样');
        ui.cupFill.style.width = Math.round(w.rinse * 100) + '%';
        ui.cupDot.dataset.k = w.rinse >= M.SPRAY.clear ? 'clear' : w.rinse >= .25 ? 'mid' : 'paint';
        ui.cupDot.dataset.paint = w.scenario === 'oil' ? 'oil' : 'water';
        ui.partChips.forEach(b => { const p = b.dataset.point, f = M.finding('spray', w.scenario, p); b.dataset.state = w.done[p] ? 'done' : w.checked[p] ? (f.abnormal ? 'bad' : 'ok') : 'todo'; b.title = w.checked[p] ? f.text : '点一下拆下查看'; });
        mark(ui.parts, w.progress >= 1);
        ui.stores.forEach(b => { b.setAttribute('aria-checked', String(b.dataset.value === w.store)); b.classList.add('ok'); });
        mark(ui.store, !!w.store); mark(ui.waste, w.waste);
        const past = w.flushing || w.flushed;           // 冲洗时摘牌送电；停泵后要重新断电、泄压
        order = [[sPrep, w.prepared], [sIso, w.isolated || past], [sEnergy, w.energy || past], [ui.liquid, w.liquid === need], [ui.suction, w.suction === 'clean'],
          [ui.flush, w.flushed && !w.flushing], [sIso, w.isolated], [sEnergy, w.energy], [ui.parts, w.progress >= 1], [ui.store, !!w.store], [ui.waste, w.waste]];
      } else {
        const jam = M.blocked(w);
        read('a', w.ball === 'stuck' && w.pressure > 6 ? '憋压' : w.prepared ? '已停止' : '运转中'); read('b', r.mortarPressure);
        read('c', w.prepared ? Math.round(w.idle) : '—');
        read('d', w.ball === 'out' ? '已冲净' : (jam.length && (w.ball === 'stuck' || w.segs.some(g => g.open))) ? '堵 ' + jam.length + ' 段' : jam.length ? '发硬' : '有残浆');
        mark(ui.hopper, w.hopper);
        ui.aims.forEach(b => { b.setAttribute('aria-checked', String(b.dataset.value === w.aim)); b.classList.toggle('ok', b.dataset.value === 'tank'); });
        mark(ui.aim, w.aim === 'tank'); ui.aim.li.classList.toggle('bad', !!w.aim && w.aim !== 'tank');
        mark(ui.ball, w.ball === 'out'); ui.ball.li.classList.toggle('bad', w.ball === 'stuck');
        ui.segChips.forEach((b, i) => {
          const g = w.segs[i], hard = !g.clear && g.set >= 1;
          b.dataset.state = g.clear ? 'ok' : (g.open && hard) ? 'bad' : g.open ? 'done' : 'todo';
          b._bar.style.setProperty('--k', g.clear ? 0 : g.set.toFixed(2));
          b.title = g.clear ? '清水' : g.open ? (hard ? '已拆开：硬结，点一下敲击疏通' : '已拆开：没堵，点一下装回') : '残浆变硬程度（课堂示意）';
          b.querySelector('span').textContent = g.open ? '拆开' : g.clear ? '清水' : '段';
        });
        ui.segTip.hidden = !(w.ball === 'stuck' || w.segs.some(g => g.open));
        mark(ui.nozzle, w.nozzle); mark(ui.drain, w.drained);
        ui.drain.li.classList.toggle('need', w.scenario === 'winter' && !w.drained);
        const past = w.ball === 'out';
        order = [[sPrep, w.prepared], [sIso, w.isolated || past], [sEnergy, w.energy || past], [ui.hopper, w.hopper], [ui.aim, w.aim === 'tank'], [ui.ball, w.ball === 'out'],
          [sIso, w.isolated], [sEnergy, w.energy], [ui.nozzle, w.nozzle], ...(w.scenario === 'winter' ? [[ui.drain, w.drained]] : [])];
      }
      const next = (w.verified || w.handoff) ? null : order.find(([, d]) => !d)?.[0];
      for (const s0 of new Set(order.map(x => x[0]))) s0.li.classList.toggle('next', s0 === next);
      verdict.hidden = !(w.verified || w.handoff);
      verdict.className = 'm82-verdict ' + (w.verified ? 'ok' : 'warn');
      verdict.textContent = w.verified ? '✓ 复查通过，已记入交接记录' : '⇢ 已移交 · 未解决：' + w.unresolved.join('；');
      renderRecords(s);
    };
    view(lab.state());
    const off = lab.onChange((s, ev) => {
      if (ev?.type === 'station' || ev?.type === 'look') return;
      window.c2Lab?.ctx?._state(s);
      if (s.message && ev) c.feedback(s.message, s.error ? 'warn' : (ev.type === 'verify' ? 'ok' : 'info'));
    });
    c.onCleanup(off);
    c.lab.onState(s => view(s));
  }

  const STATIONS = M.IDS.map(id => {
    const flushing = M.STATIONS[id].kind === 'flush';
    return {id, name: M.STATIONS[id].label, lead: '', hint: flushing ? '拖动旋转 · 滚轮缩放 · 点标记操作' : '拖动旋转 · 滚轮缩放 · 点编号检查', build: flushing ? buildFlush : buildStation};
  });

  // shared/theme.js 会把主题按钮放进第一个 .course-nav；本页没有旧导航，按钮落在外壳页头
  S.start({
    task: '8-2', title: '保养排查',
    stage: document.getElementById('m82Stage'),
    stageTop: caseBar,
    stations: STATIONS,
    current: () => lab.state().station,
    select: id => { if (lab.state().station !== id) lab.dispatch({type: 'station', value: id}); },
    poll: () => lab.state(),
    reset: id => { const w = lab.state().work[id]; lab.dispatch({type: 'case', value: w.scenario}); },
  });
})();

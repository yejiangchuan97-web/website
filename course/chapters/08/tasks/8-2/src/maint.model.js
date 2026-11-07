/* 任务 8-2 班后维护：纯状态模型（浏览器与 node 测试共用，不碰 DOM 与三维）。
 * 四个工位：发动机班后点检、挖掘机班后润滑、喷涂管路清洗、砂浆管道清洗。每个工位都按同一条线走：
 *   准备（停机）→ 隔离（断电挂牌）→ 能量确认（冷却/泄压）→ 处理 → 复查 → 交接记录。
 * 情境、检查结果、材料、计时、压力（格）与颜色均为课堂案例，不代表任何具体机型的维修规程；
 * 清洗介质与顺序以设备与材料说明书为准。
 */
(function (g) {
  'use strict';
  const STATIONS = {
    engine: {
      label: '发动机点检',
      cases: [['normal', '班后点检'], ['leak', '底部渗油'], ['belt', '皮带裂纹'], ['unknown', '机油规格不明']],
      steps: {prepare: '熄火停机', isolate: '拔钥匙、断开电源总开关', energy: '等发动机冷却下来'},
      points: [['dipstick', '机油尺'], ['coolant', '冷却液壶'], ['belt', '附件皮带'], ['under', '底部与地面']],
      materials: [['spec', '资料指定机油'], ['unknown', '标签不明的机油'], ['mixed', '两种机油混用']],
      service: '补加机油到刻度',
    },
    excavator: {
      label: '挖掘机润滑',
      cases: [['normal', '班后润滑'], ['seep', '动臂油缸渗漏'], ['loose', '铲斗销松旷'], ['unknown', '润滑脂资料不明']],
      steps: {prepare: '铲斗落地', isolate: '熄火拔钥匙、放下先导锁定杆', energy: '释放液压残压'},
      points: [['boomFoot', '动臂根部'], ['boomRod', '动臂油缸'], ['boomTip', '动臂—斗杆铰点'], ['stickRod', '斗杆油缸'], ['bucketPin', '铲斗销'], ['linkPin', '摇杆销']],
      materials: [['spec', '资料指定润滑脂'], ['unknown', '标签不明的润滑脂'], ['mixed', '不同润滑脂混用']],
      service: '逐点加注润滑脂',
    },
    spray: {
      label: '喷涂管路清洗', kind: 'flush',
      cases: [['water', '水性涂料'], ['oil', '油性涂料'], ['clog', '喷幅变窄']],
      steps: {prepare: '停止喷涂', isolate: '断电挂牌', energy: '喷枪上锁、开泄压阀'},
      points: [['nozzle', '喷嘴'], ['gunFilter', '枪内滤网'], ['suction', '吸料滤网']],
      spots: [['relief', '泄压阀'], ['pipe', '吸料管'], ['nozzle', '喷嘴'], ['gunFilter', '枪内滤网'], ['suction', '吸料滤网']],
      liquids: [['water', '清水'], ['solvent', '配套溶剂'], ['thinner', '不明稀料']],
      stores: [['protect', '灌保护液'], ['empty', '排空存放']],
    },
    mortar: {
      label: '砂浆管道清洗', kind: 'flush',
      cases: [['normal', '班后正常清洗'], ['lunch', '午休忘洗已结块'], ['winter', '冬季停用一周']],
      steps: {prepare: '停止上料、泵空料斗', isolate: '断电挂牌', energy: '反转泄压，压力回零'},
      points: [['seg1', '管段1'], ['seg2', '管段2'], ['seg3', '管段3'], ['seg4', '管段4']],
      spots: [['hopper', '料斗'], ['relief', '泄压口'], ['gun', '喷枪喷嘴'], ['tank', '沉淀桶'], ['drain', '放水口'],
        ['seg1', '管段1', 1], ['seg2', '管段2', 2], ['seg3', '管段3', 3], ['seg4', '管段4', 4]],
      aims: [['tank', '沉淀桶'], ['drain', '下水口'], ['person', '旁边的人']],
    },
  };
  const IDS = Object.keys(STATIONS);
  const START_TEMP = 88, SAFE_TEMP = 45, START_PRESSURE = 35;
  /* 课堂案例参数（不是真实设备数据）：压力用压力表的“格”表示；计时用课堂秒，和真实初凝时间无关。 */
  const SPRAY = {work: 8, flush: 2, clear: .9, rinseRate: {water: .1, oil: .07, clog: .1},
    liquid: {water: 'water', oil: 'solvent', clog: 'water'}, paint: {water: '水性', oil: '油性', clog: '水性'}};
  const MORTAR = {work: 6, rest: 4, push: 2, jam: 9, limit: 100, rates: [.3, .4, .8, 1], lunchIdle: 130, damagedSeal: 2};

  /* 每个检查点在各情境下看到什么；abnormal 为真时这一项必须移交。 */
  const FINDINGS = {
    engine: {
      dipstick: c => c === 'unknown' ? {text: '油位在下刻线附近，需要补加；但本机机油规格资料缺失。', doc: true} : {text: '油位在下刻线附近，需要补加一点。', low: true},
      coolant: () => ({text: '液位在 MIN 与 MAX 之间，颜色正常。'}),
      belt: c => c === 'belt' ? {text: '附件皮带内侧有多道横向裂纹。', abnormal: true} : {text: '皮带无裂纹，张紧正常。'},
      under: c => c === 'leak' ? {text: '油底壳放油螺塞处在渗油，地面有新鲜油迹。', abnormal: true} : {text: '底部和地面干净，没有油迹。'},
    },
    excavator: {
      boomFoot: () => ({text: '销轴无异响，旧润滑脂已发干。'}),
      boomRod: c => c === 'seep' ? {text: '动臂油缸活塞杆上有油膜，下方地面有油滴。', abnormal: true} : {text: '活塞杆干净，无渗漏。'},
      boomTip: () => ({text: '铰点正常，需要补充润滑。'}),
      stickRod: () => ({text: '斗杆油缸杆端正常，需要补充润滑。'}),
      bucketPin: c => c === 'loose' ? {text: '铲斗销和销孔之间有明显松旷间隙。', abnormal: true} : {text: '铲斗销正常，需要补充润滑。'},
      linkPin: () => ({text: '摇杆销正常，需要补充润滑。'}),
    },
    spray: {
      nozzle: () => ({text: '喷孔边上挂着一圈残漆。'}),
      gunFilter: c => c === 'clog' ? {text: '枪内滤网被干结的涂料堵住大半——喷幅变窄就是它。', abnormal: true} : {text: '滤网上有少量残漆，网眼通透。'},
      suction: () => ({text: '吸料滤网上缠着一些漆皮。'}),
    },
    mortar: {seg1: () => ({}), seg2: () => ({}), seg3: () => ({}), seg4: () => ({})},
  };

  function fresh(station, scenario) {
    scenario = scenario || STATIONS[station].cases[0][0];
    if (station === 'spray') return {
      scenario, prepared: false, isolated: false, energy: false, pressure: SPRAY.work,
      liquid: null, suction: 'paint', flushing: false, flushed: false, rinse: 0,
      checked: {}, done: {}, progress: 0, store: null, waste: false,
      verified: false, handoff: false, unresolved: [],
    };
    if (station === 'mortar') {
      const lunch = scenario === 'lunch';
      const w = {
        scenario, prepared: lunch, isolated: false, energy: false, pressure: lunch ? MORTAR.rest : MORTAR.work,
        idle: lunch ? MORTAR.lunchIdle : 0, hopper: false, aim: null, ball: 'none', ballAt: -1, stuckOnce: false,
        segs: MORTAR.rates.map(() => ({set: 0, open: false, clear: false})),
        seal: lunch ? MORTAR.damagedSeal : -1, sealFixed: false, nozzle: false, drained: false, warned: {},
        checked: {}, done: {}, progress: 0, verified: false, handoff: false, unresolved: [],
      };
      harden(w); return w;
    }
    return {
      scenario, prepared: false, isolated: false, energy: false,
      temp: station === 'engine' ? START_TEMP : null,
      pressure: station === 'excavator' ? START_PRESSURE : null,
      checked: {}, read: false, material: 'spec', done: {}, progress: 0,
      verified: false, handoff: false, unresolved: [],
    };
  }
  const initial = () => ({
    station: 'engine',
    work: Object.fromEntries(IDS.map(id => [id, fresh(id)])),
    records: [], tried: Object.fromEntries(IDS.map(id => [id, {}])),
    message: '', error: false, last: null,
  });

  /* —— 砂浆：停泵后残浆按段变硬（越靠近喷枪的段越快）；被清水推空或敲通的段不再变硬 —— */
  function harden(w) {
    w.segs.forEach((g, i) => { if (!g.clear) g.set = Math.min(1, w.idle * MORTAR.rates[i] / MORTAR.limit); });
  }
  const blocked = w => w.segs.map((g, i) => (!g.clear && g.set >= 1 ? i : -1)).filter(i => i >= 0);
  const mortarTiming = w => w.prepared && w.ball !== 'out' && !w.verified && !w.handoff;
  /** 需要计时的工位：喷涂正在冲洗、砂浆停泵后残浆在管里。app.js 据此决定要不要发 tick。 */
  const ticking = s => !!(s.work.spray?.flushing || (s.work.mortar && mortarTiming(s.work.mortar)));
  const rinseLook = r => r >= SPRAY.clear ? '清' : r >= .6 ? '微浑' : r >= .25 ? '浑浊' : '原色';

  const label = (list, id) => (list.find(x => x[0] === id) || [, id])[1];
  const finding = (station, scenario, point) => FINDINGS[station][point](scenario);
  const abnormal = (station, w) => Object.keys(w.checked).filter(p => finding(station, w.scenario, p).abnormal);
  const allChecked = (station, w) => STATIONS[station].points.every(([p]) => w.checked[p]);

  function reduce(state, event) {
    if (event.type === 'reset-all') return initial();
    const s = JSON.parse(JSON.stringify(state));
    for (const id of IDS) if (!s.work[id]) s.work[id] = fresh(id);
    if (event.type === 'tick') return tick(s, Math.max(0, Math.min(5, +event.dt || 0)));
    s.error = false; s.last = event.type;
    s.tried = s.tried || Object.fromEntries(IDS.map(id => [id, {}]));
    if (event.type === 'station') {
      if (STATIONS[event.value]) s.station = event.value;
      s.message = ''; return s;
    }
    const id = s.station, st = STATIONS[id], w = s.work[id], steps = st.steps;
    const ok = m => { s.message = m; return s; };
    const fail = (m, flag) => { if (flag) s.tried[id][flag] = true; s.error = true; s.message = m; return s; };
    const closed = () => w.verified || w.handoff;
    s.tried[id] = s.tried[id] || {};
    if (st.kind === 'flush' && event.type !== 'case') {
      if (closed() && event.type !== 'verify' && event.type !== 'handoff') return fail('这一单已经结束。换一个情境，或按“重来”。');
      return (id === 'spray' ? spray : mortar)(s, w, event, ok, fail);
    }

    switch (event.type) {
      case 'case':
        if (!st.cases.some(c => c[0] === event.value)) return s;
        s.work[id] = fresh(id, event.value);
        if (id === 'mortar' && event.value === 'lunch') return ok('午休前停了泵却没清洗，管里的砂浆已经放了一个午休。其他记录都保留。');
        return ok('载入“' + label(st.cases, event.value) + '”。其他记录都保留。');
      case 'prepare':
        if (closed()) return fail('这一单已经结束。换一个情境，或按“重来”。');
        w.prepared = true;
        return ok(id === 'engine' ? '发动机已熄火，曲轴停转。机体还很烫。' : '铲斗已平放在地面上，工作装置不再悬空。');
      case 'isolate':
        if (!w.prepared) return fail(id === 'engine' ? '先熄火停机。' : '先把铲斗放到地面。', 'early');
        w.isolated = true;
        return ok(id === 'engine' ? '钥匙已拔下并挂牌，电源总开关已断开。' : '钥匙已拔下并挂牌，先导锁定杆已放下。');
      case 'energy':
        if (!w.isolated) return fail('先完成“' + steps.isolate + '”。');
        w.energy = true;
        if (id === 'engine') { w.temp = 40; return ok('等了一段时间，机体温度降到 40 ℃ 左右，可以开盖检查。'); }
        w.pressure = 0; return ok('按资料往复扳动操纵手柄释放残压，压力表回零。');
      case 'inspect': {
        const p = event.point;
        if (!st.points.some(x => x[0] === p)) return s;
        if (closed()) return fail('这一单已经结束。换一个情境，或按“重来”。');
        if (!w.prepared || !w.isolated || !w.energy) {
          const why = id === 'engine'
            ? (!w.prepared ? '发动机还在运转，不能靠近检查。' : (p === 'coolant' && !w.energy) ? '机体还烫，冷却系统带压，现在拧开冷却液盖会喷出热液。' : '先完成停机、隔离和冷却，再动手检查。')
            : (!w.prepared ? '铲斗还悬在空中，人不能进到工作装置下面。' : '先完成隔离和泄压，再靠近工作装置。');
          return fail(why, 'early');
        }
        w.checked[p] = true;
        const f = finding(id, w.scenario, p);
        if (f.abnormal) return fail('发现异常：' + f.text + ' 这一项要移交检修。');
        return ok(label(st.points, p) + '：' + f.text);
      }
      case 'read':
        if (closed()) return fail('这一单已经结束。');
        w.read = true;
        if (w.scenario === 'unknown') return fail(id === 'engine' ? '资料里查不到本机机油规格。不能猜，也不能拿手边的机油补加。' : '资料里查不到本机润滑脂品种。不能猜，也不能混用。');
        return ok(id === 'engine' ? '已核对资料：本机用资料指定牌号的机油，补到上下刻线之间。' : '已核对资料：各铰点用资料指定的润滑脂，加注到旧脂被挤出为止。');
      case 'material':
        if (!st.materials.some(m => m[0] === event.value)) return s;
        w.material = event.value;
        return ok('选用：' + label(st.materials, event.value) + '。');
      case 'service': {
        if (closed()) return fail('这一单已经结束。');
        if (!w.prepared || !w.isolated || !w.energy) return fail('维护前的停机、隔离和能量确认还没做完。', 'early');
        if (!allChecked(id, w)) return fail('先把所有检查点看一遍，再动手处理。');
        if (abnormal(id, w).length) return fail('已经发现异常，不能用常规保养掩盖问题。请移交。');
        if (!w.read) return fail('先核对型号与资料。');
        if (w.scenario === 'unknown') return fail('资料缺失，不能补加或加注。请移交，保留待确认事项。');
        if (w.material !== 'spec') return fail('所选材料没有资料依据，不能混用或代用。', 'material');
        if (id === 'engine') {
          w.done.oil = true; w.progress = 1;
          return ok('已补加资料指定机油，等几分钟再看油尺复查。');
        }
        const p = event.point || st.points.find(x => !w.done[x[0]])?.[0];
        if (!p || w.done[p]) return ok('这个点已经加注过了。');
        w.done[p] = true;
        w.progress = st.points.filter(x => w.done[x[0]]).length / st.points.length;
        return ok(label(st.points, p) + '加注完成，新脂把旧脂挤了出来。' + (w.progress < 1 ? '' : ' 全部加注完成，复查一遍。'));
      }
      case 'verify':
        if (w.progress < 1) return fail('处理还没做完，不能确认复查。');
        if (closed()) return fail('这一单已经结束。');
        w.verified = true; w.unresolved = [];
        record(s, id, w, true);
        return ok(id === 'engine' ? '复查：油位回到两条刻线之间，皮带、地面正常。已记入交接记录。' : '复查：每个铰点都有新脂挤出，地面无油迹。已记入交接记录。');
      case 'handoff': {
        if (closed()) return fail('这一单已经结束。');
        if (!Object.keys(w.checked).length && !w.read) return fail('先检查并记录现象，再移交。');
        const issues = abnormal(id, w).map(p => label(st.points, p) + '：' + finding(id, w.scenario, p).text);
        if (w.scenario === 'unknown' && w.read) issues.push(id === 'engine' ? '机油规格资料缺失，未补加' : '润滑脂资料缺失，未加注');
        if (!issues.length) issues.push('未发现异常的项目也一并移交，待确认');
        w.handoff = true; w.unresolved = issues;
        record(s, id, w, false);
        return ok('已移交检修，问题原样保留在交接记录里，不算修好。');
      }
      default: return s;
    }
  }

  function tick(s, dt) {
    s.message = '';
    const sp = s.work.spray, mo = s.work.mortar;
    if (sp.flushing) sp.rinse = Math.min(1, sp.rinse + dt * SPRAY.rinseRate[sp.scenario]);
    if (mortarTiming(mo)) {
      const before = blocked(mo);
      mo.idle += dt; harden(mo);
      const now = blocked(mo).filter(i => !before.includes(i) && !mo.warned[i]);
      if (now.length) {
        now.forEach(i => { mo.warned[i] = true; });
        if (s.station === 'mortar') { s.error = true; s.message = '管段' + now.map(i => i + 1).join('、') + '里的残浆变硬了——已经堵管。'; }
      }
    }
    return s;
  }

  /* —— 喷涂管路清洗：停喷 → 断电挂牌 → 锁枪泄压 → 选清洗液、吸料管换桶 → 低压循环冲洗（看样杯）→ 再断电泄压 → 拆洗三件 → 保护液/排空 → 废液进回收桶 —— */
  function spray(s, w, e, ok, fail) {
    const st = STATIONS.spray, need = SPRAY.liquid[w.scenario];
    const injury = () => fail('压力表没回零就拆，高压涂料会从缝隙射出、扎进皮肤，造成高压注射伤。先锁枪泄压，压力回零再拆。', 'early');
    const point = e.type === 'spot' ? e.point : e.point;
    switch (e.type === 'spot' ? ({relief: 'energy', pipe: 'suction'}[point] || 'part') : e.type) {
      case 'prepare':
        w.prepared = true; w.flushing = false;
        return ok(w.flushed ? '已停泵。管里还憋着冲洗压力。' : '已停止喷涂，泵停了——但管里还憋着压力，压力表没回零。');
      case 'isolate':
        if (!w.prepared) return fail('先停止喷涂。', 'early');
        if (w.flushing) return fail('正在冲洗。先按“停泵”。');
        w.isolated = true;
        return ok('已断开电源并挂“禁止合闸”牌。' + (w.pressure > 0 ? '压力表还没回零。' : ''));
      case 'energy':
        if (!w.isolated) return fail('先断电挂牌，再锁枪泄压。');
        w.energy = true; w.pressure = 0;
        return ok('喷枪已上锁，打开泄压阀把涂料放进回收桶，压力表回零。');
      case 'liquid':
        if (!st.liquids.some(x => x[0] === e.value)) return s;
        if (w.flushing) return fail('正在冲洗，不能中途换清洗液。');
        w.liquid = e.value;
        return ok('清洗桶里加入：' + label(st.liquids, e.value) + '。');
      case 'suction':
        if (w.pressure > 0) return fail('先锁枪泄压，压力回零再动吸料管。', 'early');
        if (!w.liquid) return fail('先选清洗液，倒进清洗桶。');
        if (w.suction === 'clean') return ok('吸料管已经插在清洗桶里。');
        w.suction = 'clean';
        return ok('吸料管从涂料桶提出，残漆滴干后插进清洗桶。');
      case 'flush':
        if (w.flushing) {
          w.flushing = false; w.flushed = true; w.prepared = true;
          return ok('已停泵。样杯：' + rinseLook(w.rinse) + '。拆枪前要重新断电挂牌、泄压。');
        }
        if (!w.energy || w.pressure > 0) return fail('先完成断电挂牌和锁枪泄压。');
        if (w.suction !== 'clean') return fail('吸料管还在涂料桶里，先移到清洗桶。');
        if (Object.keys(w.checked).some(p => !w.done[p])) return fail('拆下的零件还没洗完装回。');
        if (w.liquid !== need) {
          return fail(w.liquid === 'thinner' ? '来历不明的稀料可能和涂料不配套，会让残漆结絮、堵滤网。按说明书选配套的清洗液。'
            : need === 'water' ? '水性涂料用清水清洗就行。用溶剂既浪费，又增加气味和着火风险。'
              : '油性涂料用清水洗不掉，残漆会结成絮状堵滤网。用涂料配套的溶剂。', 'liquid');
        }
        w.flushing = true; w.isolated = false; w.energy = false; w.pressure = SPRAY.flush;
        return ok('喷枪对着回收桶，摘牌送电，低压循环冲洗。盯着样杯，变清了就停泵。');
      case 'part': {
        const p = point;
        if (!st.points.some(x => x[0] === p)) return s;
        if (w.flushing || w.pressure > 0) return injury();
        if (!w.isolated) return fail('先断电挂牌，再拆枪。', 'early');
        if (!w.flushed) return fail('先冲洗管路，再拆洗零件——不然拆开满是涂料。');
        if (!w.checked[p]) {
          w.checked[p] = true;
          const f = finding('spray', w.scenario, p);
          if (f.abnormal) { s.tried.spray.found = true; return fail('找到了：' + f.text); }
          return ok(label(st.points, p) + '：' + f.text);
        }
        if (w.done[p]) return ok(label(st.points, p) + '已经洗净。');
        w.done[p] = true;
        w.progress = st.points.filter(x => w.done[x[0]]).length / st.points.length;
        return ok(label(st.points, p) + '泡在' + label(st.liquids, w.liquid || need) + '里刷洗干净，装回。' + (w.progress < 1 ? '' : '三件都洗净了。'));
      }
      case 'store':
        if (!st.stores.some(x => x[0] === e.value)) return s;
        if (w.progress < 1) return fail('先把喷嘴和两层滤网洗净装回。');
        w.store = e.value;
        return ok(e.value === 'protect' ? '泵和管路里灌上保护液，防止残留结皮、部件锈蚀。' : '把管路和泵里的液体排空，存放在不会结冰的地方。');
      case 'waste':
        if (!w.flushed) return fail('还没冲洗，没有废液。');
        w.waste = true;
        return ok('冲洗出的废液倒进回收桶，盖好，交现场统一处理。');
      case 'verify': {
        if (w.verified || w.handoff) return fail('这一单已经结束。');
        if (!w.flushed) return fail('还没冲洗，不能复查。');
        if (w.rinse < SPRAY.clear) return fail('样杯里的出液还带颜色——管里还有残漆。再冲洗一会儿。');
        if (w.progress < 1) return fail('喷嘴和滤网还没全部拆洗。');
        if (!w.store) return fail('还没灌保护液或排空。');
        if (!w.waste) return fail('废液还没倒进回收桶。');
        w.verified = true; w.unresolved = [];
        record(s, 'spray', w, true);
        return ok('复查：出液清、喷嘴和滤网干净、废液已回收。已记入交接记录。');
      }
      case 'handoff': {
        if (w.verified || w.handoff) return fail('这一单已经结束。');
        if (!w.prepared) return fail('先停止喷涂，再移交。');
        const issues = [];
        if (w.flushed && w.rinse < SPRAY.clear) issues.push('出液未清，管内仍有残漆');
        st.points.forEach(([p, n]) => { if (w.checked[p] && finding('spray', w.scenario, p).abnormal && !w.done[p]) issues.push(n + '堵塞未清'); });
        if (w.pressure > 0) issues.push('管路未泄压');
        if (!issues.length) issues.push('未发现异常的项目也一并移交，待确认');
        w.handoff = true; w.unresolved = issues;
        record(s, 'spray', w, false);
        return ok('已移交，问题原样保留在交接记录里，不算修好。');
      }
      default: return s;
    }
  }

  /* —— 砂浆管道清洗：停料泵空 → 断电挂牌 → 反转泄压 → 冲洗料斗 → 出口对桶、塞球推管 → 再断电泄压 → 拆洗喷嘴 → （冬季）放空存水 —— */
  function mortar(s, w, e, ok, fail) {
    const st = STATIONS.mortar, segName = i => '管段' + (i + 1);
    const burst = () => fail('管里还有压力，现在拆管卡或喷嘴，砂浆会喷出来伤人。先停泵、断电挂牌、泄压到零。', 'early');
    let type = e.type, seg = -1;
    if (type === 'spot') {
      const p = e.point;
      if (/^seg[1-4]$/.test(p)) { type = 'segment'; seg = +p[3] - 1; }
      else type = {hopper: 'hopper', relief: 'energy', gun: 'nozzle', tank: 'aim', drain: 'drain'}[p] || '';
      if (p === 'tank') e = {...e, value: 'tank'};
    }
    if (type === 'segment' && seg < 0) seg = +e.seg;
    switch (type) {
      case 'prepare':
        if (w.prepared) return ok('泵已经停了。');
        w.prepared = true; w.pressure = MORTAR.rest;
        return ok('停止上料，把料斗里的砂浆泵空后停泵。从现在起管里的残浆开始变硬。');
      case 'isolate':
        if (!w.prepared) return fail('先停止上料、泵空料斗。', 'early');
        w.isolated = true;
        return ok('已断开电源并挂“禁止合闸”牌。' + (w.pressure > 0 ? '压力表还没回零。' : ''));
      case 'energy':
        if (!w.isolated) return fail('先断电挂牌，再泄压。');
        w.energy = true; w.pressure = 0;
        return ok(w.ball === 'stuck' ? '打开泄压口放压，压力表回零。现在可以分段拆管了。' : '电机点动反转、打开泄压口，管里的压力放掉，压力表回零。');
      case 'hopper':
        if (!w.prepared) return fail('泵还在上料，先停止上料、泵空料斗。');
        if (!w.isolated) return fail('料斗里有搅拌轴。不断电挂牌，不能伸手进料斗清理。', 'early');
        w.hopper = true;
        return ok(w.scenario === 'lunch' ? '铲下料斗壁上的结块，用清水冲净料斗和格栅。' : '清水冲洗料斗、格栅和搅拌轴，余浆刮干净。');
      case 'aim':
        if (!st.aims.some(x => x[0] === e.value)) return s;
        w.aim = e.value;
        return ok('喷枪出口朝向：' + label(st.aims, e.value) + '。');
      case 'ball': {
        if (!w.hopper) return fail('先冲洗料斗，再塞清洗球。');
        if (w.ball === 'out') return ok('清洗球已经推出来了。');
        if (w.segs.some(g => g.open)) return fail('还有管卡没装回，不能送水。');
        if (!w.aim) return fail('先把喷枪出口对准沉淀桶。');
        if (w.aim === 'person') return fail('出口对着人！推球时余浆和清洗球会猛地冲出，打到人会受伤。出口只能对准桶。', 'person');
        if (w.aim === 'drain') return fail('砂浆废水倒进下水口，会沉积堵住管道、污染环境。出口对准沉淀桶。', 'drain');
        w.isolated = false; w.energy = false;
        const jam = blocked(w)[0];
        if (jam != null) {
          w.ball = 'stuck'; w.ballAt = jam; w.stuckOnce = true; w.pressure = MORTAR.jam; w.prepared = true;
          return fail('压力表异常升高，' + segName(jam) + '发硬、球推不动——堵管了！已停泵。先断电挂牌、泄压，再分段拆管。');
        }
        w.ball = 'out'; w.ballAt = -1; w.pressure = MORTAR.push;
        w.segs.forEach(g => { g.clear = true; g.set = 0; });
        return ok('摘牌送电，清水把清洗球推过整条管，余浆被推进沉淀桶，出口流出清水。已停泵，拆喷嘴前再断电泄压。');
      }
      case 'segment': {
        const g = w.segs[seg]; if (!g) return s;
        if (w.pressure > 0) return burst();
        if (!w.isolated) return fail('先断电挂牌。', 'early');
        if (!g.open) {
          if (w.ball === 'out') return ok(segName(seg) + '已经冲净，不用拆。');
          g.open = true;
          if (!g.clear && g.set >= 1) return fail('打开' + segName(seg) + '的管卡：管里是硬结的砂浆块，就是这段堵了。敲击管壁疏通。');
          return ok('打开' + segName(seg) + '：管里的砂浆还软，没堵。装回去。');
        }
        if (!g.clear && g.set >= 1) {
          g.clear = true; g.set = 0;
          if (!blocked(w).length) s.tried.mortar.found = true;
          return ok('敲击' + segName(seg) + '管壁、用清水冲出结块，这段通了。' + (blocked(w).length ? '' : '堵段都疏通了，装回管卡再推球。'));
        }
        g.open = false;
        if (w.seal === seg && !w.sealFixed) { w.sealFixed = true; return ok('管卡里的密封圈被挤坏了，换上新的再卡紧。'); }
        if (!w.segs.some(x => x.open) && w.ball === 'stuck') w.ball = 'none';
        return ok('装回' + segName(seg) + '的管卡，卡紧。');
      }
      case 'nozzle':
        if (w.ball !== 'out') return fail('先用清洗球把管路推干净，再拆喷嘴。');
        if (w.pressure > 0) return burst();
        if (!w.isolated) return fail('先断电挂牌。', 'early');
        w.nozzle = true;
        return ok('拆下喷枪喷嘴，清水刷净喷孔，装回。');
      case 'drain':
        if (w.ball !== 'out') return fail('管路还没冲净，先推球。');
        if (!w.isolated) return fail('先断电挂牌。', 'early');
        w.drained = true;
        return ok('打开泵底放水口和管路接头，把存水全部放空，防止结冰胀裂。');
      case 'verify': {
        if (w.verified || w.handoff) return fail('这一单已经结束。');
        if (w.ball !== 'out') return fail(blocked(w).length ? '管路还堵着，不能复查。' : '清洗球还没推过整条管，出口不是清水。');
        if (!w.hopper) return fail('料斗里还有余浆。');
        if (w.segs.some(g => g.open) || (w.seal >= 0 && !w.sealFixed)) return fail('管卡没装好或密封圈损坏，会漏浆。');
        if (!w.nozzle) return fail('喷嘴还没拆洗。');
        if (w.scenario === 'winter' && !w.drained) return fail('冬季要停用一周：泵和管里的存水还没放空，会冻裂。');
        if (w.pressure > 0) return fail('压力表没回零。先断电挂牌、泄压。');
        w.verified = true; w.unresolved = [];
        record(s, 'mortar', w, true);
        return ok('复查：出口清水、料斗和管路无余浆、管卡密封完好' + (w.drained ? '、存水已放空' : '') + '。已记入交接记录。');
      }
      case 'handoff': {
        if (w.verified || w.handoff) return fail('这一单已经结束。');
        if (!w.prepared) return fail('先停止上料，再移交。');
        const issues = blocked(w).map(i => segName(i) + '堵管未疏通');
        if (w.pressure > 0) issues.push('管路未泄压（压力表 ' + w.pressure + ' 格）');
        if (w.ball !== 'out' && !issues.length) issues.push('管内残浆未推出');
        if (!issues.length) issues.push('未发现异常的项目也一并移交，待确认');
        w.handoff = true; w.unresolved = issues;
        record(s, 'mortar', w, false);
        return ok('已移交，问题原样保留在交接记录里，不算修好。');
      }
      default: return s;
    }
  }

  function record(s, id, w, resolved) {
    const key = id + ':' + w.scenario;
    s.records = (s.records || []).filter(r => r.id !== key);
    s.records.push({id: key, station: id, scenario: w.scenario, resolved, unresolved: [...w.unresolved], checked: Object.keys(w.checked)});
  }

  const api = {STATIONS, IDS, FINDINGS, SAFE_TEMP, SPRAY, MORTAR, initial, fresh, reduce, finding, abnormal, allChecked, label, blocked, ticking, rinseLook};
  g.MaintModel = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);

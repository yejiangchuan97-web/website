const {test} = require('node:test'), assert = require('node:assert/strict'), M = require('../src/maint.model.js');
const run = (s, ...events) => events.reduce((x, e) => M.reduce(x, typeof e === 'string' ? {type: e} : e), s);
const at = (station, scenario = 'normal') => run(M.initial(), {type: 'station', value: station}, {type: 'case', value: scenario});
const ready = (station, scenario) => run(at(station, scenario), 'prepare', 'isolate', 'energy');
const OLD = ['engine', 'excavator'];
const inspectAll = (s, station) => run(s, ...M.STATIONS[station].points.map(([point]) => ({type: 'inspect', point})));

test('四个工位共用同一条流程：准备 → 隔离 → 能量确认，顺序不能跳', () => {
  for (const id of M.IDS) {
    let s = run(at(id), 'isolate'); assert(s.error); assert(!s.work[id].isolated);
    s = run(at(id), 'energy'); assert(s.error);
    s = ready(id); assert(s.work[id].prepared && s.work[id].isolated && s.work[id].energy);
  }
});

test('发动机还烫时开冷却液盖被拦下，并记为“抢步”尝试', () => {
  let s = run(at('engine'), 'prepare', 'isolate', {type: 'inspect', point: 'coolant'});
  assert(s.error); assert(!s.work.engine.checked.coolant); assert(s.tried.engine.early);
  assert(s.work.engine.temp > M.SAFE_TEMP);
  s = run(s, 'energy'); assert(s.work.engine.temp <= M.SAFE_TEMP);
  s = run(s, {type: 'inspect', point: 'coolant'}); assert(!s.error); assert(s.work.engine.checked.coolant);
});

test('挖掘机铲斗未落地就去检查铰点被拦下', () => {
  const s = run(at('excavator'), {type: 'inspect', point: 'bucketPin'});
  assert(s.error); assert(s.tried.excavator.early); assert(!s.work.excavator.checked.bucketPin);
});

test('正常案例：检查全部点、核对资料、用指定材料处理后才能复查', () => {
  for (const id of OLD) {
    let s = ready(id);
    s = run(s, 'service'); assert(s.error, id + ' 未检查完不能处理');
    s = inspectAll(s, id); s = run(s, 'service'); assert(s.error, id + ' 未核对资料不能处理');
    s = run(s, 'read', {type: 'material', value: 'mixed'}, 'service'); assert(s.error); assert(s.tried[id].material);
    s = run(s, {type: 'material', value: 'spec'});
    s = run(s, 'verify'); assert(s.error, id + ' 处理没做完不能复查');
    for (let i = 0; i < M.STATIONS[id].points.length; i++) s = run(s, 'service');
    assert.equal(s.work[id].progress, 1);
    s = run(s, 'verify'); assert(s.work[id].verified);
    assert(s.records.some(r => r.station === id && r.scenario === 'normal' && r.resolved));
  }
});

test('挖掘机逐点加注：每个点只加一次，进度按点数计算', () => {
  let s = run(inspectAll(ready('excavator'), 'excavator'), 'read', {type: 'service', point: 'boomFoot'}, {type: 'service', point: 'boomFoot'});
  assert.equal(s.work.excavator.progress, 1 / 6);
});

for (const [id, scenario, point] of [['engine', 'leak', 'under'], ['engine', 'belt', 'belt'], ['excavator', 'seep', 'boomRod'], ['excavator', 'loose', 'bucketPin']]) {
  test(`${id}/${scenario}：发现异常后不能常规处理，移交后保留未解决`, () => {
    let s = run(ready(id, scenario), {type: 'inspect', point});
    assert(s.error); assert(s.work[id].checked[point]);
    s = run(inspectAll(s, id), 'read', 'service'); assert(s.error); assert.equal(s.work[id].progress, 0);
    s = run(s, 'handoff'); assert(s.work[id].handoff); assert(!s.work[id].verified);
    const r = s.records.find(x => x.id === id + ':' + scenario); assert(r && !r.resolved && r.unresolved.length);
  });
}

test('资料不明：核对资料后不能补加/加注，只能移交', () => {
  for (const id of OLD) {
    let s = run(inspectAll(ready(id, 'unknown'), id), 'read');
    assert(s.error);
    s = run(s, 'service'); assert(s.error); assert.equal(s.work[id].progress, 0);
    s = run(s, 'handoff');
    assert(s.records.find(r => r.id === id + ':unknown' && !r.resolved && r.unresolved.some(u => u.includes('资料缺失'))));
  }
});

test('换情境、换工位都保留交接记录；清空才归零', () => {
  let s = run(ready('engine', 'leak'), {type: 'inspect', point: 'under'}, 'handoff', {type: 'case', value: 'normal'}, {type: 'station', value: 'excavator'});
  assert(s.records.some(r => r.id === 'engine:leak'));
  assert.equal(s.work.engine.scenario, 'normal');
  s = run(s, 'reset-all'); assert.equal(s.records.length, 0);
});

/* —— 工位③ 喷涂管路清洗 —— */
const ticks = (s, sec) => { for (let t = 0; t < sec; t += .5) s = M.reduce(s, {type: 'tick', dt: .5}); return s; };
const sprayFlushed = (scenario, liquid) => {
  let s = run(ready('spray', scenario), {type: 'liquid', value: liquid}, 'suction', 'flush');
  s = ticks(s, 20); return run(s, 'flush');
};
const cleanParts = s => run(s, ...M.STATIONS.spray.points.flatMap(([point]) => [{type: 'part', point}, {type: 'part', point}]));

test('喷涂：压力没回零就拆枪被拦下（高压注射伤），记为抢步', () => {
  let s = run(at('spray', 'water'), 'prepare', 'isolate', {type: 'part', point: 'nozzle'});
  assert(s.error); assert(/高压注射伤/.test(s.message)); assert(s.tried.spray.early); assert(!s.work.spray.checked.nozzle);
  assert(s.work.spray.pressure > 0);
  s = run(s, 'energy'); assert.equal(s.work.spray.pressure, 0);
});

test('喷涂：冲洗要摘牌送电；停泵后必须重新断电、泄压才能拆', () => {
  let s = sprayFlushed('water', 'water');
  assert(s.work.spray.flushed); assert(!s.work.spray.isolated); assert(s.work.spray.pressure > 0);
  s = run(s, {type: 'part', point: 'gunFilter'}); assert(s.error); assert(s.tried.spray.early);
  s = run(s, 'isolate', 'energy', {type: 'part', point: 'gunFilter'}); assert(!s.error); assert(s.work.spray.checked.gunFilter);
});

test('喷涂：样杯随冲洗变清；没变清就停泵，复查不通过', () => {
  let s = run(ready('spray', 'water'), {type: 'liquid', value: 'water'}, 'suction', 'flush');
  assert(s.work.spray.flushing); assert(M.ticking(s));
  s = ticks(s, 3); const mid = s.work.spray.rinse; assert(mid > 0 && mid < M.SPRAY.clear);
  s = run(s, 'flush', 'isolate', 'energy'); s = cleanParts(s);
  s = run(s, {type: 'store', value: 'protect'}, 'waste', 'verify'); assert(s.error); assert(!s.work.spray.verified);
  s = run(s, 'flush'); s = ticks(s, 20); s = run(s, 'flush', 'isolate', 'energy', 'verify');
  assert(s.work.spray.verified); assert(s.records.some(r => r.id === 'spray:water' && r.resolved));
});

test('喷涂：按涂料类型选清洗液——水性用清水，油性用配套溶剂，不明稀料不行', () => {
  let s = run(ready('spray', 'oil'), {type: 'liquid', value: 'water'}, 'suction', 'flush');
  assert(s.error); assert(s.tried.spray.liquid); assert(!s.work.spray.flushing);
  s = run(s, {type: 'liquid', value: 'thinner'}, 'flush'); assert(s.error);
  s = run(s, {type: 'liquid', value: 'solvent'}, 'flush'); assert(s.work.spray.flushing);
  s = run(ready('spray', 'water'), {type: 'liquid', value: 'solvent'}, 'suction', 'flush'); assert(s.error);
});

test('喷涂“喷幅变窄”：拆开后找到堵住的是枪内滤网，洗净后复查通过', () => {
  let s = run(sprayFlushed('clog', 'water'), 'isolate', 'energy', {type: 'part', point: 'nozzle'});
  assert(!s.tried.spray.found);
  s = run(s, {type: 'part', point: 'gunFilter'}); assert(s.tried.spray.found);
  assert(M.finding('spray', 'clog', 'gunFilter').abnormal); assert(!M.finding('spray', 'water', 'gunFilter').abnormal);
  s = cleanParts(s); assert.equal(s.work.spray.progress, 1);
  s = run(s, 'verify'); assert(s.error, '还没灌保护液/排空、没倒废液');
  s = run(s, {type: 'store', value: 'empty'}, 'waste', 'verify'); assert(s.work.spray.verified);
});

/* —— 工位④ 砂浆管道清洗 —— */
const mortarReady = scenario => run(ready('mortar', scenario), 'hopper', {type: 'aim', value: 'tank'});

test('砂浆：停泵后残浆按段变硬，靠喷枪的段先堵；等太久就堵管', () => {
  let s = run(at('mortar'), 'prepare');
  assert(M.ticking(s)); assert.deepEqual(M.blocked(s.work.mortar), []);
  s = ticks(s, 60); const set = s.work.mortar.segs.map(g => g.set);
  assert(set[3] > set[2] && set[2] > set[1] && set[1] > set[0], '越靠喷枪越快');
  s = ticks(s, 60); assert(M.blocked(s.work.mortar).includes(3));
});

test('砂浆：及时推球——出口对准沉淀桶，一次推出，计时停止', () => {
  let s = run(mortarReady('normal'), 'ball');
  const w = s.work.mortar; assert.equal(w.ball, 'out'); assert(!w.stuckOnce); assert(w.segs.every(g => g.clear)); assert(!M.ticking(s));
  s = run(s, 'nozzle'); assert(s.error, '推球送过电，拆喷嘴前要再断电泄压'); assert(s.tried.mortar.early);
  s = run(s, 'isolate', 'energy', 'nozzle', 'verify'); assert(s.work.mortar.verified);
  assert(s.records.some(r => r.id === 'mortar:normal' && r.resolved));
});

test('砂浆：出口对人、对下水口都不能推球', () => {
  let s = run(ready('mortar', 'normal'), 'hopper', {type: 'aim', value: 'person'}, 'ball');
  assert(s.error); assert(s.tried.mortar.person); assert.equal(s.work.mortar.ball, 'none');
  s = run(s, {type: 'aim', value: 'drain'}, 'ball'); assert(s.error); assert(s.tried.mortar.drain);
  s = run(s, {type: 'spot', point: 'tank'}, 'ball'); assert.equal(s.work.mortar.ball, 'out');
});

test('砂浆：料斗有搅拌轴，不断电挂牌不能伸手清理', () => {
  const s = run(at('mortar'), 'prepare', 'hopper');
  assert(s.error); assert(s.tried.mortar.early); assert(!s.work.mortar.hopper);
});

test('砂浆“午休忘洗”：压力异常、球卡在堵段；带压拆管被拦；泄压→分段拆管→敲击疏通后复查', () => {
  let s = run(mortarReady('lunch'), 'ball');
  let w = s.work.mortar;
  assert.equal(w.ball, 'stuck'); assert(w.pressure > M.MORTAR.work, '压力表异常升高'); assert.deepEqual(M.blocked(w), [2, 3]); assert.equal(w.ballAt, 2);
  s = run(s, {type: 'segment', seg: 2}); assert(s.error); assert(!s.work.mortar.segs[2].open, '带压不能拆管卡');
  s = run(s, 'isolate', 'energy');
  for (const i of [2, 3]) s = run(s, {type: 'segment', seg: i}, {type: 'segment', seg: i}, {type: 'segment', seg: i});
  assert(s.tried.mortar.found); assert.deepEqual(M.blocked(s.work.mortar), []);
  assert(s.work.mortar.sealFixed, '堵段里挤坏的密封圈装回时换新');
  s = run(s, 'ball'); assert.equal(s.work.mortar.ball, 'out'); assert(s.work.mortar.stuckOnce);
  s = run(s, 'isolate', 'energy', 'nozzle', 'verify'); assert(s.work.mortar.verified);
});

test('砂浆复查：管卡没装回、喷嘴没洗都不通过', () => {
  let s = run(mortarReady('lunch'), 'ball', 'isolate', 'energy', {type: 'segment', seg: 2}, {type: 'segment', seg: 2}, {type: 'segment', seg: 3}, {type: 'segment', seg: 3});
  s = run(s, 'ball'); assert(s.error, '管卡没装回不能送水');
  s = run(s, 'verify'); assert(s.error);
});

test('砂浆“冬季停用一周”：存水不放空，复查不通过', () => {
  let s = run(mortarReady('winter'), 'ball', 'isolate', 'energy', 'nozzle', 'verify');
  assert(s.error); assert(/冻/.test(s.message));
  s = run(s, 'drain', 'verify'); assert(s.work.mortar.verified);
});

test('清洗工位移交：堵管未疏通原样记为未解决', () => {
  const s = run(mortarReady('lunch'), 'ball', 'handoff');
  const r = s.records.find(x => x.id === 'mortar:lunch'); assert(r && !r.resolved && r.unresolved.some(u => u.includes('堵管')));
});

test('旧版存档（只有两个工位）也能读：缺的工位补成初始状态', () => {
  const old = {station: 'engine', work: {engine: M.fresh('engine'), excavator: M.fresh('excavator')}, records: [], tried: {engine: {}, excavator: {}}};
  const s = M.reduce(old, {type: 'station', value: 'mortar'});
  assert.equal(s.station, 'mortar'); assert(s.work.mortar && s.work.spray);
});

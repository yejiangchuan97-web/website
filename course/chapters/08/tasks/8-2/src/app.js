/* 任务 8-2：状态 + 存储 + 三维场景的连接。对外接口 window.MaintLab（供 stations.js 和验收脚本使用）。 */
(function () {
  'use strict';
  const M = window.MaintModel, KEY = 'course-maintenance-v2';
  let state = M.initial();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    // 旧版只有两个工位：缺的工位补成初始状态，交接记录照样保留
    if (saved && M.IDS.includes(saved.station) && saved.work && Array.isArray(saved.records)) {
      const base = M.initial();
      state = {...base, ...saved, work: {...base.work, ...saved.work}, tried: {...base.tried, ...(saved.tried || {})}, message: '', error: false, last: null};
      for (const id of M.IDS) if (!state.work[id] || state.work[id].scenario == null) state.work[id] = M.fresh(id);
    }
  } catch {}
  const listeners = new Set();
  let saves = 0;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({...state, message: '', error: false})); } catch {} };
  const scene = window.MaintScene.create(document.getElementById('m82Stage'));

  function dispatch(event) {
    state = M.reduce(state, event);
    if (event.type !== 'tick' || ++saves % 8 === 0) save();
    scene?.sync(state, event);
    listeners.forEach(fn => { try { fn(state, event); } catch (e) { console.warn(e); } });
    return state;
  }
  if (scene) {
    scene.onPoint = id => {
      if (M.STATIONS[state.station].kind === 'flush') { dispatch({type: 'spot', point: id}); return; }
      const w = state.work[state.station];
      // 检查完的点再点一次：挖掘机工位加注；其他情况只是把镜头拉近
      if (w.checked[id] && state.station === 'excavator' && !w.done[id]) dispatch({type: 'service', point: id});
      else if (w.checked[id]) { scene.focus(id); listeners.forEach(fn => fn(state, {type: 'look', point: id})); }
      else dispatch({type: 'inspect', point: id});
    };
    scene.sync(state, null);
  }

  /* 课堂计时：喷涂冲洗时样杯慢慢变清；砂浆停泵后管里残浆慢慢变硬。页面在后台时也照走（定时器不依赖画面刷新）。 */
  const TICK = .25;
  setInterval(() => { if (M.ticking(state)) dispatch({type: 'tick', dt: TICK}); }, TICK * 1000);

  function exportRecord() {
    const data = {说明: '课堂案例交接卡，不是维修许可', 记录: state.records.map(r => ({
      工位: M.STATIONS[r.station].label, 情境: M.label(M.STATIONS[r.station].cases, r.scenario),
      结果: r.resolved ? '已复查' : '已移交 · 未解决', 待处理: r.unresolved,
    }))};
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'}));
    const a = document.createElement('a'); a.href = url; a.download = '班后维护交接卡.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  window.MaintLab = {
    state: () => JSON.parse(JSON.stringify(state)),
    dispatch, exportRecord,
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    focus: id => scene?.focus(id),
    frame: () => scene?.frame(),
    top: () => scene?.top(),
    readouts: () => scene?.readouts() || {temp: state.work.engine.temp, pressure: state.work.excavator.pressure, crank: 0, sprayPressure: state.work.spray.pressure, mortarPressure: state.work.mortar.pressure},
    stats: () => scene?.stats() || {webgl: false},
    reset() { state = M.initial(); save(); scene?.sync(state, {type: 'case'}); listeners.forEach(fn => fn(state, {type: 'reset-all'})); },
  };
})();

/* 8-1：把状态模型和三维现场接起来，对外提供 window.SafetyLab（面板 stations.js 只通过它读写）。 */
(() => {
  'use strict';
  const M = window.SafetyModel, host = document.getElementById('site');
  let state = M.initial();
  const listeners = new Set();
  const scene = window.SiteScene.create(host);
  if (!scene.webgl) {
    const note = document.createElement('p'); note.className = 'c8-fallback';
    note.textContent = '这台设备打不开三维画面。可以在上方逐个点危险名称来巡查，右侧面板照常操作。';
    host.append(note);
  }

  function dispatch(ev) {
    state = M.reduce(state, ev);
    scene.update(state);
    listeners.forEach(fn => { try { fn(state, ev); } catch (err) { console.warn(err); } });
    return state;
  }

  // 三维里点到的东西：急停桩直接急停；危险设备算“找到”；空地给一句提示；点标签只是选中并近看
  scene.onPick = (id, fromLabel) => {
    if (id === 'estop') { dispatch({type: 'estop'}); return; }
    if (fromLabel) { dispatch({type: 'select', id}); scene.focus(id); return; }
    dispatch({type: 'find', id});
  };

  const theme = () => scene.theme?.(document.documentElement.dataset.theme === 'dark');
  theme();
  addEventListener('course-theme-change', () => setTimeout(theme));
  new MutationObserver(theme).observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme']});

  scene.update(state);
  window.SafetyLab = {
    model: M, scene,
    state: () => JSON.parse(JSON.stringify(state)),
    dispatch,
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    stage: () => scene.stats?.() || {webgl: false},
  };
})();

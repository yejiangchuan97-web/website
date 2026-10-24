(() => {
  'use strict';
  const shell = document.getElementById('lesson-shell');
  const frames = [...document.querySelectorAll('.lesson-frame')];
  const tabs = [...document.querySelectorAll('.shell-tab')];
  const documents = JSON.parse(document.getElementById('lesson-documents').textContent);
  const pendingThresholds = new Map();
  let messageTimer;
  function fit() {
    const content=document.getElementById('c4-content');
    const scale = Math.min((content?.clientWidth||window.innerWidth) / 1440, (content?.clientHeight||window.innerHeight) / 810);
    shell.style.transform = `scale(${scale})`;
  }
  function message(text) {
    document.getElementById('shell-message').textContent = text;
    clearTimeout(messageTimer);
    messageTimer = setTimeout(() => {document.getElementById('shell-message').textContent = '';}, 4200);
  }
  function thresholdValue(value) {
    if (value === undefined || value === null || String(value).trim() === '') return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 && number <= 1 ? Math.round(number * 100) / 100 : null;
  }
  function sendThreshold(frame, value) {
    if (value === null) return;
    if (frame.dataset.ready === 'true') frame.contentWindow.postMessage({type:'helmet:set-threshold', value}, '*');
    else pendingThresholds.set(frame.dataset.view, value);
  }
  function show(view, {threshold = null, updateHash = true, focus = false} = {}) {
    if (!Object.hasOwn(documents, view)) view = document.body.dataset.startView;
    frames.forEach(frame => {
      const active = frame.dataset.view === view;
      frame.hidden = !active;
      if (active && !frame.dataset.loaded) {
        frame.dataset.loaded = 'true';
        frame.srcdoc = documents[view];
      }
    });
    tabs.forEach(tab => {
      const active = tab.dataset.view === view;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focus) tab.focus();
    });
    sendThreshold(frames.find(frame => frame.dataset.view === view), thresholdValue(threshold));
    document.title = `安全帽与 YOLO · ${tabs.find(tab => tab.dataset.view === view).querySelector('strong').textContent}实验`;
    if (updateHash) {
      const value = thresholdValue(threshold);
      const hash = '#' + view + (value !== null ? `?threshold=${value.toFixed(2)}` : '');
      if (location.hash !== hash) {
        try {history.pushState(null, '', hash);} catch {location.hash = hash;}
      }
    }
    window.dispatchEvent(new Event('c4-route-change'));
  }
  function readRoute() {
    const [hash, query = ''] = location.hash.slice(1).split('?');
    const params = new URLSearchParams(query || location.search);
    show(hash || document.body.dataset.startView, {threshold:params.get('threshold'), updateHash:false});
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => show(tab.dataset.view));
    tab.addEventListener('keydown', event => {
      const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
      if (next !== null) {event.preventDefault(); show(tabs[next].dataset.view, {focus:true});}
    });
  });
  window.addEventListener('message', event => {
    const frame = frames.find(frame => frame.contentWindow === event.source);
    if (!frame || !event.data || typeof event.data !== 'object') return;
    if (event.data.type === 'helmet:ready') {
      frame.dataset.ready = 'true';
      if (pendingThresholds.has(frame.dataset.view)) {
        sendThreshold(frame, pendingThresholds.get(frame.dataset.view));
        pendingThresholds.delete(frame.dataset.view);
      }
    }
    if (event.data.type === 'helmet:navigate' && Object.hasOwn(documents, event.data.view)) {
      show(event.data.view, {threshold:thresholdValue(event.data.threshold), focus:true});
    }
  });
  document.getElementById('fullscreen-button').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else message('当前浏览器不支持全屏，可使用浏览器的全屏功能。');
    } catch {message('当前浏览器未能进入全屏，可使用浏览器的全屏功能。');}
  });
  document.addEventListener('fullscreenchange', () => {
    document.getElementById('fullscreen-button').textContent = document.fullscreenElement ? '退出全屏 ↙' : '全屏演示 ↗';
    fit();
  });
  document.getElementById('share-button').addEventListener('click', async () => {
    if (location.protocol === 'file:') {
      message('把当前这个 HTML 文件发给对方即可，标注、预测、评估和图片已全部包含在里面。');
      return;
    }
    try {await navigator.clipboard.writeText(location.href); message('已复制当前实验链接，打开后也能切换全部三个实验。');}
    catch {message('复制浏览器地址即可分享，打开后可切换全部三个实验。');}
  });
  window.addEventListener('hashchange', readRoute);
  window.addEventListener('popstate', readRoute);
  window.addEventListener('resize', fit);
  fit();
  readRoute();
})();

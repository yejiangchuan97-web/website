/* 课程任务页外壳（第二章起使用）：页头（本章任务）→ 工位条 → 三维区 + 操作面板。
 * 两种用法：
 *   LabShell.embedded(cfg)  三维区放原版实验页（iframe，嵌入模式只显示三维视图），面板通过 postMessage 驱动原模型。（第二章）
 *   LabShell.native(cfg)    页面自己的三维区与原有控件直接搬进外壳，面板里重新编排，状态由 cfg.poll() 读取。（第三章）
 * 菜单只有两层；面板里没有标签页，也没有“学习目标/学习任务”。设计规范见 course/设计规范.md。
 */
(() => {
  'use strict';
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const href = p => (window.courseHref ? window.courseHref(p) : p);
  const fmt = (v, n = 0) => (Number.isFinite(v) ? (Math.abs(v) < Math.pow(10, -n) / 2 ? 0 : v).toFixed(n) : '—');

  /** 外壳 CSS 里的三维区取值（浅色、深色各一份），传给嵌入的原版实验页。 */
  function stageTones() {
    const out = {};
    for (const t of ['light', 'dark']) {
      const probe = document.createElement('i'); probe.dataset.stageTone = t; probe.hidden = true;
      document.body.append(probe);
      const cs = getComputedStyle(probe), v = n => cs.getPropertyValue(n).trim();
      out[t] = {bg: v('--stage-bg'), floor: v('--stage-floor'), shadow: v('--stage-shadow')};
      probe.remove();
    }
    return out;
  }

  function start(cfg) {
    const native = Boolean(cfg.native);
    document.title = `${cfg.task} ${cfg.title}｜智能建筑机械与机器人`;
    document.documentElement.dataset.c2Lab = cfg.task;
    document.documentElement.classList.add('lab-shell', native ? 'lab-native' : 'lab-embedded');
    const store = 'c2-progress-' + (cfg.progressKey || cfg.task);
    let progress = {};
    try { progress = JSON.parse(localStorage.getItem(store) || '{}') || {}; } catch {}
    const save = () => { try { localStorage.setItem(store, JSON.stringify(progress)); } catch {} };

    /* 页头 */
    const top = h('header', 'c2-top course-nav');
    // 左上角回主页（同章任务在页头中间互相跳转，不必再回章节封面）；主页定位到本章展台
    const no = (String(cfg.chapter.href || '').match(/chapters\/0?(\d+)\//) || [])[1];
    const back = h('a', 'c2-back', '← 主页'); back.href = href('course/home/index.html' + (no ? '#chapter-' + no : ''));
    back.title = '返回课程主页 · ' + cfg.chapter.title;
    back.append(h('small', 'c2-back-chapter', cfg.chapter.title));
    const tasks = h('nav', 'c2-tasks'); tasks.setAttribute('aria-label', '本章任务');
    for (const t of cfg.tasks) {
      const a = h('a', '', `${t.label || t.id} ${t.short || t.title}`); a.href = href(t.href);
      if (t.id === (cfg.taskNav || cfg.task)) a.setAttribute('aria-current', 'page');
      tasks.append(a);
    }
    top.append(back, tasks);
    /* 手机上导航横向滑动：把当前任务、当前工位滑到看得见的位置（只动导航条自己，不带动整页） */
    const reveal = (bar, el) => { if (bar && el && bar.scrollWidth > bar.clientWidth + 2) bar.scrollLeft = el.offsetLeft - bar.offsetLeft - (bar.clientWidth - el.offsetWidth) / 2; };
    requestAnimationFrame(() => reveal(tasks, tasks.querySelector('[aria-current]')));

    /* 工位条 */
    const bar = h('div', 'c2-bar');
    const title = h('div', 'c2-title');
    title.append(h('span', 'c2-task-id', '任务 ' + cfg.task), h('h1', '', cfg.title));
    const tabs = h('div', 'c2-stations'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', '工位');
    bar.append(title, tabs);

    /* 三维区 */
    const main = h('main', 'c2-main');
    const stageBox = h('section', 'c2-stage'); stageBox.setAttribute('aria-label', '三维模型');
    const view = h('div', 'c2-view');
    const loading = h('div', 'c2-loading'); loading.append(h('span', 'c2-spinner'), h('span', '', '正在载入三维模型…'));
    const tools = h('div', 'c2-tools');
    const card = h('div', 'c2-part'); card.hidden = true; card.setAttribute('role', 'status');
    const hint = h('div', 'c2-hint'); hint.setAttribute('aria-hidden', 'true');
    const fs = h('button', 'c2-fs'); fs.type = 'button';
    fs.innerHTML = '<svg class="c2-fs-in" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>'
      + '<svg class="c2-fs-out" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';
    /* 保存三维截图：只存三维画面（统一底色，不带按钮和提示），给做课件、排教材用 */
    const shot = h('button', 'c2-shot'); shot.type = 'button'; shot.title = '保存三维截图（PNG）'; shot.setAttribute('aria-label', '保存三维截图');
    shot.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l1.6-2.4h6.8L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.4"/></svg>';
    view.append(loading, tools, card, hint, fs, shot);
    const strip = h('div', 'c2-strip');
    const transportBox = h('div', 'c2-transport');
    const readBox = h('div', 'c2-readouts');
    strip.append(transportBox, readBox);
    stageBox.append(view, strip);

    /* 面板 */
    const panel = h('aside', 'c2-panel'); panel.setAttribute('aria-label', '操作面板');
    const head = h('div', 'c2-panel-head');
    const body = h('div', 'c2-panel-body');
    const feedback = h('div', 'c2-feedback'); feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite');
    const redo = h('button', 'c2-redo', '↺ 重来'); redo.type = 'button'; redo.title = '把这个工位恢复到开始的样子';
    const next = h('button', 'c2-btn c2-primary c2-next', '去下一站 →'); next.type = 'button';
    const credit = h('div', 'c2-credit'); credit.hidden = true;
    panel.append(head, body, credit);
    view.append(feedback);
    let toastTimer = 0;
    main.append(stageBox, panel);
    /* 原页面里暂时不用的控件停放处（仍在文档里，原有程序照常工作） */
    const parking = h('div', 'c2-parking'); parking.hidden = true;
    document.body.append(top, bar, main, parking);
    if (native) {
      loading.hidden = true;
      if (cfg.stage) { cfg.stage.classList.add('c2-native-stage'); view.prepend(cfg.stage); }
      if (cfg.stageTop) { const topRow = h('div', 'c2-stage-top'); topRow.append(...[].concat(cfg.stageTop).filter(Boolean)); stageBox.prepend(topRow); }
      if (cfg.redo === false) redo.hidden = true;
    }

    /* 全屏：整块三维区（三维视图 + 上方选择条 + 提示条）。进出全屏都补发 resize，Esc 退出。 */
    const full = () => document.fullscreenElement === stageBox || stageBox.classList.contains('c2-full-fallback');
    const relayout = () => { for (const t of [0, 80, 300]) setTimeout(() => { dispatchEvent(new Event('resize')); frame?.contentWindow?.postMessage({c2: 'cmd', op: 'resize'}, '*'); }, t); };
    const syncFs = () => {
      const on = full();
      stageBox.classList.toggle('c2-full', on);
      fs.setAttribute('aria-pressed', String(on));
      fs.setAttribute('aria-label', on ? '退出全屏' : '全屏查看三维模型');
      fs.title = on ? '退出全屏（Esc）' : '全屏';
    };
    const setFull = async on => {
      if (on === full()) return;
      if (document.fullscreenEnabled && stageBox.requestFullscreen) {
        try { if (on) await stageBox.requestFullscreen(); else await document.exitFullscreen(); return; } catch { /* 改用铺满窗口 */ }
      }
      stageBox.classList.toggle('c2-full-fallback', on); syncFs(); relayout();
    };
    fs.addEventListener('click', () => setFull(!full()));
    /* 全屏时停手 2.5 秒，右上角按钮自动隐去——整屏截图里只有模型和它自己的标注 */
    let idleTimer = 0;
    const wake = () => { stageBox.classList.remove('c2-idle'); clearTimeout(idleTimer); idleTimer = setTimeout(() => stageBox.classList.add('c2-idle'), 2500); };
    for (const name of ['pointermove', 'pointerdown', 'keydown']) stageBox.addEventListener(name, wake, {passive: true});
    wake();
    const saveShot = url => {
      shot.classList.remove('busy');
      if (!url) { ctx?.feedback?.('这个画面暂时存不了，试试全屏后用系统截图。', 'warn'); return; }
      const stamp = new Date(), two = n => String(n).padStart(2, '0');
      const a = document.createElement('a'); a.href = url;
      a.download = `${cfg.task}-${cfg.stations[current]?.name || '三维'}-${two(stamp.getHours())}${two(stamp.getMinutes())}${two(stamp.getSeconds())}.png`;
      document.body.append(a); a.click(); a.remove();
      ctx?.feedback?.('三维截图已保存。想要更大的图，先点全屏再存。', 'ok');
    };
    shot.addEventListener('click', () => {
      shot.classList.add('busy');
      if (frame) frame.contentWindow?.postMessage({c2: 'cmd', op: 'capture'}, '*');
      else (window.StageTone?.capture?.(view) || Promise.resolve(null)).then(saveShot);
    });
    document.addEventListener('fullscreenchange', () => { syncFs(); relayout(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && stageBox.classList.contains('c2-full-fallback')) setFull(false); });
    syncFs();

    /* 操作提示：只出现一次，第一次拖动、滚轮或几秒后淡出 */
    let hintDone = false, hintTimer = 0;
    const dismissHint = () => { if (hintDone) return; hintDone = true; clearTimeout(hintTimer); hint.classList.add('gone'); setTimeout(() => { hint.hidden = true; }, 700); };
    for (const type of ['pointerdown', 'wheel']) view.addEventListener(type, dismissHint, {passive: true, capture: true});
    window.addEventListener('blur', () => { if (document.activeElement === frame) dismissHint(); }); // 第二章：在 iframe 里的第一次操作

    let current = -1, ctx = null, frame = null, cleanup = [], floorAll = () => {};
    const tabButtons = cfg.stations.map((s, i) => {
      const b = h('button', 'c2-station'); b.type = 'button'; b.setAttribute('role', 'tab');
      b.append(h('span', 'c2-num', String(i + 1)), h('span', 'c2-name', s.name), h('span', 'c2-check', '✓'));
      b.addEventListener('click', () => select(i));
      b.addEventListener('keydown', e => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault(); const j = (i + (e.key === 'ArrowRight' ? 1 : -1) + cfg.stations.length) % cfg.stations.length;
        select(j); tabButtons[j].focus();
      });
      tabs.append(b);
      return b;
    });
    const syncTabs = () => tabButtons.forEach((b, i) => {
      b.setAttribute('aria-selected', String(i === current)); b.tabIndex = i === current ? 0 : -1;
      b.classList.toggle('done', Boolean(progress[cfg.stations[i].id]));
      if (i === current) reveal(tabs, b);
    });

    /* 嵌入模式：与原版实验页通信（只用 postMessage，file:// 打开也能用） */
    window.addEventListener('message', e => {
      const d = e.data;
      if (!d || d.c2 !== 'lab' || !frame || e.source !== frame.contentWindow) return;
      if (d.type === 'ready' || (d.type === 'state' && ctx && !ctx.lab.ready)) { loading.hidden = true; sendTheme(); ctx?._ready(); }
      if (d.type === 'state') ctx?._state(d.data);
      if (d.type === 'shot') saveShot(d.url);
    });
    // 主题和三维区底色一起传给原版实验页，嵌入的三维视图与外壳同一底色
    const sendTheme = () => frame?.contentWindow?.postMessage({c2: 'cmd', op: 'theme', value: window.CourseTheme?.get?.() || 'light', stage: stageTones()}, '*');
    window.addEventListener('course-theme-change', sendTheme);

    // 原页面的控件始终留在文档里（原程序可能随时读写它们），换工位时先放回停放处
    function parkAll() { for (const root of [body, readBox]) root.querySelectorAll('[data-c2-adopted]').forEach(n => parking.append(n)); }

    function select(i, fromHash, fromPage) {
      if (i === current) return;
      cleanup.forEach(f => f()); cleanup = [];
      current = i;
      const s = cfg.stations[i];
      if (!fromHash) history.replaceState(null, '', '#' + s.id);
      const ht = h('div', 'c2-head-row'), name = h('div', 'c2-head-name');
      name.append(h('span', 'c2-head-num', String(i + 1)), h('h2', '', s.name));
      ht.append(name, redo);
      head.replaceChildren(ht, h('p', '', s.lead || ''));
      parkAll();
      body.replaceChildren(); clearTimeout(toastTimer); feedback.textContent = ''; feedback.className = 'c2-feedback';
      transportBox.replaceChildren(); readBox.replaceChildren(); tools.replaceChildren(); card.hidden = true;
      if (!hintDone) {
        hint.textContent = s.hint ?? cfg.hint ?? '拖动旋转 · 滚轮缩放';
        hint.hidden = !hint.textContent;
        clearTimeout(hintTimer); if (!hint.hidden) hintTimer = setTimeout(dismissHint, 9000);
      }
      credit.hidden = true; credit.replaceChildren();
      if (native) {
        if (!fromPage) cfg.select?.(s.id);
      } else {
        frame?.remove();
        frame = h('iframe', 'c2-frame'); frame.title = s.name + '三维模型';
        frame.src = s.src; loading.hidden = false;
        view.prepend(frame);
      }
      ctx = makeContext(s, i);
      cfg.build?.(ctx, s);
      s.build?.(ctx, s);
      if (native) ctx._ready();
      syncTabs();
      // 原页面的渲染器按容器尺寸重新取景；布局稳定后再通知一次
      dispatchEvent(new Event('resize'));
      if (native) for (const t of [60, 300, 900]) setTimeout(() => { dispatchEvent(new Event('resize')); floorAll(); }, t);
    }
    redo.addEventListener('click', () => { const i = current; current = -1; cfg.reset?.(cfg.stations[i].id); select(i); });
    next.addEventListener('click', () => select(Math.min(current + 1, cfg.stations.length - 1)));

    function makeContext(s, index) {
      const stateFns = new Set(), readyFns = new Set();
      let latest = null, ready = false;
      const send = msg => frame?.contentWindow?.postMessage({c2: 'cmd', ...msg}, '*');
      const c = {
        h, fmt, station: s, index, body, native,
        /* —— 原模型 —— */
        lab: {
          click: (sel, i = 0) => send({op: 'click', sel, index: i}),
          clickText: (sel, text) => send({op: 'clickText', sel, text}),
          set: (sel, value) => send({op: 'set', sel, value}),
          call: (path, ...args) => send({op: 'call', path, args}),
          event: name => send({op: 'event', name}),
          get state() { return latest; },
          get ready() { return ready; },
          onState(fn) { stateFns.add(fn); if (latest) fn(latest); },
          onReady(fn) { readyFns.add(fn); if (ready) fn(); },
        },
        _state(data) { latest = data; stateFns.forEach(f => { try { f(data); } catch (err) { console.warn(err); } }); },
        _ready() { if (ready) return; ready = true; readyFns.forEach(f => f()); },
        /** 把原页面里的一个控件（或一组）搬进面板；换工位时自动放回停放处。 */
        adopt(nodes, into) {
          const list = (Array.isArray(nodes) ? nodes : [nodes]).map(n => (typeof n === 'string' ? document.querySelector(n) : n)).filter(Boolean);
          list.forEach(n => { n.dataset.c2Adopted = '1'; n.hidden = false; (into || body).append(n); });
          return list[0];
        },
        /* —— 反馈 —— */
        /** 反馈以提示条形式出现在三维区上方，几秒后自动收起，不挤占面板。 */
        feedback(text, kind = 'info', keep = false) {
          clearTimeout(toastTimer);
          feedback.replaceChildren();
          if (text) feedback.append(h('span', 'c2-toast-icon', kind === 'ok' ? '✓' : kind === 'warn' ? '!' : 'i'), h('span', 'c2-toast-text', text));
          feedback.className = 'c2-feedback ' + kind;
          if (!keep && text) toastTimer = setTimeout(() => { feedback.textContent = ''; feedback.className = 'c2-feedback'; }, kind === 'warn' ? 5000 : 7000);
        },
        showPart(name, desc) {
          if (!name) { card.hidden = true; return; }
          card.replaceChildren(h('strong', '', name), h('span', '', desc || ''));
          const x = h('button', 'c2-x', '×'); x.type = 'button'; x.setAttribute('aria-label', '关闭'); x.onclick = () => { card.hidden = true; };
          card.append(x); card.hidden = false;
        },
        /** 模型来源与许可：面板最底下的 ⓘ，点开才显示。lines 为文字数组，link = {href, label}。 */
        credit(lines, link) {
          lines = [].concat(lines || []).filter(Boolean);
          credit.replaceChildren(); credit.hidden = !lines.length;
          if (!lines.length) return;
          const btn = h('button', 'c2-credit-btn'); btn.type = 'button'; btn.setAttribute('aria-expanded', 'false');
          btn.append(h('i', '', 'i'), document.createTextNode('模型来源'));
          btn.title = lines.join('\n');
          const pop = h('div', 'c2-credit-pop'); pop.hidden = true; pop.id = 'c2-credit-' + s.id;
          btn.setAttribute('aria-controls', pop.id);
          for (const l of lines) pop.append(h('p', '', l));
          if (link?.href) { const a = h('a', '', (link.label || '许可证') + ' ↗'); a.href = link.href; a.target = '_blank'; a.rel = 'noopener'; pop.append(h('p')); pop.lastChild.append(a); }
          btn.addEventListener('click', () => { pop.hidden = !pop.hidden; btn.setAttribute('aria-expanded', String(!pop.hidden)); });
          credit.append(pop, btn);
        },
        /* —— 面板控件 —— */
        section(titleText, extra, into = body) {
          const sec = h('section', 'c2-group');
          if (titleText) { const t = h('h3', ''); t.append(h('span', 'c2-h3-text', titleText)); if (extra) t.append(extra); sec.append(t); }
          into.append(sec); return sec;
        },
        button(text, fn, opts = {}) {
          const b = h('button', 'c2-btn' + (opts.primary ? ' c2-primary' : '') + (opts.small ? ' c2-small' : ''), text);
          b.type = 'button'; b.addEventListener('click', fn); if (opts.title) b.title = opts.title; return b;
        },
        row(...items) { const r = h('div', 'c2-row'); r.append(...items); return r; },
        segmented(options, value, onChange, label) {
          const wrap = h('div', 'c2-seg'); wrap.setAttribute('role', 'radiogroup'); if (label) wrap.setAttribute('aria-label', label);
          let currentValue = value;
          const buttons = options.map(o => {
            const b = h('button', '', o.label); b.type = 'button'; b.setAttribute('role', 'radio'); if (o.title) b.title = o.title;
            b.addEventListener('click', () => { set(o.value); onChange(o.value); });
            wrap.append(b); return [o.value, b];
          });
          const set = v => { currentValue = v; buttons.forEach(([val, b]) => b.setAttribute('aria-checked', String(val === v))); };
          set(value);
          return {el: wrap, set, get: () => currentValue};
        },
        slider({label, min, max, step = 1, value, unit = '', format, onInput}) {
          const wrap = h('label', 'c2-slider');
          const t = h('span', 'c2-slider-top'), name = h('span', '', label), out = h('output', '');
          t.append(name, out);
          const input = h('input'); input.type = 'range'; Object.assign(input, {min, max, step, value});
          const show = v => {
            out.textContent = (format ? format(+v) : v) + (unit ? ' ' + unit : '');
            input.style.setProperty('--p', ((+v - min) / (max - min || 1) * 100).toFixed(1) + '%');
          };
          let touching = 0;
          input.addEventListener('input', () => { touching = performance.now(); show(input.value); onInput(+input.value); });
          show(value); wrap.append(t, input);
          return {
            el: wrap, input,
            /** 跟随模型同步显示；用户正在拖动时不打断。 */
            sync(v) { if (performance.now() - touching < 700 || !Number.isFinite(v)) return; if (Math.abs(+input.value - v) > 1e-9) { input.value = v; show(input.value); } },
            set(v) { input.value = v; show(v); }, get: () => +input.value,
          };
        },
        toggle(label, value, onChange) {
          const b = h('button', 'c2-switch'); b.type = 'button'; b.setAttribute('role', 'switch');
          b.append(h('span', 'c2-knob'), h('span', '', label));
          const set = v => b.setAttribute('aria-checked', String(Boolean(v)));
          b.addEventListener('click', () => { const v = b.getAttribute('aria-checked') !== 'true'; set(v); onChange(v); });
          set(value);
          return {el: b, set};
        },
        /** 部件快捷：点一下镜头飞过去。 */
        chips(items, onPick) {
          const wrap = h('div', 'c2-chips');
          const buttons = items.map(it => {
            const b = h('button', 'c2-chip', it.label); b.type = 'button';
            b.addEventListener('click', () => { buttons.forEach(x => x.setAttribute('aria-pressed', String(x === b))); onPick(it); });
            wrap.append(b); return b;
          });
          return {el: wrap, buttons, clear: () => buttons.forEach(x => x.setAttribute('aria-pressed', 'false'))};
        },
        /** 小问题：只用在“看过结果之后”。 */
        choice({prompt, options, answer, onRight, wrong}) {
          const box = h('div', 'c2-choice');
          if (prompt) box.append(h('p', 'c2-prompt', prompt));
          const row = h('div', 'c2-options');
          options.forEach((o, i) => {
            const b = h('button', 'c2-opt', o); b.type = 'button';
            b.addEventListener('click', () => {
              if (box.dataset.solved) return;
              if (i === answer) { b.classList.add('right'); box.dataset.solved = '1'; [...row.children].forEach(x => { x.disabled = x !== b; }); onRight?.(); }
              else { b.classList.add('wrong'); b.disabled = true; c.feedback(typeof wrong === 'function' ? wrong(i) : (wrong || '再看看模型，再选一次。'), 'warn'); }
            });
            row.append(b);
          });
          box.append(row);
          return box;
        },
        /** 先猜一个数，再让模型跑给你看。onGuess 返回 true/false/undefined。 */
        predict({prompt, unit, onGuess, inline}) {
          const box = h('div', 'c2-predict' + (inline ? ' c2-inline' : ''));
          box.append(h('p', 'c2-prompt', prompt));
          const r = h('div', 'c2-row'), input = h('input'); input.type = 'number'; input.inputMode = 'decimal'; input.setAttribute('aria-label', prompt);
          const go = c.button('试试看', () => {
            const v = parseFloat(input.value);
            if (!Number.isFinite(v)) { c.feedback('先填一个数。', 'warn'); return; }
            const ok = onGuess(v); input.classList.toggle('right', ok === true); input.classList.toggle('wrong', ok === false);
          }, {small: true});
          input.addEventListener('keydown', e => { if (e.key === 'Enter') go.click(); });
          r.append(input, h('span', 'c2-unit', unit || ''), go); box.append(r);
          return {el: box, input};
        },
        /** 试一试：几张挑战卡，不分先后；模型状态满足条件就自动打勾。 */
        challenges(list, titleText = '试一试', into = body) {
          const counter = h('span', 'c2-count');
          const sec = c.section(titleText, counter, into);
          const bar = h('div', 'c2-progress'); const fill = h('span'); bar.append(fill);
          const grid = h('div', 'c2-challenges'); sec.append(bar, grid);
          const done = new Set();
          const items = list.map(ch => {
            const li = h('div', 'c2-challenge');
            const mark = h('span', 'c2-mark', ch.icon || '★');
            const txt = h('div', 'c2-ch-text');
            txt.append(h('b', '', ch.title));
            const sub = h('span', '', ch.hint || ''); txt.append(sub);
            li.append(mark, txt);
            if (ch.action) {
              const go = h('button', 'c2-ch-go', ch.action.label); go.type = 'button';
              go.addEventListener('click', e => { e.stopPropagation(); ch.action.fn(); });
              txt.append(go);
            }
            grid.append(li);
            return {ch, li, sub, mark};
          });
          const update = () => { counter.textContent = `${done.size} / ${list.length}`; fill.style.width = (done.size / list.length * 100) + '%'; };
          const complete = id => {
            if (done.has(id)) return;
            const it = items.find(x => x.ch.id === id); if (!it) return;
            done.add(id); it.li.classList.add('done'); it.mark.textContent = '✓';
            if (it.ch.result) c.feedback(it.ch.title + '：' + it.ch.result, 'ok');
            it.sub.textContent = '完成';
            update();
            if (done.size === list.length) {
              progress[s.id] = true; save(); syncTabs();
              setTimeout(() => {
                if (ctx !== c) return;
                c.feedback(current < cfg.stations.length - 1 ? '这一站的挑战都完成了！' : '本任务的挑战都完成了！还可以接着随便调一调。', 'ok', current < cfg.stations.length - 1);
                if (current < cfg.stations.length - 1) feedback.append(next);
              }, 2600);
            }
          };
          c.lab.onState(st => { for (const it of items) if (!done.has(it.ch.id)) { try { if (it.ch.check?.(st)) complete(it.ch.id); } catch {} } });
          update();
          return {complete, isDone: id => done.has(id), section: sec};
        },
        /* —— 三维区：工具、播放、读数 —— */
        view(text, fn, titleText) { const b = h('button', 'c2-tool', text); b.type = 'button'; if (titleText) b.title = titleText; b.addEventListener('click', fn); tools.append(b); return b; },
        /** 三维区左上角的一组单选（如 剖开 / 完整 / 去掉外壳）。 */
        toolSeg(options, value, onChange, label) {
          const seg = c.segmented(options, value, onChange, label); seg.el.classList.add('c2-toolseg'); tools.append(seg.el); return seg;
        },
        tool(text, onToggle, pressed = false) {
          const b = h('button', 'c2-tool', text); b.type = 'button'; b.setAttribute('aria-pressed', String(pressed));
          b.addEventListener('click', () => { const p = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(p)); onToggle(p); });
          tools.append(b); return {el: b, set: p => b.setAttribute('aria-pressed', String(Boolean(p)))};
        },
        transport({onToggle, onStep, onReset, stepText = '单步', extra, speeds, onSpeed, speed}) {
          const play = h('button', 'c2-play', ''); play.type = 'button';
          const set = p => { play.textContent = p ? '❚❚ 暂停' : '▶ 运行'; play.setAttribute('aria-pressed', String(Boolean(p))); };
          play.addEventListener('click', () => { const p = play.getAttribute('aria-pressed') !== 'true'; set(p); onToggle(p); });
          set(false); transportBox.append(play);
          if (onStep) { const st = h('button', 'c2-tool', stepText); st.type = 'button'; st.addEventListener('click', onStep); transportBox.append(st); }
          if (onReset) { const rs = h('button', 'c2-tool', '复位'); rs.type = 'button'; rs.addEventListener('click', onReset); transportBox.append(rs); }
          let speedSeg = null;
          if (speeds) { speedSeg = c.segmented(speeds.map(([v, l]) => ({value: v, label: l})), speed ?? speeds[0][0], onSpeed, '快慢'); speedSeg.el.classList.add('c2-speed'); transportBox.append(speedSeg.el); }
          if (extra) transportBox.append(extra);
          return {setPlaying: set, setSpeed: v => speedSeg?.set(v)};
        },
        /** 把原页面的元素放进三维区底部一栏。 */
        stripAdopt(nodes) { const list = (Array.isArray(nodes) ? nodes : [nodes]).map(n => (typeof n === 'string' ? document.querySelector(n) : n)).filter(Boolean); list.forEach(n => { n.dataset.c2Adopted = '1'; readBox.append(n); }); },
        readouts(defs) {
          const cells = {};
          readBox.replaceChildren();
          for (const d of defs) {
            const cell = h('div', 'c2-read'), v = h('b', '', '—'), u = h('small', '', d.unit || '');
            const val = h('span', 'c2-val'); val.append(v, u);
            cell.append(h('span', 'c2-read-label', d.label), val);
            readBox.append(cell); cells[d.id] = {v, u, cell};
          }
          return (id, value, unit) => {
            const x = cells[id]; if (!x) return;
            if (x.v.textContent !== String(value)) x.v.textContent = value;
            if (unit != null && x.u.textContent !== unit) x.u.textContent = unit;
          };
        },
        onCleanup(fn) { cleanup.push(fn); },
      };
      return c;
    }

    /* 字号下限与字体统一（原地模式）：搬进外壳的原页面文字——面板、三维区里的浮层与 SVG 标注。
       不小于 13px、面板段落不小于 14px（手机同此）；大屏（≥ 1680×860）上为 14.5 / 15.5px。SVG 标注按屏幕实际大小计，不小于 12px。
       原页面按 1600×900 整页缩放设计，常有 7～11px 的小字，这里统一放大到可读、可投影的字号；
       低价值的小字（英文小标、图号、重复的操作提示）由各任务 stations.css 直接隐藏。
       字体：原页面各用各的（Consolas、Segoe UI、Arial、自带等宽字体……），这里统一成外壳的两种——
       等宽字体写的数字、读数、编号换成 --font-num，其余换成正文字体。 */
    const big = matchMedia('(min-width:1680px) and (min-height:860px)');
    const MONO = /mono|consolas|cascadia|courier|menlo|sf mono/i, OURS = /^"?(PingFang SC|Microsoft YaHei|DIN Alternate)/i;
    const floorText = root => {
      if (!root?.querySelectorAll) return;
      const MIN_TEXT = big.matches ? 14.5 : 13, MIN_PARA = big.matches ? 15.5 : 14;
      for (const el of [root, ...root.querySelectorAll('*')]) {
        if (el.closest('.c2-parking, .c3-legacy, script, style')) continue;
        if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.position === 'absolute' && cs.clip !== 'auto' && /rect\(0/.test(cs.clip)) continue;
        if (!OURS.test(cs.fontFamily) && !el.dataset.c2Font) {
          el.dataset.c2Font = '1';
          el.style.setProperty('font-family', MONO.test(cs.fontFamily) ? 'var(--font-num)' : 'var(--font-ui)', 'important');
          if (MONO.test(cs.fontFamily)) el.style.fontVariantNumeric = 'tabular-nums';
        }
        const size = parseFloat(cs.fontSize);
        if (el instanceof SVGElement) {
          const m = el.getScreenCTM?.(), k = m ? Math.hypot(m.a, m.b) : 1;
          if (k > 0 && size * k < 12 - .05) el.style.fontSize = (12 / k).toFixed(2) + 'px';
          continue;
        }
        const min = el.tagName === 'P' && el.closest('.c2-panel') ? MIN_PARA : MIN_TEXT;
        if (size < min - .05) el.style.setProperty('font-size', min + 'px', 'important');
      }
    };
    if (native) {
      // 观察者回调在本轮脚本结束、画面重绘之前执行：原页面每帧重写的读数也不会先以小字闪现
      const mo = new MutationObserver(recs => {
        const seen = new Set();
        for (const r of recs) for (const n of r.addedNodes) {
          const el = n.nodeType === 1 ? n : n.parentElement;
          if (el && el.isConnected && !seen.has(el)) { seen.add(el); floorText(el); }
        }
      });
      for (const root of [panel, stageBox]) mo.observe(root, {childList: true, subtree: true});
      window.addEventListener('course-theme-change', () => floorText(stageBox));
      floorAll = () => { floorText(panel); floorText(stageBox); };
    }

    /* 原地模式：定时读原页面状态；原页面自己切换了活动时，工位条跟着变 */
    if (native) {
      setInterval(() => {
        let st = null;
        try { st = cfg.poll?.(); } catch (err) { /* 页面尚未就绪 */ }
        if (st && ctx) ctx._state(st);
        const pageStation = cfg.current?.();
        if (pageStation) { const j = cfg.stations.findIndex(s => s.id === pageStation); if (j >= 0 && j !== current) select(j, false, true); }
      }, 200);
    }

    const fromHash = () => {
      const id = location.hash.slice(1), i = cfg.stations.findIndex(s => s.id === id);
      return i >= 0 ? i : 0;
    };
    window.addEventListener('hashchange', () => select(fromHash(), true));
    select(fromHash(), true);
    window.c2Lab = {select, setFull, get ctx() { return ctx; }, get frame() { return frame; }, get current() { return current; }};
  }

  window.LabShell = {
    embedded: start,
    native: cfg => start({...cfg, native: true}),
  };
  window.C2Lab = {start};
})();

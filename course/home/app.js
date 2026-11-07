/* 课程首页：概览（八章转台）与章节（#chapter-N）是同一页面的两个镜头状态。
 * 地址里的 #chapter-N 决定显示哪一章；任务页左上角“← 主页”回到 course/home/index.html#chapter-N 时直接落在本章。 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const data = window.COURSE, stage = window.HomeStage || {webgl: false};
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const href = p => (window.courseHref ? window.courseHref(p) : p);
  const numerals = ['一', '二', '三', '四', '五', '六', '七', '八'];
  const ordinal = n => '第' + numerals[n - 1] + '章';
  const chapter = n => data.chapters.find(c => c.id === n);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const body = document.body;
  const parse = () => { const m = location.hash.match(/^#chapter-([1-8])$/); return m ? Number(m[1]) : null; };
  const taskHref = t => href(t.demo || t.entries[0].file.split('#')[0]);

  /* 本机进度：任务页外壳把各工位完成情况存在 localStorage 'c2-progress-任务号'（只读）。 */
  function progress(id) {
    try { const value = JSON.parse(localStorage.getItem('c2-progress-' + id) || '{}') || {}; return Object.values(value).filter(Boolean).length; } catch { return 0; }
  }

  if (!stage.webgl) body.classList.add('no-webgl');

  /* ---------- 概览 ---------- */
  let focus = 1;
  try { focus = Number(sessionStorage.getItem('home-focus')) || 1; } catch {}
  /* 左侧目录：八章。点章名，右侧展台转到这一章，再点一次进入。 */
  const tint = n => window.HomeExhibits?.chapters[n]?.tint || '#4f97e6';
  const pad = n => String(n).padStart(2, '0');
  /* 每项任务一小段：本机做过的变绿 */
  $('toc').innerHTML = data.chapters.map(c => {
    const done = c.tasks.filter(t => progress(t.id)).length;
    const segs = c.tasks.map(t => `<u${progress(t.id) ? ' class="done"' : ''}></u>`).join('');
    return `<section class="toc-ch" data-chapter="${c.id}" style="--tint:${tint(c.id)}"><button type="button" data-chapter="${c.id}" aria-label="${ordinal(c.id)} ${esc(c.title)}，${c.tasks.length} 项任务"><b>${pad(c.id)}</b><span class="t"><strong>${esc(c.title)}</strong><small><span class="segs" aria-hidden="true">${segs}</span>${done ? `已体验 ${done} / ${c.tasks.length}` : `${c.tasks.length} 项任务`}</small></span><i class="go" aria-hidden="true" title="进入本章">→</i></button></section>`;
  }).join('');
  /* 展台上的编号牌：每章一枚，当前章展开成“章名 + 进入” */
  $('marks').innerHTML = data.chapters.map(c => `<a class="mark" href="#chapter-${c.id}" data-chapter="${c.id}" tabindex="-1" style="--tint:${tint(c.id)}"><b>${pad(c.id)}</b><span>${esc(c.title)}</span><i>→</i></a>`).join('');
  const marks = [...$('marks').children];
  $('marks').addEventListener('click', e => {
    const a = e.target.closest('.mark'); if (!a) return;
    const n = Number(a.dataset.chapter);
    if (n !== focus) { e.preventDefault(); go(n); }
  });
  /* 背景大数字与全页识别色跟随当前章 */
  let ghostValue = '';
  function setGhost(n) {
    const g = $('ghost'), value = pad(n);
    $('app').style.setProperty('--tint', tint(n));
    if (value === ghostValue) return;
    ghostValue = value; g.textContent = value;
    if (!body.classList.contains('boot')) { g.classList.remove('swap'); void g.offsetWidth; g.classList.add('swap'); }
  }
  /* 小图：三维可用时由展台离屏拍照，拍好一张填一张 */
  function fillThumb(img, url) { if (url) { img.src = url; img.hidden = false; } }
  $('chapter-grid').innerHTML = data.chapters.map(c => `<a href="#chapter-${c.id}" data-chapter="${c.id}"><small>${ordinal(c.id)} · ${c.tasks.length} 项任务</small><strong>${esc(c.title)}</strong><span>${esc(c.description)}</span></a>`).join('');
  $('chapter-grid').hidden = stage.webgl;
  function showFocus(n) {
    focus = n;
    try { sessionStorage.setItem('home-focus', String(n)); } catch {}
    setGhost(n);
    marks.forEach(m => m.classList.toggle('on', Number(m.dataset.chapter) === n));
    $('toc').querySelectorAll('.toc-ch').forEach(sec => { const on = Number(sec.dataset.chapter) === n; sec.classList.toggle('on', on); sec.querySelector('button').setAttribute('aria-current', on ? 'true' : 'false'); });
    if (!body.classList.contains('boot')) { const on = $('toc').querySelector('.toc-ch.on'); on?.classList.remove('flash'); void on?.offsetWidth; on?.classList.add('flash'); }
  }
  function go(n) {
    n = ((n - 1 + 8) % 8) + 1;
    if (stage.webgl) stage.focus(n); else showFocus(n);
  }
  if (stage.webgl) stage.on('focus', showFocus);
  $('toc').addEventListener('click', e => {
    const b = e.target.closest('button[data-chapter]'); if (!b) return;
    const n = Number(b.dataset.chapter);
    if (n === focus || !stage.webgl) location.hash = '#chapter-' + n; else go(n);
  });

  /* 滚轮、方向键、轻扫切换章节 */
  /* 滚轮累计到一定量才换一章，换后 0.7 秒内不再换（触控板惯性滚动不会连跳） */
  let wheelSum = 0, lastWheel = 0, lastSwitch = 0;
  addEventListener('wheel', e => {
    if (!body.classList.contains('is-overview') || $('catalog').open || !stage.webgl) return;
    e.preventDefault();
    const now = performance.now();
    if (now - lastWheel > 250) wheelSum = 0;
    lastWheel = now;
    wheelSum += Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (Math.abs(wheelSum) > 50 && now - lastSwitch > 700) { go(focus + Math.sign(wheelSum)); wheelSum = 0; lastSwitch = now; }
  }, {passive: false});
  addEventListener('keydown', e => {
    if ($('catalog').open || e.altKey || e.ctrlKey || e.metaKey) return;
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    if (typing) return;
    if (body.classList.contains('is-overview')) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); go(focus + 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); go(focus - 1); }
      else if (e.key === 'Enter' && (e.target === body || e.target === document.documentElement)) { location.hash = '#chapter-' + focus; }
    } else {
      if (e.key === 'Escape' || (e.key === 'Backspace' && e.target === body)) { e.preventDefault(); back(); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const cards = [...$('tasks').querySelectorAll('a')]; if (!cards.length) return;
        const i = cards.indexOf(document.activeElement), next = i < 0 ? 0 : (i + (e.key === 'ArrowRight' ? 1 : -1) + cards.length) % cards.length;
        e.preventDefault(); cards[next].focus();
      }
    }
  });
  if (stage.webgl) {
    /* 拖动转台时随时更新目录高亮 */
    stage.on('pick', target => {
      if (target.task) { location.href = taskHref(chapter(target.chapter).tasks.find(t => t.id === target.task)); return; }
      if (target.chapter === focus) location.hash = '#chapter-' + target.chapter;
      else go(target.chapter);
    });
    stage.on('hover', target => {
      document.querySelectorAll('[data-task].hot,.mark.hot').forEach(n => n.classList.remove('hot'));
      if (target && !target.task) marks[target.chapter - 1]?.classList.add('hot');
      if (target?.task) document.querySelectorAll(`[data-task="${target.task}"]`).forEach(n => n.classList.add('hot'));
    });
  }

  /* ---------- 章节 ---------- */
  let shown = null, cameFromOverview = false, token = 0;
  function fillCover(n) {
    const c = chapter(n);
    $('cv-kicker').textContent = ordinal(n);
    const tried = c.tasks.filter(t => progress(t.id)).length;
    $('cv-stats').innerHTML = `<p><strong>${pad(c.tasks.length)}</strong><span>互动<br>任务</span></p>` + (tried ? `<p><strong>${pad(tried)}</strong><span>已经<br>体验</span></p>` : '');
    $('cv-side').style.setProperty('--tint', tint(n));
    $('cv-name').textContent = c.title;
    $('cv-lead').textContent = c.description;
        $('tasks').style.setProperty('--n', c.tasks.length);
    $('tasks').innerHTML = c.tasks.map(t => {
      const done = progress(t.id);
      return `<a class="task" href="${esc(taskHref(t))}" data-task="${t.id}"><i class="thumb"><img alt="" data-shot="${t.id}" hidden></i><span class="name">${esc(t.title)}</span><span class="note"><span class="id">${t.id}</span>${esc(t.note)}${done ? `<em class="done">✓ ${done} 个工位</em>` : ''}</span><span class="go" aria-hidden="true">→</span></a>`;
    }).join('');
    if (stage.webgl) $('tasks').querySelectorAll('img[data-shot]').forEach(img => stage.thumb(n, img.dataset.shot).then(url => fillThumb(img, url)));
    $('chips').innerHTML = c.tasks.map(t => `<a class="chip" href="${esc(taskHref(t))}" data-task="${t.id}" tabindex="-1"><b>${t.id}</b><span>${esc(t.title)}</span>${progress(t.id) ? '<em>✓</em>' : ''}</a>`).join('');
    $('tasks').querySelectorAll('a').forEach(a => {
      const target = {chapter: n, task: a.dataset.task};
      a.addEventListener('pointerenter', () => stage.webgl && stage.hover(target));
      a.addEventListener('focus', () => stage.webgl && stage.hover(target));
      a.addEventListener('pointerleave', () => stage.webgl && stage.hover(null));
      a.addEventListener('blur', () => stage.webgl && stage.hover(null));
    });
    $('chips').querySelectorAll('a').forEach(a => {
      a.addEventListener('pointerenter', () => stage.hover({chapter: n, task: a.dataset.task}));
      a.addEventListener('pointerleave', () => stage.hover(null));
    });
    /* 右上角：上一章、下一章（带该章主展品小图），章节之间直接切换 */
    $('cv-nav').innerHTML = [[n - 1, '上一章'], [n + 1, '下一章']].filter(([m]) => chapter(m)).map(([m, label]) => `<a class="cv-step ${m < n ? 'is-prev' : 'is-next'}" href="#chapter-${m}" style="--tint:${tint(m)}"><i class="thumb"><img alt="" data-thumb="${m}" hidden></i><span><small>${m < n ? '← ' : ''}${label} · ${ordinal(m)}${m > n ? ' →' : ''}</small>${esc(chapter(m).title)}</span></a>`).join('');
    if (stage.webgl) $('cv-nav').querySelectorAll('img[data-thumb]').forEach(img => stage.thumb(Number(img.dataset.thumb)).then(url => fillThumb(img, url)));
    document.title = `${ordinal(n)} ${c.title}｜智能建筑机械与机器人`;
  }
  function setMode(cover) {
    body.classList.toggle('is-cover', cover); body.classList.toggle('is-overview', !cover);
    $('cover').hidden = !cover;
    $('overview').inert = cover; $('cover').inert = !cover;
    $('back').hidden = !cover; $('top-edition').hidden = cover;
    setGhost(cover ? shown : focus);
    if (!cover) document.title = '智能建筑机械与机器人';
    measure();
  }
  async function route(initial = false) {
    /* hashchange 与 popstate 常常一起触发：同一地址只处理一次，不能让第二次把第一次的动画作废 */
    const n = parse();
    if (n === shown && !initial) return;
    const my = ++token;
    if (!initial) body.classList.add('anim');
    if (n) {
      const from = shown; shown = n;
      cameFromOverview = !initial && from === null;
      fillCover(n); setMode(true);
      $('announce').textContent = `${ordinal(n)} ${chapter(n).title}`;
      if (stage.webgl) {
        if (from && from !== n) { await stage.leave(); if (my !== token) return; }
        if (focus !== n) showFocus(n);
        stage.enter(n, {instant: initial, arrive: initial});
      }
      if (!initial) $('cv-name').focus({preventScroll: true});
    } else {
      const from = shown; shown = null;
      setMode(false);
      if (stage.webgl) { if (from) stage.focus(from); stage.leave({instant: initial}); }
      if (from && !initial) { showFocus(from); $('toc').querySelector('.toc-ch.on button')?.focus({preventScroll: true}); }
      $('announce').textContent = initial ? '' : '全部章节';
    }
  }
  function back() {
    if (cameFromOverview) { history.back(); return; }
    history.pushState(null, '', location.pathname + location.search);
    route();
  }
  $('back').addEventListener('click', e => { e.preventDefault(); back(); });
  addEventListener('hashchange', () => route());
  addEventListener('popstate', () => route());

  /* 留给三维画面的区域：避开标题、卡片与底部章节条 */
  function measure() {
    if (!stage.webgl) return;
    /* 宽屏：三维画幅在左栏右侧，上下与左栏对齐；窄屏（手机、平板竖屏）：三维在上，章节信息在下 */
    const h = innerHeight, left = $('stage-probe').getBoundingClientRect().width, wide = innerWidth > 900;
    if (!wide) { stage.layout({overview: {left: 0, top: 6, bottom: 6}, cover: {left: 0, top: 6, bottom: 6}}); return; }
    const book = $('book').getBoundingClientRect();
    const band = {top: Math.max(64, book.top), bottom: Math.max(24, h - book.bottom)};
    /* 概览：底部多留一条给当前章的名称牌 */
    stage.layout({overview: {left, top: band.top, bottom: band.bottom + 40}, cover: {left, ...band}});
  }
  addEventListener('resize', measure);

  /* 名称标签跟着任务展品 */
  if (stage.webgl) stage.on('frame', () => {
    for (const m of stage.marks()) {
      const el = marks[m.chapter - 1], on = m.alpha > .02;
      el.style.visibility = on ? 'visible' : 'hidden';
      if (!on) continue;
      el.style.opacity = m.alpha.toFixed(2);
      el.style.transform = `translate(${m.x.toFixed(1)}px,${(m.y + 6 + 8 * m.scale).toFixed(1)}px) translate(-50%,0)`;
    }
    if (!shown) return;
    const anchors = stage.anchors();
    for (const a of anchors) {
      const chip = $('chips').querySelector(`[data-task="${a.task}"]`); if (!chip) continue;
      chip.style.transform = `translate(${a.x.toFixed(1)}px,${a.y.toFixed(1)}px) translate(-50%,-50%)`;
      chip.classList.toggle('show', a.visible);
    }
  });
  /* 停在某一章 1.5 秒后，空闲时先建好它的任务展品，进入时不卡 */
  let prefetchTimer = 0;
  if (stage.webgl) stage.on('focus', n => { clearTimeout(prefetchTimer); prefetchTimer = setTimeout(() => (window.requestIdleCallback || setTimeout)(() => stage.prefetch(n)), 1500); });

  /* ---------- 全部任务 ---------- */
  function catalog() {
    const q = $('task-search').value.trim().toLowerCase();
    let count = 0;
    $('catalog-content').innerHTML = data.chapters.map(c => {
      const tasks = c.tasks.filter(t => `${t.id} ${t.title} ${c.title} ${ordinal(c.id)}`.toLowerCase().includes(q));
      if (!tasks.length) return '';
      count += tasks.length;
      return `<section><h3><a href="#chapter-${c.id}" data-close>${ordinal(c.id)} · ${esc(c.title)}</a></h3>${tasks.map(t => `<a class="row" href="${esc(taskHref(t))}"><span class="id">${t.id}</span><span>${esc(t.title)}</span>${progress(t.id) ? '<em>✓</em>' : ''}</a>`).join('')}</section>`;
    }).join('') || '<p class="empty">没有找到对应任务，换一个关键词试试。</p>';
    return count;
  }
  $('catalog-open').onclick = () => { $('task-search').value = ''; catalog(); $('catalog').showModal(); $('task-search').focus(); };
  $('catalog-close').onclick = () => $('catalog').close();
  $('task-search').oninput = catalog;
  $('catalog').addEventListener('click', e => {
    if (e.target.closest('[data-close]')) { $('catalog').close(); return; }
    if (e.target !== $('catalog')) return;
    const r = $('catalog').getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) $('catalog').close();
  });

  showFocus(parse() || focus);
  if (stage.webgl) stage.focus(parse() || focus, {instant: true});
  route(true);
  requestAnimationFrame(() => { measure(); requestAnimationFrame(() => body.classList.remove('boot')); });
  if (stage.webgl) stage.on('lost', () => location.reload());

  window.CourseHome = {
    state: () => ({mode: shown ? 'chapter' : 'overview', chapter: shown, focus, webgl: stage.webgl, chapters: data.chapters.length, tasks: data.chapters.reduce((s, c) => s + c.tasks.length, 0), stage: stage.webgl ? stage.state() : null}),
    go, targets: () => (stage.webgl ? stage.targets() : [])
  };
})();

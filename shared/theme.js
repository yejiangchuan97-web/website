/* Course-wide preference and control. Labs register only their renderer updates. */
(() => {
  'use strict';
  const key = 'course-theme';
  const root = document.documentElement;
  const renderers = new Set();
  let theme = 'light';
  let ready = false;
  let button;
  try { if (localStorage.getItem(key) === 'dark') theme = 'dark'; } catch {}

  function syncDocument() {
    const dark = theme === 'dark';
    root.dataset.theme = theme;
    root.dataset.c4Theme = theme;
    root.classList.toggle('dark', dark);
    root.style.colorScheme = theme;
    if (document.body) document.body.dataset.theme = theme;
    document.querySelectorAll('#chapter-shell, .iso, #fallback[data-theme]').forEach(node => {
      node.dataset.theme = theme;
    });
    document.querySelectorAll('meta[name="color-scheme"]').forEach(meta => { meta.content = theme; });
    if (button) {
      button.textContent = dark ? '☀ 浅色模式' : '☾ 深色模式';
      button.setAttribute('aria-label', '深色模式');
      button.setAttribute('aria-pressed', String(dark));
      button.title = dark ? '切换为浅色模式' : '切换为深色模式';
    }
  }

  function apply(next, persist = true) {
    if (next !== 'light' && next !== 'dark') return;
    theme = next;
    syncDocument();
    if (persist) { try { localStorage.setItem(key, theme); } catch {} }
    if (!ready) return;
    renderers.forEach(render => render(theme));
    document.querySelectorAll('.lesson-frame').forEach(frame => {
      try {
        const doc = frame.contentDocument;
        if (doc) {
          doc.documentElement.dataset.theme = theme;
          if (doc.body) doc.body.dataset.theme = theme;
        }
      } catch { /* Only same-origin lesson frames are themed. */ }
    });
    window.dispatchEvent(new CustomEvent('course-theme-change', {detail: {theme}}));
  }

  window.CourseTheme = Object.freeze({
    get: () => theme,
    set: next => apply(next),
    toggle: () => apply(theme === 'dark' ? 'light' : 'dark'),
    register(render) {
      renderers.add(render);
      if (ready) render(theme);
      return () => renderers.delete(render);
    }
  });
  syncDocument();
  document.addEventListener('DOMContentLoaded', () => {
    // Keep one visible control in the same top navigation position on every page.
    const host = ['.course-nav', '.c2-nav', '.c-tools', '.c4-nav', '.c5-nav', '.c6-nav', '.c7-nav', '.header-tools', '.home-tools', 'header'].map(selector => document.querySelector(selector)).find(Boolean);
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'course-theme-toggle';
    button.id = 'course-theme-toggle';
    button.addEventListener('click', window.CourseTheme.toggle);
    function placeControl() {
      const scaled = host?.closest('#chapter-shell, #entry-screen');
      const floating = !host || (scaled && innerWidth < 700);
      button.classList.toggle('course-theme-floating', Boolean(floating));
      (floating ? document.body : host).append(button);
    }
    placeControl();
    window.addEventListener('resize', placeControl);
    document.querySelectorAll('.lesson-frame').forEach(frame => {
      frame.addEventListener('load', () => apply(theme, false));
    });
    ready = true;
    apply(theme, false);
  }, {once: true});
  window.addEventListener('storage', event => {
    if (event.key === key) apply(event.newValue === 'dark' ? 'dark' : 'light', false);
  });
})();

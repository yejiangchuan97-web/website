/* One path resolver for chapter navigation, file:// previews and static hosting. */
(() => {
  'use strict';
  const script = document.currentScript;
  const siteRoot = new URL('../', script.src);
  const names = /(?:^|\/)((?:course|shared|resources|artifacts|docs)\/.*)$/;
  function courseHref(value) {
    if (!value || /^(?:[\w+.-]+:|\/\/|#)/.test(value)) return value;
    const match = value.match(names);
    if (match) return new URL(match[1], siteRoot).href;
    const oldHome = value.indexOf('course/home/index.html');
    if (oldHome !== -1) return new URL('course/home/index.html' + value.slice(oldHome + 'course/home/index.html'.length), siteRoot).href;
    if (/^(?:\.\/|\.\.\/)*index\.html#chapter-/.test(value)) {
      return new URL('course/home/index.html' + value.slice(value.indexOf('#')), siteRoot).href;
    }
    return value;
  }
  window.courseHref = courseHref;
  const normalize = anchor => {
    const value = anchor.getAttribute('href');
    const next = courseHref(value);
    if (next !== value) anchor.setAttribute('href', next);
  };
  function scan(node) {
    if (node.nodeType !== 1) return;
    if (node.matches('a[href]')) normalize(node);
    node.querySelectorAll('a[href]').forEach(normalize);
  }
  new MutationObserver(records => {
    for (const r of records) {
      if (r.type === 'attributes') normalize(r.target);
      else r.addedNodes.forEach(scan);
    }
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['href']});
  document.addEventListener('DOMContentLoaded', () => scan(document.documentElement));
  document.addEventListener('click', event => {
    const anchor = event.target.closest?.('a[href]');
    if (anchor) normalize(anchor);
  }, true);
})();

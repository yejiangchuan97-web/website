(() => {
  'use strict';
  const routes = {'index.html':'annotation', '4-3.html':'annotation', 'predict.html':'predict', '4-3-predict.html':'predict', 'evaluate.html':'evaluate', '4-3-evaluate.html':'evaluate'};
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    const url = new URL(link.getAttribute('href'), document.baseURI);
    const view = routes[url.pathname.split('/').pop()];
    if (!view) return;
    event.preventDefault();
    window.parent.postMessage({type:'helmet:navigate', view, threshold:url.searchParams.get('threshold')}, '*');
  });
  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.data?.type !== 'helmet:set-threshold') return;
    const value = Number(event.data.value);
    if (!Number.isFinite(value) || value < 0 || value > 1) return;
    const input = document.getElementById('prediction-threshold') || document.getElementById('evaluation-threshold');
    if (input) {input.value = value; input.dispatchEvent(new Event('input', {bubbles:true}));}
  });
  window.parent.postMessage({type:'helmet:ready'}, '*');
})();

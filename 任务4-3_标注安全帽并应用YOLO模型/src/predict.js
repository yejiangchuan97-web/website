(() => {
  'use strict';
  const asset = LESSON_DATA.clear;
  const truths = asset.objects.filter(o => o.cls === 0 || o.cls === 1);
  const candidates = makePredictions(truths).map((p, index) => ({...p, id: p.id || `P${String(index + 1).padStart(2, '0')}`}));
  const queryThreshold = new URLSearchParams(location.search).get('threshold');
  const parsedThreshold = queryThreshold === null || queryThreshold.trim() === '' ? .25 : Number(queryThreshold);
  const state = {threshold: Number.isFinite(parsedThreshold) && parsedThreshold >= 0 && parsedThreshold <= 1 ? Math.round(parsedThreshold * 100) / 100 : .25, showFiltered: false, selectedId: null, answer: null};
  const className = cls => cls === 0 ? '已戴安全帽' : '未戴安全帽';
  const sortedCandidates = () => [...candidates].sort((a, b) => b.score - a.score);
  function render() {
    const focused = document.activeElement;
    const focusedCandidate = focused?.dataset.predictionCandidate;
    const focusedBox = focused?.dataset.predictionBox;
    const kept = candidates.filter(p => p.score >= state.threshold);
    const visible = candidates.filter(p => state.showFiltered || p.score >= state.threshold);
    if (state.selectedId && !visible.some(p => p.id === state.selectedId)) state.selectedId = null;
    $('prediction-threshold').value = state.threshold;
    $('prediction-threshold-value').textContent = state.threshold.toFixed(2);
    $('prediction-show-filtered').checked = state.showFiltered;
    $('prediction-visible-count').textContent = kept.length;
    $('prediction-hidden-count').textContent = candidates.length - kept.length;
    $('prediction-empty').hidden = kept.length > 0 || state.showFiltered;
    document.querySelectorAll('[data-prediction-threshold]').forEach(button => {
      const active = Number(button.dataset.predictionThreshold) === state.threshold;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const svg = $('prediction-svg');
    svg.innerHTML = `<image href="${imageURI(asset.svg)}" x="0" y="0" width="${asset.width}" height="${asset.height}"/>` + [...visible].sort((a, b) => Number(a.id === state.selectedId) - Number(b.id === state.selectedId)).map(p => {
      const [x1, y1, x2, y2] = p.bbox;
      const filtered = p.score < state.threshold;
      const selected = p.id === state.selectedId;
      const label = `${p.id} · ${p.cls === 0 ? '戴帽' : '未戴帽'} ${p.score.toFixed(2)}`;
      const labelY = p.id === 'P07' && y1 >= 49 ? y1 - 49 : y1 >= 24 ? y1 - 24 : y2 + 3;
      return `<g data-prediction-box="${esc(p.id)}" class="prediction-box ${filtered ? 'is-filtered' : ''} ${selected ? 'is-selected' : ''}" tabindex="0" role="button" aria-label="${esc(`${p.id} ${className(p.cls)} 分数 ${p.score.toFixed(2)} ${filtered ? '已筛除' : '已保留'}`)}"><rect class="prediction-bounds" x="${x1}" y="${y1}" width="${x2-x1}" height="${y2-y1}" rx="2"/><rect class="prediction-label-bg" x="${Math.min(x1, asset.width - 156)}" y="${labelY}" width="156" height="23" rx="4"/><text class="image-box-label" x="${Math.min(x1, asset.width - 156)+7}" y="${labelY+16}">${esc(label)}</text></g>`;
    }).join('');
    $('prediction-candidate-list').innerHTML = sortedCandidates().map(p => {
      const filtered = p.score < state.threshold;
      return `<button class="candidate-row ${filtered ? 'is-filtered' : ''} ${p.id === state.selectedId ? 'is-selected' : ''}" data-prediction-candidate="${esc(p.id)}" aria-pressed="${p.id === state.selectedId}"><span class="candidate-top"><strong>${esc(p.id)}</strong><span class="candidate-state ${filtered ? 'muted' : ''}">${filtered ? '已筛除' : '已保留'}</span></span><span class="candidate-main"><span>${className(p.cls)}</span><b class="mono">${p.score.toFixed(2)}</b></span><span class="score-track" aria-hidden="true"><i style="width:${p.score * 100}%"></i><em style="left:${state.threshold * 100}%"></em></span></button>`;
    }).join('');
    $('prediction-next-evaluation').href = `evaluate.html?threshold=${state.threshold.toFixed(2)}`;
    if (focusedCandidate) [...$('prediction-candidate-list').querySelectorAll('[data-prediction-candidate]')].find(element => element.dataset.predictionCandidate === focusedCandidate)?.focus({preventScroll: true});
    if (focusedBox) [...svg.querySelectorAll('[data-prediction-box]')].find(element => element.dataset.predictionBox === focusedBox)?.focus({preventScroll: true});
  }
  function selectCandidate(id) {
    const candidate = candidates.find(p => p.id === id);
    if (!candidate) return;
    if (candidate.score < state.threshold && !state.showFiltered) {
      state.showFiltered = true;
      toast('已展开被筛除的框，便于定位这个候选。');
    }
    state.selectedId = state.selectedId === id ? null : id;
    render();
  }
  $('prediction-threshold').addEventListener('input', event => {state.threshold = Number(event.target.value); render();});
  $('prediction-show-filtered').addEventListener('change', event => {state.showFiltered = event.target.checked; render();});
  document.querySelectorAll('[data-prediction-threshold]').forEach(button => button.addEventListener('click', () => {state.threshold = Number(button.dataset.predictionThreshold); render();}));
  $('prediction-candidate-list').addEventListener('click', event => {const button = event.target.closest('[data-prediction-candidate]'); if (button) selectCandidate(button.dataset.predictionCandidate);});
  $('prediction-svg').addEventListener('click', event => {const box = event.target.closest('[data-prediction-box]'); if (box) selectCandidate(box.dataset.predictionBox);});
  $('prediction-svg').addEventListener('keydown', event => {const box = event.target.closest('[data-prediction-box]'); if (box && ['Enter', ' '].includes(event.key)) {event.preventDefault(); selectCandidate(box.dataset.predictionBox);}});
  $('prediction-question').addEventListener('click', event => {
    const button = event.target.closest('[data-prediction-answer]');
    if (!button) return;
    state.answer = button.dataset.predictionAnswer;
    document.querySelectorAll('[data-prediction-answer]').forEach(item => {item.classList.toggle('is-selected', item === button); item.setAttribute('aria-pressed', String(item === button));});
    const correct = state.answer === 'tradeoff';
    const feedback = $('prediction-answer-feedback');
    feedback.hidden = false;
    feedback.classList.toggle('is-correct', correct);
    feedback.textContent = correct ? '判断正确。提高阈值会同时筛除所有低于门槛的候选，其中可能有错误，也可能有正确结果。下一页用同一张图逐个核对。' : '再想一步：分数是模型自己的判断，不能替代真值。低分框里也可能有正确目标；只看框更少或分数更高，还无法判断整体效果。';
  });
  window.helmetPredictionState = () => ({...state, total: candidates.length, kept: candidates.filter(p => p.score >= state.threshold).length, filtered: candidates.filter(p => p.score < state.threshold).length, candidates: candidates.map(p => ({...p, kept: p.score >= state.threshold}))});
  render();
})();

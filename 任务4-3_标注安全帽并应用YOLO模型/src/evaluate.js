(() => {
  'use strict';
  const asset = LESSON_DATA.clear;
  const truths = asset.objects.filter(o => o.cls === 0 || o.cls === 1);
  const candidates = makePredictions(truths);
  const queryThreshold = new URLSearchParams(location.search).get('threshold');
  const parsedThreshold = queryThreshold === null || queryThreshold.trim() === '' ? .25 : Number(queryThreshold);
  const state = {threshold: Number.isFinite(parsedThreshold) && parsedThreshold >= 0 && parsedThreshold <= 1 ? Math.round(parsedThreshold * 100) / 100 : .25, iouThreshold: .5, showTruth: true, showPrediction: true, showMetrics: true, blind: false, selection: null, offset: 30};
  const className = cls => cls === 0 ? '已戴安全帽' : '未戴安全帽';
  const calculate = () => matchPredictions(truths, candidates, state.threshold, state.iouThreshold);
  const percent = value => value === null ? '不适用' : `${(value * 100).toFixed(1)}%`;
  function bestTruth(prediction) {return [...truths].sort((a, b) => iou(prediction.bbox, b.bbox) - iou(prediction.bbox, a.bbox))[0];}
  function explainPrediction(prediction) {
    if (prediction.status === 'tp') return `${prediction.id} 与人工真值 ${prediction.matchedId} 类别一致，IoU = ${prediction.matchedIoU.toFixed(3)}，达到 ${state.iouThreshold.toFixed(2)} 门槛。该真值尚未被更高分预测占用，因此计为 TP。`;
    const closest = bestTruth(prediction);
    if (prediction.reason === '重复检测') return `${prediction.id} 与一个真值有足够重叠、类别也一致，但那个真值已被更高分的预测配对。同一个人不能重复计为两次正确检测，这个额外框计为 FP。`;
    if (prediction.reason === '类别错误') return `${prediction.id} 预测为“${className(prediction.cls)}”，与它重叠的 ${closest.id} 真值为“${className(closest.cls)}”。即使 IoU = ${prediction.bestIoU.toFixed(3)}，类别不一致仍计为 FP；这个错误类别也不能补上该真值的漏检。`;
    if (prediction.reason === '定位偏差') return `${prediction.id} 与真值的最大 IoU = ${prediction.bestIoU.toFixed(3)}，未满足当前同类且 IoU ≥ ${state.iouThreshold.toFixed(2)} 的匹配条件，计为 FP。请同时检查位置与类别。`;
    return `${prediction.id} 没有与任何人工真值框重叠，最大 IoU = 0.000。它在背景上报出了一个人头，计为 FP。`;
  }
  function renderImage(result) {
    const selectedPrediction = state.selection?.type === 'prediction' ? result.predictions.find(p => p.id === state.selection.id) : null;
    const selectedTruth = state.selection?.type === 'truth' ? state.selection.id : selectedPrediction?.matchedId;
    let markup = `<image href="${imageURI(asset.svg)}" x="0" y="0" width="${asset.width}" height="${asset.height}"/>`;
    if (state.showTruth) markup += truths.map(truth => {
      const [x1, y1, x2, y2] = truth.bbox;
      const missed = result.missed.some(item => item.id === truth.id);
      const selected = selectedTruth === truth.id;
      const labelY = y2 + 4 <= asset.height - 22 ? y2 + 4 : y1 - 24;
      return `<g data-evaluation-truth="${esc(truth.id)}" class="truth-box ${missed && !state.blind ? 'is-missed' : ''} ${selected ? 'is-selected' : ''}" tabindex="0" role="button" aria-label="人工真值 ${esc(truth.id)} ${className(truth.cls)}"><rect class="truth-bounds" x="${x1}" y="${y1}" width="${x2-x1}" height="${y2-y1}" rx="2"/><rect class="truth-label-bg" x="${Math.min(x1, asset.width - 125)}" y="${labelY}" width="125" height="21" rx="4"/><text class="truth-box-label" x="${Math.min(x1, asset.width - 125)+6}" y="${labelY+15}">${esc(truth.id)} 真值 · ${truth.cls === 0 ? '戴帽' : '未戴帽'}</text></g>`;
    }).join('');
    if (state.showPrediction) markup += [...result.predictions].reverse().sort((a, b) => Number(a.id === state.selection?.id) - Number(b.id === state.selection?.id)).map(prediction => {
      const [x1, y1, x2, y2] = prediction.bbox;
      const selected = state.selection?.type === 'prediction' && state.selection.id === prediction.id;
      const labelY = prediction.id === 'P07' && y1 >= 49 ? y1 - 49 : y1 >= 24 ? y1 - 24 : y2 + 3;
      const label = `${prediction.id} ${prediction.cls === 0 ? '戴帽' : '未戴帽'} ${prediction.score.toFixed(2)}${state.blind ? '' : ` · ${prediction.status.toUpperCase()}`}`;
      const labelWidth = state.blind ? 151 : 181;
      return `<g data-evaluation-prediction="${esc(prediction.id)}" class="evaluation-box ${state.blind ? 'is-neutral' : `is-${prediction.status}`} ${selected ? 'is-selected' : ''}" tabindex="0" role="button" aria-label="预测 ${esc(prediction.id)} ${className(prediction.cls)} 分数 ${prediction.score.toFixed(2)}${state.blind ? '' : ` ${prediction.status.toUpperCase()}`}"><rect class="evaluation-bounds" x="${x1}" y="${y1}" width="${x2-x1}" height="${y2-y1}" rx="2"/><rect class="evaluation-label-bg" x="${Math.min(x1, asset.width-labelWidth)}" y="${labelY}" width="${labelWidth}" height="23" rx="4"/><text class="image-box-label" x="${Math.min(x1, asset.width-labelWidth)+7}" y="${labelY+16}">${esc(label)}</text></g>`;
    }).join('');
    $('evaluation-svg').innerHTML = markup;
  }
  function renderLists(result) {
    $('evaluation-list-summary').textContent = `${result.predictions.length} 个预测参与评估 · 按分数降序`;
    $('evaluation-prediction-list').innerHTML = result.predictions.length ? result.predictions.map(prediction => {
      const selected = state.selection?.type === 'prediction' && state.selection.id === prediction.id;
      return `<button class="candidate-row evaluation-row ${state.blind ? 'is-neutral' : `is-${prediction.status}`} ${selected ? 'is-selected' : ''}" data-evaluation-prediction="${esc(prediction.id)}" aria-pressed="${selected}"><span class="candidate-top"><strong>${esc(prediction.id)} <small>${className(prediction.cls)}</small></strong><b class="mono">${prediction.score.toFixed(2)}</b></span><span class="candidate-main"><span class="match-badge">${state.blind ? '待核对' : prediction.status.toUpperCase()}</span><span>${state.blind ? '点击在图中定位' : esc(prediction.reason)}</span><span class="tiny">${state.blind ? '' : `IoU ${prediction.bestIoU.toFixed(2)}`}</span></span></button>`;
    }).join('') : '<div class="list-empty">当前没有预测参与评估。降低分数阈值可重新观察。</div>';
    const missedHeading = $('evaluation-missed-list').closest('.missed-section').querySelector('h3');
    missedHeading.textContent = state.blind ? '人工真值' : '漏检 FN';
    $('evaluation-missed-count').textContent = state.blind ? truths.length : result.fn;
    const displayedTruths = state.blind ? truths : result.missed;
    $('evaluation-missed-list').innerHTML = displayedTruths.length ? displayedTruths.map(truth => `<button class="missed-row ${state.selection?.type === 'truth' && state.selection.id === truth.id ? 'is-selected' : ''}" data-evaluation-truth="${esc(truth.id)}"><strong>${esc(truth.id)}</strong><span>${className(truth.cls)}</span><span aria-hidden="true">↗</span></button>`).join('') : '<p class="tiny muted">所有真值都有匹配，当前没有漏检。</p>';
    const note = $('evaluation-selection-note');
    if (state.blind) {note.textContent = '独立核验中：结论暂时隐藏。请先比较类别、重叠位置和配对是否重复，再填写下方答案。'; return;}
    if (state.selection?.type === 'prediction') {
      const prediction = result.predictions.find(p => p.id === state.selection.id);
      note.textContent = prediction ? explainPrediction(prediction) : '该预测已被当前分数阈值筛除。';
    } else if (state.selection?.type === 'truth') {
      const truth = truths.find(item => item.id === state.selection.id);
      const matching = result.predictions.find(p => p.matchedId === truth?.id);
      note.textContent = matching ? `${truth.id} 已与 ${matching.id} 正确配对，计入 TP。一个真值只能配一个预测。` : `${truth.id} 的真值类别为“${className(truth.cls)}”，当前没有同类且达到 IoU 门槛的未占用预测与它配对，计为 FN。真值仍在图中，漏检不会使它消失。`;
    } else note.textContent = '选择一个预测框，查看它为什么匹配成功或失败。虚线标记人工真值；实线标记模型预测。';
  }
  function renderMetrics(result) {
    const values = {tp: result.tp, fp: result.fp, fn: result.fn, precision: percent(result.precision), recall: percent(result.recall)};
    Object.entries(values).forEach(([key, value]) => {$(`evaluation-${key}`).textContent = state.showMetrics ? value : '—';});
    $('evaluation-metrics').classList.toggle('metrics-hidden', !state.showMetrics);
    $('evaluation-toggle-metrics').textContent = state.showMetrics ? '隐藏指标' : '显示指标';
    $('evaluation-toggle-metrics').setAttribute('aria-pressed', String(state.showMetrics));
    $('evaluation-zero-note').hidden = result.predictions.length !== 0 || !state.showMetrics;
    $('evaluation-metric-context').textContent = state.showMetrics ? `当前分数阈值 ${state.threshold.toFixed(2)}，IoU 门槛 ${state.iouThreshold.toFixed(2)}。仅统计这张图的 ${truths.length} 个真值。` : '指标已遮住。先独立数出正确、误检与漏检，再核验答案。';
  }
  function renderIoU() {
    const a = [70, 58, 170, 138], b = [70+state.offset, 58, 170+state.offset, 138];
    const overlapWidth = Math.max(0, 100-state.offset);
    const intersection = overlapWidth * 80, union = 16000 - intersection;
    const value = iou(a, b);
    $('iou-demo-svg').innerHTML = `<defs><pattern id="iou-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#dce9f7" stroke-width="1"/></pattern><pattern id="iou-hatch" width="7" height="7" patternUnits="userSpaceOnUse"><path d="M-2 2L2-2M0 7L7 0M5 9L9 5" stroke="#2176df" stroke-width="1.2"/></pattern></defs><rect width="380" height="200" rx="12" fill="#f5f9ff"/><rect x="16" y="15" width="348" height="170" fill="url(#iou-grid)"/><rect x="${a[0]}" y="${a[1]}" width="100" height="80" fill="#d7f1ef" fill-opacity="0.6"/><rect x="${b[0]}" y="${b[1]}" width="100" height="80" fill="#c9e2ff" fill-opacity="0.5"/>${overlapWidth > 0 ? `<rect x="${b[0]}" y="58" width="${overlapWidth}" height="80" fill="url(#iou-hatch)"/>` : ''}<rect x="${a[0]}" y="${a[1]}" width="100" height="80" fill="none" stroke="#168d8b" stroke-width="2.5" stroke-dasharray="7 5"/><rect x="${b[0]}" y="${b[1]}" width="100" height="80" fill="none" stroke="#256fe1" stroke-width="3"/><text x="70" y="45" fill="#147f7d" font-size="12" font-weight="700">人工真值</text><text x="${b[0]+100}" y="158" fill="#256fe1" font-size="12" font-weight="700" text-anchor="end">预测框</text>`;
    $('iou-offset-value').textContent = state.offset;
    $('iou-intersection-area').textContent = `${intersection.toLocaleString()} px²`;
    $('iou-union-area').textContent = `${union.toLocaleString()} px²`;
    $('iou-demo-value').textContent = value.toFixed(3);
    $('iou-demo-judgment').textContent = `${value >= state.iouThreshold ? '达到' : '未达到'}当前位置门槛 ${state.iouThreshold.toFixed(2)}`;
    $('iou-demo-judgment').classList.toggle('iou-below', value < state.iouThreshold);
  }
  function render() {
    const focused = document.activeElement;
    const focusId = focused?.dataset.evaluationPrediction || focused?.dataset.evaluationTruth;
    const focusType = focused?.dataset.evaluationPrediction ? 'prediction' : 'truth';
    const focusRegion = focused?.closest('#evaluation-svg, #evaluation-prediction-list, #evaluation-missed-list')?.id;
    const result = calculate();
    if (state.selection?.type === 'prediction' && !result.predictions.some(p => p.id === state.selection.id)) state.selection = null;
    $('evaluation-threshold').value = state.threshold;
    $('evaluation-threshold-value').textContent = state.threshold.toFixed(2);
    $('evaluation-iou-threshold').value = state.iouThreshold;
    $('evaluation-iou-value').textContent = state.iouThreshold.toFixed(2);
    $('evaluation-show-truth').checked = state.showTruth;
    $('evaluation-show-prediction').checked = state.showPrediction;
    document.querySelectorAll('[data-evaluation-threshold]').forEach(button => {const active = Number(button.dataset.evaluationThreshold) === state.threshold; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));});
    renderImage(result); renderLists(result); renderMetrics(result); renderIoU();
    $('evaluation-back-prediction').href = `4-3-predict.html?threshold=${state.threshold.toFixed(2)}`;
    if (focusId && focusRegion) [...$(focusRegion).querySelectorAll(`[data-evaluation-${focusType}]`)].find(element => element.getAttribute(`data-evaluation-${focusType}`) === focusId)?.focus({preventScroll: true});
  }
  function clearAnswers() {
    ['tp', 'fp', 'fn'].forEach(key => {$(`challenge-${key}`).value = ''; $(`challenge-${key}`).removeAttribute('aria-invalid');});
    $('evaluation-challenge-feedback').hidden = true;
  }
  function changeRule(key, value) {state[key] = value; state.selection = null; clearAnswers(); render();}
  function select(type, id) {
    if (state.selection?.type === type && state.selection.id === id) state.selection = null;
    else state.selection = {type, id};
    if (type === 'truth') state.showTruth = true;
    if (type === 'prediction') state.showPrediction = true;
    render();
  }
  function handleSelection(event) {
    const prediction = event.target.closest('[data-evaluation-prediction]');
    const truth = event.target.closest('[data-evaluation-truth]');
    if (prediction) select('prediction', prediction.dataset.evaluationPrediction);
    else if (truth) select('truth', truth.dataset.evaluationTruth);
  }
  $('evaluation-threshold').addEventListener('input', event => changeRule('threshold', Number(event.target.value)));
  $('evaluation-iou-threshold').addEventListener('input', event => changeRule('iouThreshold', Number(event.target.value)));
  document.querySelectorAll('[data-evaluation-threshold]').forEach(button => button.addEventListener('click', () => changeRule('threshold', Number(button.dataset.evaluationThreshold))));
  $('evaluation-show-truth').addEventListener('change', event => {state.showTruth = event.target.checked; render();});
  $('evaluation-show-prediction').addEventListener('change', event => {state.showPrediction = event.target.checked; render();});
  $('evaluation-clear-selection').addEventListener('click', () => {state.selection = null; render();});
  $('evaluation-prediction-list').addEventListener('click', handleSelection);
  $('evaluation-missed-list').addEventListener('click', handleSelection);
  $('evaluation-svg').addEventListener('click', handleSelection);
  $('evaluation-svg').addEventListener('keydown', event => {if (['Enter', ' '].includes(event.key) && event.target.closest('[data-evaluation-prediction], [data-evaluation-truth]')) {event.preventDefault(); handleSelection(event);}});
  $('evaluation-toggle-metrics').addEventListener('click', () => {state.showMetrics = !state.showMetrics; if (state.showMetrics) state.blind = false; render();});
  $('evaluation-start-challenge').addEventListener('click', () => {clearAnswers(); state.blind = true; state.showMetrics = false; state.selection = null; render(); toast('结论已遮住，请独立核对后填写下方三个计数。'); $('challenge-tp').focus({preventScroll: true});});
  $('evaluation-challenge-form').addEventListener('submit', event => {
    event.preventDefault();
    const result = calculate();
    const answers = ['tp', 'fp', 'fn'].map(key => {
      const input = $(`challenge-${key}`), value = input.value.trim();
      const correct = value !== '' && Number.isInteger(Number(value)) && Number(value) === result[key];
      input.setAttribute('aria-invalid', String(!correct));
      return {key, correct};
    });
    const allCorrect = answers.every(answer => answer.correct);
    const feedback = $('evaluation-challenge-feedback'); feedback.hidden = false; feedback.classList.toggle('is-correct', allCorrect);
    if (allCorrect) {state.blind = false; state.showMetrics = true; render(); feedback.textContent = `核验通过：TP = ${result.tp}，FP = ${result.fp}，FN = ${result.fn}。精确率 ${percent(result.precision)}，召回率 ${percent(result.recall)}。点击逐框记录，检查你的理由是否一致。`;}
    else feedback.textContent = `${answers.map(answer => `${answer.key.toUpperCase()} ${answer.correct ? '✓' : '待复查'}`).join('　')}。先找出同类且位置达标的唯一配对；未配对的预测是 FP，未配对的真值是 FN。`;
  });
  $('evaluation-reveal-answer').addEventListener('click', () => {
    const result = calculate(); state.blind = false; state.showMetrics = true;
    ['tp', 'fp', 'fn'].forEach(key => {$(`challenge-${key}`).value = result[key]; $(`challenge-${key}`).removeAttribute('aria-invalid');});
    render();
    const feedback = $('evaluation-challenge-feedback'); feedback.hidden = false; feedback.classList.add('is-correct');
    const reasons = result.predictions.filter(p => p.status === 'fp').map(p => `${p.id}：${p.reason}`).join('；');
    feedback.textContent = `解析：${result.tp} 个正确配对，${result.fp} 个未配对预测，${result.fn} 个未配对真值。${reasons ? `误检为 ${reasons}。` : '当前没有误检。'}${result.missed.length ? `漏检为 ${result.missed.map(t => t.id).join('、')}。` : '当前没有漏检。'}`;
  });
  $('iou-offset').addEventListener('input', event => {state.offset = Number(event.target.value); renderIoU();});
  window.helmetEvaluationState = () => ({...state, selection: state.selection ? {...state.selection} : null, ...calculate(), iouDemo: {offset: state.offset, intersection: Math.max(0, 100-state.offset) * 80, union: 16000 - Math.max(0, 100-state.offset) * 80, iou: iou([70,58,170,138], [70+state.offset,58,170+state.offset,138])}});
  render();
})();

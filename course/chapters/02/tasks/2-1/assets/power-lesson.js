/* Present the original model controls in the introductory classroom. */
(() => {
  const lab = document.documentElement.dataset.c2;
  const motor = lab === 'motor';
  const $ = selector => document.querySelector(selector);
  document.body.dataset.power = lab;

  const header = $(motor ? '.topbar' : 'body > header');
  const title = document.createElement('div');
  title.className = 'power-heading';
  title.innerHTML = `<span>任务 2-1 · 动力装置</span><h1>认识动力装置</h1><p>${motor
    ? '看电机怎样带动输出轴，认识机器人关节的动力来源。'
    : '看活塞怎样带动曲轴，对照单缸和四缸的动作。'}</p>`;
  header.prepend(title);
  const tabs = document.createElement('nav');
  tabs.className = 'power-tabs';
  tabs.setAttribute('aria-label', '动力装置');
  tabs.innerHTML = '<a href="motor.html"><small>01</small>直流电机</a><a href="diesel.html#diesel-single"><small>02</small>单缸柴油机</a><a href="diesel.html#diesel-four"><small>03</small>四缸柴油机</a>';
  header.after(tabs);

  const stage = $(motor ? '#motorPanel' : '.workspace');
  const sidebar = document.createElement('aside');
  sidebar.className = 'power-notes';
  sidebar.setAttribute('aria-label', '部件与观察提示');
  const description = document.createElement('section');
  sidebar.append(description);
  stage.after(sidebar);
  const transport = document.createElement('div');
  transport.className = 'power-transport';
  const play = $(motor ? '#pauseBtn' : '#playBtn');
  const step = $('#stepBtn');
  const reset = $(motor ? '#resetBtn' : '#resetAll');
  const pause = () => document.dispatchEvent(new Event('course:pause'));
  const hint = document.createElement('span');
  hint.textContent = '拖动旋转 · 滚轮缩放 · 点选部件';
  step.textContent = '单步';
  reset.textContent = '复位';
  reset.addEventListener('click', pause);
  transport.append(play, step, reset, hint);
  stage.append(transport);

  if (motor) {
    for (const element of document.querySelectorAll('.page-nav, .mobile-workspace-switch, .intro, .lesson, .screen:not(.screen-workspace), .main-grid > aside:not(.power-notes)')) {
      element.hidden = true;
      element.inert = true;
    }
    const viewReset = $('#viewReset');
    viewReset.textContent = '全景';
    $('#motorPanel .pills').prepend(viewReset);
    description.innerHTML = '<h2>直流电机</h2><p>通电后，磁铁对线圈产生作用，带着转子和输出轴一起转动。</p>';
    const activity = document.createElement('section');
    activity.className = 'power-activity';
    activity.innerHTML = '<h3>换个方向试一试</h3><p>保持同一个视角，切换接线，再点单步或播放，对比输出轴的转向。</p><div class="power-directions" role="group" aria-label="切换电机接线方向"></div><p class="power-feedback" role="status" id="directionFeedback"></p>';
    const directionButtons = [$('#forwardBtn'), $('#reverseBtn')];
    directionButtons.forEach((button, i) => {
      button.textContent = i ? '反向接线' : '正向接线';
      activity.querySelector('.power-directions').append(button);
    });
    function describeDirection() {
      const reverse = window.motorLab.getState().dir < 0;
      $('#directionFeedback').textContent = `${reverse ? '反向' : '正向'}接线：看青色电流标记和橙色受力箭头。切换接线后，磁铁的位置不变，输出轴转向改变。`;
    }
    directionButtons.forEach(button => button.addEventListener('click', () => { pause(); describeDirection(); }));
    reset.addEventListener('click', describeDirection);
    sidebar.append(activity);
    describeDirection();
    const partTitle = document.createElement('h3');
    partTitle.textContent = '部件索引';
    const reading = document.createElement('section');
    reading.className = 'power-reading';
    reading.innerHTML = `
      <h3>看懂模型里的标记</h3>
      <p><b>N、S</b> 标在固定磁铁上。青色亮点表示电流方向，橙色箭头表示线圈两侧受力的方向。</p>
      <h3>放到机器人关节里</h3>
      <p>电机先带动减速器，减速器再带动关节。比如机械臂抬起时，肩关节里的驱动装置就把电机的转动传给了臂杆。</p>`;
    sidebar.append(partTitle, $('.part-row'), $('.part-description'), reading);
    const visibleAnnotations = ['poles', 'particles', 'current', 'force'];
    for (const input of document.querySelectorAll('[data-annotation]')) {
      input.checked = visibleAnnotations.includes(input.dataset.annotation);
      input.dispatchEvent(new Event('change', {bubbles:true}));
    }
    tabs.firstElementChild.setAttribute('aria-current', 'page');
  } else {
    $('body > main > aside.controls').hidden = true;
    $('body > main > aside.controls').inert = true;
    const structure = document.createElement('section');
    structure.className = 'power-structure';
    structure.append($('#cutToggle').closest('.switch-row'), $('#explodeBtn'));
    const workingCylinder = $('#powerCylinders');
    workingCylinder.classList.add('power-working-cylinder');
    const activity = document.createElement('section');
    activity.className = 'power-activity power-cycle';
    activity.innerHTML = '<h3>点选冲程，看活塞和气门</h3><label class="power-observer" for="observeCylinder">观察气缸<select id="observeCylinder"><option value="1">第 1 缸</option><option value="2">第 2 缸</option><option value="3">第 3 缸</option><option value="4">第 4 缸</option></select></label>';
    const strokes = $('#strokes');
    const names = ['进气', '压缩', '做功', '排气'];
    strokes.querySelectorAll('[data-stroke]').forEach((button, i) => {
      button.innerHTML = `<span>${names[i]}</span><b aria-hidden="true">${i % 2 ? '↑' : '↓'}</b><div class="stroke-line"><i></i></div>`;
      button.setAttribute('aria-label', `定位${names[i]}冲程`);
      button.addEventListener('click', () => {
        if (!$('#cutToggle').checked) $('#cutToggle').click();
      }, {capture:true});
    });
    const scrub = document.createElement('label');
    scrub.className = 'power-scrub';
    scrub.htmlFor = 'cycleRange';
    scrub.textContent = '拖动曲轴，连续观察';
    scrub.append($('#cycleRange'));
    const feedback = document.createElement('p');
    feedback.className = 'power-feedback';
    feedback.id = 'cycleFeedback';
    feedback.setAttribute('role', 'status');
    activity.append(strokes, scrub, feedback);
    sidebar.append(activity, $('#fxBadge'), workingCylinder, structure, $('#selectionCard'));
    const cylinder = $('#observeCylinder');
    cylinder.addEventListener('change', () => { pause(); window.engineLab.observeCylinder(+cylinder.value); });
    const phaseNotes = [
      '活塞向下，进气门打开，新鲜空气进入气缸。找一找：哪一个气门在动？',
      '活塞向上，两气门关闭，空气被压缩。和进气时比较：气门还开着吗？',
      '两气门关闭，燃烧气体推动活塞向下。对比进气：都是下行，推动活塞的原因有什么不同？',
      '活塞向上，排气门打开，废气排出。对比压缩：同样上行，气门状态有什么不同？',
    ];
    function describeCycle() {
      const state = window.engineLab.getState();
      cylinder.value = String(state.observed);
      const disabled = step.disabled;
      for (const button of strokes.children) if (button.disabled !== disabled) button.disabled = disabled;
      if ($('#cycleRange').disabled !== disabled) $('#cycleRange').disabled = disabled;
      if (cylinder.disabled !== disabled) cylinder.disabled = disabled;
      const phase = strokes.querySelector('[aria-pressed="true"]');
      const note = disabled ? '正在拆解观察。先合成复原，再选择冲程。'
        : `${state.mode === 4 ? `第 ${state.observed} 缸 · ` : ''}${phaseNotes[+(phase?.dataset.stroke || 0)]}`;
      if (feedback.textContent !== note) feedback.textContent = note;
    }
    // Read the original renderer's phase selection; playback, scrubbing and reset stay in sync.
    new MutationObserver(describeCycle).observe(strokes, {subtree:true, attributes:true, attributeFilter:['aria-pressed']});
    new MutationObserver(describeCycle).observe(step, {attributes:true, attributeFilter:['disabled']});
    reset.addEventListener('click', describeCycle);
    const parts = document.createElement('details');
    parts.className = 'power-part-list';
    parts.innerHTML = '<summary>零件索引 · 点选近看</summary>';
    parts.append($('#partsList'));
    sidebar.append(parts);
    function describe() {
      const four = window.engineLab.getState().mode === 4;
      description.innerHTML = four
        ? '<h2>四缸柴油机</h2><p>四个气缸共用一根曲轴。选择一个气缸，再点选冲程，看看它的活塞动作与其他气缸有什么不同。</p>'
        : '<h2>单缸柴油机</h2><p>燃烧后的气体推动活塞下行，连杆把这个动作传给曲轴。点选下面的四个冲程，观察活塞和气门怎样配合。</p>';
      workingCylinder.hidden = !four;
      activity.querySelector('.power-observer').hidden = !four;
      describeCycle();
      [...tabs.children].forEach((link, i) => i === (four ? 2 : 1) ? link.setAttribute('aria-current','page') : link.removeAttribute('aria-current'));
    }
    addEventListener('hashchange', describe);
    describe();
  }
  pause();
  dispatchEvent(new Event('resize'));
})();

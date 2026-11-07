/* 任务 5-3 混凝土泵送、振捣与整平 —— workshop 页面接入统一外壳。
 * 原页面（shared/workshop/shell.js + src/app.js）运行时建出 DOM，每次状态变化都会重建 #controls 里的按钮，
 * 所以这里不搬原按钮，而是在面板里做自己的控件，点击时转调原按钮（按 id 现查）或 ConcreteLab.dispatch。
 * 三维区 #scene（含 9 个分区热点）整块搬进外壳；三道工序（原页签）就是三个工位。
 */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const press = id => byId(id)?.click();
  const lab = () => window.ConcreteLab;
  const M = () => window.ConcreteModel;
  const ROWS = 9;

  function boot() {
    const EL = {stage: byId('scene'), label: byId('scene-label'), feedback: byId('feedback')};
    const {h} = {h: (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }};

    /* —— 从状态变化里记下“做过什么”，供挑战判定 —— */
    const flags = {}, pumpedBy = new Set(), vibratedBy = new Set();
    let prev = null;
    const cutaway = () => (EL.label?.textContent || '').startsWith('双缸');
    const running = () => (byId('pump-run')?.textContent || '').startsWith('暂停');
    function track(s) {
      if (prev) {
        if (s.strokes > prev.strokes && running()) flags.run = true;
        for (let i = 0; i < ROWS; i++) {
          // 只认学生自己泵、自己振的结果（“载入示例”直接铺满料、振好，不算）
          if (s.strokes > prev.strokes && s.pumped[i] >= 0.999 && prev.pumped[i] < 0.999) pumpedBy.add(i);
          if (s.vibration[i] === prev.vibration[i] + 1) { if (s.vibration[i] >= 2) vibratedBy.add(i); if (s.vibration[i] > 2) flags.repeat = true; }
          if (s.level[i] !== null && s.level[i] !== prev.level[i]) {
            if (!s.feedback) flags.noFeedback = true; else if (s.datum !== 0) flags.offDatum = true; else flags.onDatum = true;
          }
        }
      }
      if (s.error && /尚未完成设定布料/.test(s.message)) flags.emptyInsert = true;
      if (cutaway()) flags.cut = true;
      prev = s;
    }

    /* —— 楼面分区图：三个工位共用，点一下选分区 —— */
    function floorMap(c, into) {
      const grid = h('div', 'p53-map'); grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', '楼面分区');
      const tiles = Array.from({length: ROWS}, (_, i) => {
        const b = h('button', 'p53-tile'); b.type = 'button';
        const name = h('b', '', M().label(i)), sub = h('small', ''), bar = h('i', 'p53-fill');
        b.append(bar, name, sub);
        b.addEventListener('click', () => lab().dispatch({type: 'cell', value: i}));
        grid.append(b); return {b, sub, bar};
      });
      const info = h('p', 'p53-info');
      const legend = h('div', 'p53-legend');
      for (const [k, t] of [['part', '布料中'], ['filled', '待振捣'], ['vibrated', '已振捣'], ['ok', '在标高'], ['off', '有偏差']]) {
        const x = h('span', ''); x.append(h('i', 'p53-dot ' + k), document.createTextNode(t)); legend.append(x);
      }
      into.append(grid, info, legend);
      c.lab.onState(s => {
        tiles.forEach(({b, sub, bar}, i) => {
          const p = s.pumped[i], v = s.vibration[i], l = s.level[i];
          const kind = l !== null ? (l === 0 ? 'ok' : 'off') : v >= 2 ? 'vibrated' : p >= 0.999 ? 'filled' : p > 0 ? 'part' : 'empty';
          const text = l !== null ? (l === 0 ? '±0' : (l > 0 ? '+' : '') + l) : v >= 2 ? '振 ' + v : v ? '振 ' + v : p > 0 ? Math.round(p * 100) + '%' : '空';
          if (b.dataset.kind !== kind) b.dataset.kind = kind;
          if (sub.textContent !== text) sub.textContent = text;
          bar.style.height = Math.round(p * 100) + '%';
          b.setAttribute('aria-pressed', String(i === s.cell));
          b.title = `${M().label(i)}：布料 ${Math.round(p * 100)}%，振捣 ${v} 步，${l === null ? '未整平' : '偏差 ' + l + ' mm'}`;
        });
        const i = s.cell, l = s.level[i];
        const t = `${M().label(i)}　布料 ${Math.round(s.pumped[i] * 100)}% · 振捣 ${s.vibration[i]} 步 · ${l === null ? '未整平' : '偏差 ' + (l > 0 ? '+' : '') + l + ' mm'}`;
        if (info.textContent !== t) info.textContent = t;
      });
    }

    // “载入示例”（原页面的“载入当前工位观察示例”）放在控件组标题右侧
    const ex = c => c.button('载入示例', () => press('example'), {small: true, title: '直接铺好料（并振好），单独练这一道工序'});

    const STATIONS = [
      {
        id: 'pump', name: '泵送与布料', lead: '选一个分区，让泵一缸一缸把混凝土送过去；剖开看两个缸怎样交替。',
        build(c) {
          floorMap(c, c.section('楼面分区'));
          const g = c.section('泵送');
          const run = c.toggle('连续泵送', running(), () => press('pump-run'));
          g.append(c.row(c.button('泵一个行程', () => press('pump-step'), {primary: true}), run.el));
          c.lab.onState(() => run.set(running()));
          c.challenges([
            {id: 'fill', icon: '🧱', title: '布满一个分区', hint: '连按几次“泵一个行程”', check: () => pumpedBy.size >= 1,
              result: '一个行程推出一缸料；在这个模型里三个行程布满一个分区。'},
            {id: 'cut', icon: '🔍', title: '剖开看双缸', hint: '左上角“剖开”或点泵车', check: () => flags.cut,
              result: '两个输送缸一推一吸、方向相反，切换阀把正在推料的缸接到输送管。'},
            {id: 'run', icon: '🔁', title: '连续泵送一会儿', hint: '打开“连续泵送”', check: () => flags.run,
              result: '两缸不停交替，料流不断；一个分区满了就自动换到下一个。'},
            {id: 'all', icon: '🗺', title: '整层 9 区都布满', hint: '连续泵送最省事', check: s => M().summary(s).pumped === ROWS && pumpedBy.size > 0,
              result: '整层都布好料了，接下来轮到振捣。'},
          ]);
        },
      },
      {
        id: 'vibrate', name: '振捣与覆盖', lead: '在布好料的分区插棒、振捣、提棒换点，别漏振，也别在一处反复振。',
        build(c) {
          floorMap(c, c.section('楼面分区'));
          const g = c.section('振捣棒', ex(c));
          g.append(c.button('插入振捣棒', () => press('insert'), {primary: true}));
          g.append(c.row(c.button('振捣一步', () => press('vibrate')), c.button('提棒换点', () => press('withdraw'))));
          c.challenges([
            {id: 'empty', icon: '🚫', title: '往空分区插棒', hint: '选一个还没布料的分区', check: () => flags.emptyInsert,
              result: '先布料、后振捣：没料的分区插不了棒。'},
            {id: 'two', icon: '〰', title: '在一个点振两步', hint: '插棒后振捣两次', check: () => vibratedBy.size >= 1,
              result: '振过两步，这个分区就记为已振捣（示意，不计算密实度）。'},
            {id: 'repeat', icon: '🔂', title: '在同一点多振一步', hint: '已振捣的点再振一次', check: () => flags.repeat,
              result: '同一点多振并不更好，要提棒换点，把漏掉的分区补上。'},
            {id: 'three', icon: '🧩', title: '振完 3 个分区', hint: '提棒、换点、再插', check: () => vibratedBy.size >= 3,
              result: '一块块换点覆盖，才不会漏振。'},
          ]);
        },
      },
      {
        id: 'level', name: '整平与标高', lead: '调激光基准、开关标高反馈，让刮板走一遍，看表面停在哪个高度。',
        build(c) {
          floorMap(c, c.section('楼面分区'));
          const g = c.section('激光整平', ex(c));
          const st = lab().state();
          const datum = c.slider({label: '激光基准偏移', min: -30, max: 30, step: 5, value: st.datum, unit: 'mm',
            format: v => (v > 0 ? '+' : '') + v, onInput: v => lab().dispatch({type: 'datum', value: v})});
          const fb = c.toggle('标高反馈', st.feedback, v => lab().dispatch({type: 'feedback', value: v}));
          g.append(datum.el, c.row(fb.el, c.button('刮板走一遍', () => press('level'), {primary: true})));
          c.lab.onState(s => { datum.sync(s.datum); fb.set(s.feedback); });
          c.challenges([
            {id: 'ok', icon: '🎯', title: '整平到设计标高', hint: '基准 0、反馈开', check: () => flags.onDatum,
              result: '基准对、反馈开，刮板跟着基准走，表面停在设计标高 +3.000 m。'},
            {id: 'off', icon: '📏', title: '基准偏了再整平', hint: '把基准拨离 0', check: () => flags.offDatum,
              result: '反馈照样工作，可它跟的是偏了的基准：面很平，标高却不对。'},
            {id: 'nofb', icon: '🔕', title: '关掉反馈整平', hint: '关“标高反馈”再走一遍', check: () => flags.noFeedback,
              result: '没有反馈，原来的高低起伏留在了表面上。'},
            {id: 'three', icon: '✅', title: '3 个分区都在标高', hint: '换分区再整平', check: s => M().summary(s).correct >= 3,
              result: '三个分区都落在设计标高上。'},
          ]);
        },
      },
    ];

    let lastMsg = EL.feedback?.textContent.trim() || '';
    NativeShell.start({
      task: '5-3', title: '混凝土泵送、振捣与整平',
      stage: EL.stage,
      stations: STATIONS,
      current: () => lab()?.state().station,
      select: id => document.querySelector(`#tabs [data-tab="${id}"]`)?.click(),
      reset: id => { press('reset-work'); for (const k in flags) delete flags[k]; pumpedBy.clear(); vibratedBy.clear(); prev = null; document.querySelector(`#tabs [data-tab="${id}"]`)?.click(); },
      poll() { const s = lab().state(); track(s); return s; },
      build(c) {
        // 原页面按旧版式的三维区尺寸取景；搬进外壳、布局稳定后按新尺寸重新取一次全景（换工位时原页面本来也会重新取景）
        const t = setTimeout(() => press('view-home'), 350); c.onCleanup(() => clearTimeout(t));
        c.view('全景', () => press('view-home'));
        c.view('近看', () => press('view-front'));
        c.view('俯视', () => press('view-top'));
        if (c.station.id === 'pump') {
          const cut = c.tool('剖开', () => press('cutaway'), cutaway());
          c.lab.onState(() => cut.set(cutaway()));
        }
        const read = c.readouts([
          {id: 'cell', label: '当前分区'}, {id: 'pumped', label: '已布料', unit: '/ 9'},
          {id: 'vibrated', label: '已振捣', unit: '/ 9'}, {id: 'correct', label: '在标高', unit: '/ 9'},
        ]);
        c.lab.onState(s => {
          const m = M().summary(s);
          read('cell', M().label(s.cell)); read('pumped', m.pumped); read('vibrated', m.vibrated); read('correct', m.correct);
        });
        lastMsg = EL.feedback?.textContent.trim() || '';
        c.lab.onState(() => {
          const t = EL.feedback?.textContent.trim() || '';
          if (t === lastMsg) return;
          lastMsg = t;
          if (t && !t.startsWith('当前工位')) c.feedback(t, EL.feedback.classList.contains('error') ? 'warn' : 'info');
        });
      },
    });

    // 深浅色按钮：theme.js 把它放进了原页面的页头（已收进隐藏容器），挪到外壳页头
    const moveTheme = () => { const t = byId('course-theme-toggle'), top = document.querySelector('.c2-top'); if (t && top && t.parentElement !== top) top.append(t); };
    moveTheme(); document.addEventListener('DOMContentLoaded', moveTheme); addEventListener('load', moveTheme);
    addEventListener('resize', () => setTimeout(moveTheme)); // theme.js 每次 resize 都会把按钮放回原页头，等它放完再挪
  }

  // 原页面在脚本运行时才建出 DOM：等三维区和接口都在了再接外壳
  (function wait(n) {
    if (window.ConcreteLab && byId('scene') && byId('tabs')?.children.length) boot();
    else if (n < 200) setTimeout(() => wait(n + 1), 25);
  })(0);
})();

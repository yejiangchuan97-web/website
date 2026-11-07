/* 任务 1-3 认识施工机器人 —— 第一章展厅（shared/workshop/hero-gallery.js）接入统一外壳。
 * 原页面运行时建出 DOM，并且每换一台展品都会重建右侧控件，所以这里不搬原控件：
 * 面板里的控件都是自建的，点击时转调原按钮 / 原滑杆（按 id 现查），状态读 GalleryLab.state()。
 * 三维区 #scene（含部件编号热点、载入提示）整块搬进外壳；五台展品分成两个工位，挑展品放在三维区上方。
 */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const press = id => byId(id)?.click();
  const G = () => window.GalleryLab;
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  /* —— 记录：每台展品各滑杆到过的范围、点过的部件、展开过多少、每段演示播放了多久 —— */
  const seen = {};
  const rec = id => (seen[id] ||= {range: {}, parts: new Set(), explode: 0, played: {}});
  const range = (s, id, k) => s.seen[id]?.range[k] || {min: 0, max: 0};
  const swept = (s, id, k) => { const r = range(s, id, k); return r.max - r.min; };
  const picked = (s, id, parts) => parts.some(p => s.seen[id]?.parts.has(p));

  const FINGERS = ['index', 'middle', 'ring', 'pinky', 'thumb'];
  const played = (s, id, clip) => s.seen[id]?.played[clip] || 0;

  const STATIONS = [
    {
      id: 'hands', name: '机械臂与机械手', items: ['iiwa', 'sharpa'],
      lead: '机械臂把工具送到位，机械手负责抓取。挑一台，让它动起来。',
      challenges: [
        {id: 'tour', icon: '🦾', title: '看机械臂逐个关节动', hint: '动作选“逐关节巡游”再运行', check: s => played(s, 'iiwa', 1) >= 3,
          result: '连杆一节接一节由关节串起来；每个关节转一点，末端就能到达很多位置。'},
        {id: 'flange', icon: '🔩', title: '找到装工具的地方', hint: '在机械臂上点“末端连接法兰”', check: s => picked(s, 'iiwa', ['tool']),
          result: '末端法兰用来安装工具，换上不同工具，机械臂就能干不同的活。'},
        {id: 'fist', icon: '✊', title: '让机械手握拳', hint: '五根手指都拖过 80%', check: s => s.selected === 'sharpa' && FINGERS.every(k => s.val[k] >= 80),
          result: '五根手指一起弯曲合拢，就能把东西握在手里。'},
        {id: 'point', icon: '☝', title: '只伸出食指', hint: '食指放平，其余拖过 70%', check: s => s.selected === 'sharpa' && s.val.index <= 15 && FINGERS.slice(1).every(k => s.val[k] >= 70),
          result: '每根手指都能单独控制，所以机械手能做出不同的手势。'},
      ],
    },
    {
      id: 'move', name: '会走会飞', items: ['go2', 'g1', 'crazyflie'],
      lead: '机器狗、人形机器人靠腿走，无人机靠螺旋桨飞。挑一台，看它怎样动。',
      challenges: [
        {id: 'gait', icon: '🐕', title: '让机器狗踏步', hint: '动作选“原地步态示意”再运行', check: s => played(s, 'go2', 0) >= 2,
          result: '四条腿按顺序抬起、落下，总有腿撑住机身。'},
        {id: 'wave', icon: '👋', title: '让人形机器人挥手', hint: '动作选“挥手示意”再运行', check: s => played(s, 'g1', 0) >= 2,
          result: '肩、肘、腕也是一个个关节，和机械臂的道理一样。'},
        {id: 'rotor', icon: '🌀', title: '转一转螺旋桨', hint: '无人机“螺旋桨转角”拖过 90°', check: s => swept(s, 'crazyflie', 'rotor') >= 90,
          result: '四个电机各带一片螺旋桨，转起来把空气往下推，无人机就飞起来。'},
        {id: 'apart', icon: '🔍', title: '把无人机拆开看', hint: '左上角“展开结构”', check: s => (s.seen.crazyflie?.explode || 0) >= 0.6,
          result: '机壳里是机架、四个电机和前置镜头；镜头用来拍照、看现场。'},
      ],
    },
  ];

  function boot() {
    const W = window.Workshop, C = W.config, info = id => C.items.find(x => x.id === id);
    // 原展厅按 1600×900 缩放整页，外壳里不要它的整页底色和缩放类
    document.body.classList.remove('gallery-page', 'compact-gallery');
    const EL = {stage: byId('scene'), tabs: byId('tabs')};

    /* —— 三维区上方：每个工位一排展品按钮（图标沿用原展厅） —— */
    const pickers = {};
    for (const st of STATIONS) {
      const box = h('div', 'c1-picker'); box.setAttribute('role', 'radiogroup'); box.setAttribute('aria-label', st.name); box.hidden = true;
      for (const id of st.items) {
        const b = h('button', ''); b.type = 'button'; b.dataset.item = id; b.setAttribute('role', 'radio');
        const icon = EL.tabs.querySelector(`[data-tab="${id}"] svg`)?.cloneNode(true);
        if (icon) b.append(icon);
        b.append(h('span', '', info(id).title));
        b.addEventListener('click', () => { st.last = id; if (G().state().selected !== id) G().select(id); });
        box.append(b);
      }
      pickers[st.id] = box;
    }
    const choose = st => { const s = G().state(); if (!st.items.includes(s.selected)) G().select(st.last || st.items[0]); };

    let lastT = performance.now(), lastError = '';
    NativeShell.start({
      task: '1-3', title: '认识施工机器人',
      hint: '拖动旋转 · 滚轮缩放 · 点编号看部件',
      stage: EL.stage,
      stageTop: Object.values(pickers),
      stations: STATIONS,
      select: id => choose(STATIONS.find(s => s.id === id)),
      reset: id => {
        press('reset-motion');
        for (const item of STATIONS.find(s => s.id === id).items) delete seen[item];
      },
      poll() {
        const s = G().state(), now = performance.now(), dt = Math.min(1, (now - lastT) / 1000);
        lastT = now;
        s.val = {};
        for (const r of s.readings) s.val[r.id] = r.value;
        if (!s.loading && s.selected && G().model()) {
          const r = rec(s.selected);
          for (const [k, v] of Object.entries(s.val)) {
            const x = r.range[k] ||= {min: v, max: v};
            x.min = Math.min(x.min, v); x.max = Math.max(x.max, v);
          }
          if (s.part) r.parts.add(s.part);
          r.explode = Math.max(r.explode, s.displayExplode);
          if (s.playing) r.played[s.clip] = (r.played[s.clip] || 0) + dt * s.speed;
        }
        s.seen = seen;
        return s;
      },
      build(c) {
        const st = c.station, picker = pickers[st.id];
        picker.hidden = false; c.onCleanup(() => { picker.hidden = true; });

        /* 三维区左上角：看法 */
        c.view('全景', () => press('view-home'));
        c.view('俯视', () => press('view-top'));
        const apart = c.tool('展开结构', () => press('toggle-explode'));
        const tour = c.tool('环绕', () => press('orbit-tour'));

        /* 三维区底部：演示动作 + 读数 */
        const tp = c.transport({
          onToggle: () => {
            if (G().state().explode > 0) { tp.setPlaying(false); c.feedback('先合拢结构，再播放动作。', 'warn'); return; }
            press('play');
          },
          onStep: () => press('step'),
          onReset: () => press('reset-motion'),
          speeds: [[0.25, '¼×'], [0.5, '½×'], [1, '1×']], speed: 1,
          onSpeed: v => document.querySelector(`[data-speed="${v}"]`)?.click(),
        });
        const read = c.readouts([
          {id: 'motion', label: '动作'}, {id: 'time', label: '演示', unit: 's'},
          {id: 'part', label: '观察部件'}, {id: 'struct', label: '结构'},
        ]);

        /* 面板：随展品重建的部件、调节两组，后面是试一试 */
        const dyn = h('div', 'c1-dyn'); c.body.append(dyn);
        c.challenges(st.challenges);

        let shown = '', chips = null, sliders = [], lastPart = null, clipSeg = null;
        function render(s) {
          const m = G().model(), row = info(s.selected);
          shown = s.selected; lastPart = null; c.showPart(null);
          dyn.replaceChildren(); sliders = [];
          const parts = c.section(row.title + ' · 部件', null, dyn);
          chips = c.chips(m.parts.map(p => ({label: p.label, id: p.id})), p => W.stage.selectPart(p.id));
          parts.append(chips.el);
          clipSeg = null;
          if (m.clips?.length) {
            clipSeg = c.segmented(m.clips.map((label, i) => ({label, value: i})), s.clip, i => {
              const el = byId('clip'); if (el) { el.value = String(i); el.dispatchEvent(new Event('change', {bubbles: true})); }
            }, '预制动作');
            c.section('动作', null, dyn).append(clipSeg.el);
          }
          if (m.controls?.length) {
            const g = c.section(m.controls.length >= 5 ? '调一调 · 弯曲程度' : '调一调', null, dyn);
            const many = m.controls.length >= 5, grid = h('div', 'c1-sliders' + (many ? ' c1-three' : m.controls.length >= 4 ? ' c1-two' : '')); g.append(grid);
            for (const ctl of m.controls) {
              const sl = c.slider({
                label: many ? ctl.label.replace(/弯曲$/, '') : ctl.label, min: ctl.min, max: ctl.max, step: ctl.step, value: s.val[ctl.id] ?? ctl.default,
                unit: s.readings.find(r => r.id === ctl.id)?.unit || '', format: v => Math.round(v),
                onInput: v => { const el = byId('joint-' + ctl.id); if (el) { el.value = v; el.dispatchEvent(new Event('input', {bubbles: true})); } },
              });
              grid.append(sl.el); sliders.push([ctl.id, sl]);
            }
          }
          // 模型来源与许可：收进面板底部的 ⓘ，不占正文
          c.credit([row.title + '：' + (m.metadata?.nature || '课程教学模型'), row.application],
            row.license && {href: window.courseHref ? courseHref(row.license) : row.license, label: '查看模型许可'});
        }

        c.lab.onState(s => {
          for (const b of picker.children) b.setAttribute('aria-checked', String(b.dataset.item === s.selected));
          if (s.error && s.error !== lastError) { lastError = s.error; c.feedback('模型没有载入，可在三维区点“重新载入”。', 'warn'); }
          if (s.loading || !G().model() || !st.items.includes(s.selected)) return;
          if (s.selected !== shown) render(s);
          for (const [id, sl] of sliders) sl.sync(s.val[id]);
          clipSeg?.set(s.clip);
          if (s.part !== lastPart) {
            lastPart = s.part;
            const p = G().model().parts.find(x => x.id === s.part);
            c.showPart(p?.label, p?.description);
            chips.buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(G().model().parts[i]?.id === s.part)));
          }
          tp.setPlaying(s.playing); apart.set(s.explode > 0); tour.set(s.tour);
          read('motion', s.playing ? '演示中' : Object.keys(s.manual).length ? '手动' : '暂停');
          read('time', s.time.toFixed(1));
          read('part', G().model().parts.find(x => x.id === s.part)?.label || '整机');
          read('struct', s.displayExplode < 0.01 ? '整机' : '展开 ' + Math.round(s.displayExplode * 100) + '%');
        });
      },
    });

    // 深浅色按钮：theme.js 把它放进了原页面的页头（已收进隐藏容器），挪到外壳页头
    const moveTheme = () => { const t = byId('course-theme-toggle'), top = document.querySelector('.c2-top'); if (t && top && t.parentElement !== top) top.append(t); };
    moveTheme(); document.addEventListener('DOMContentLoaded', moveTheme); addEventListener('load', moveTheme);
    addEventListener('resize', () => setTimeout(moveTheme)); // theme.js 每次 resize 都会把按钮放回原页头，等它放完再挪
  }

  // 原页面在脚本运行时才建出 DOM、异步载入第一台展品：等三维区、展品按钮和模型都在了再接外壳
  (function wait(n) {
    if (window.GalleryLab?.model() && byId('scene') && byId('tabs')?.querySelector('svg')) boot();
    else if (n < 1200) setTimeout(() => wait(n + 1), 25);
  })(0);
})();

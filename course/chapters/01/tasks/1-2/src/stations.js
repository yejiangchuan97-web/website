/* 任务 1-2 认识施工机械 —— 第一章展厅（shared/workshop/hero-gallery.js）接入统一外壳。
 * 原页面运行时建出 DOM，并且每换一台展品都会重建右侧控件，所以这里不搬原控件：
 * 面板里的控件都是自建的，点击时转调原按钮 / 原滑杆（按 id 现查），状态读 GalleryLab.state()。
 * 三维区 #scene（含部件编号热点、载入提示）整块搬进外壳；六台展品分成两个工位，挑展品放在三维区上方。
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
  const reach = (s, id, k) => { const r = range(s, id, k); return Math.max(Math.abs(r.min), Math.abs(r.max)); };
  const swept = (s, id, k) => { const r = range(s, id, k); return r.max - r.min; };
  const picked = (s, id, parts) => parts.some(p => s.seen[id]?.parts.has(p));

  const LIFT = [0.55, 4.2]; // 施工升降机“吊笼高度”的模型行程，面板里按百分比显示
  const liftPct = v => Math.round((v - LIFT[0]) / (LIFT[1] - LIFT[0]) * 100);
  const FORMAT = {lift: {height: {format: liftPct, unit: '%'}}};

  const STATIONS = [
    {
      id: 'earth', name: '土方机械', items: ['excavator', 'dozer', 'loader'],
      lead: '挖掘机挖、推土机推、装载机装。挑一台，拖滑杆让它干活的部件动起来。',
      challenges: [
        {id: 'dig', icon: '↻', title: '让挖掘机转身挖一斗', hint: '四根滑杆各拖一拖', check: s => reach(s, 'excavator', 'slew') >= 30 && ['boom', 'stick', 'bucket'].every(k => swept(s, 'excavator', k) >= 15),
          result: '回转平台带着上车转，动臂抬落、斗杆收放、铲斗翻转——各靠一根液压缸推动，配合起来就是一次挖掘。'},
        {id: 'blade', icon: '⛏', title: '把推土机铲刀抬起来', hint: '“铲刀抬升”拖过 12°', check: s => range(s, 'dozer', 'blade').max >= 12,
          result: '两侧提升液压缸一伸，推架带着铲刀离地；放低铲刀往前开，就能推土。'},
        {id: 'scoop', icon: '🪣', title: '装载机举臂又收斗', hint: '两根滑杆都拖过 18°', check: s => s.selected === 'loader' && s.val.lift >= 18 && s.val.bucket >= 18,
          result: '铲斗收拢兜住料，举升臂再抬高，就能把料倒进车厢。'},
        {id: 'tool', icon: '🔍', title: '三台都点出干活的部件', hint: '点编号：斗、铲刀、举升臂', check: s => picked(s, 'excavator', ['boom', 'stick', 'bucket']) && picked(s, 'dozer', ['blade']) && picked(s, 'loader', ['arms', 'bucket']),
          result: '直接碰到土石的是工作装置；履带、轮胎负责把整机带到位。'},
      ],
    },
    {
      id: 'lift', name: '起重与输送', items: ['crane', 'lift', 'pump'],
      lead: '塔吊吊、升降机升、泵车送。挑一台，看它怎样把东西送到高处、远处。',
      challenges: [
        {id: 'crane', icon: '🏗', title: '让塔吊起重臂转 40°', hint: '拖“起重臂回转”', check: s => reach(s, 'crane', 'slew') >= 40,
          result: '塔身不动，起重臂、平衡臂和操作室在塔顶一起转，吊钩就能到达一圈上的各处。'},
        {id: 'hoist', icon: '⬆', title: '把吊笼升到高处', hint: '“吊笼高度”拖过 90%', check: s => liftPct(range(s, 'lift', 'height').max) >= 90,
          result: '吊笼沿导轨架上的齿条一路爬升，把材料或人员送到楼层。'},
        {id: 'boom', icon: '🦾', title: '泵车三节臂都动一动', hint: '一级、二级、三级臂各拖一下', check: s => ['boom', 'fold', 'tip'].every(k => swept(s, 'pump', k) >= 5),
          result: '三节布料臂各有一个关节，配合起来，末端软管就能伸到要浇筑的位置。'},
        {id: 'legs', icon: '🔩', title: '找出泵车的支腿', hint: '在泵车上点“支腿”', check: s => picked(s, 'pump', ['supports']),
          result: '伸臂前先把支腿撑开、垫板落地，让整车站稳。'},
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
      task: '1-2', title: '认识施工机械',
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

        let shown = '', chips = null, sliders = [], lastPart = null;
        function render(s) {
          const m = G().model(), row = info(s.selected);
          shown = s.selected; lastPart = null; c.showPart(null);
          dyn.replaceChildren(); sliders = [];
          const parts = c.section(row.title + ' · 部件', null, dyn);
          chips = c.chips(m.parts.map(p => ({label: p.label, id: p.id})), p => W.stage.selectPart(p.id));
          parts.append(chips.el);
          if (m.controls?.length) {
            const g = c.section('调一调', null, dyn);
            const grid = h('div', 'c1-sliders' + (m.controls.length >= 4 ? ' c1-two' : '')); g.append(grid);
            for (const ctl of m.controls) {
              const f = FORMAT[s.selected]?.[ctl.id] || {};
              const sl = c.slider({
                label: ctl.label, min: ctl.min, max: ctl.max, step: ctl.step, value: s.val[ctl.id] ?? ctl.default,
                unit: f.unit ?? (s.readings.find(r => r.id === ctl.id)?.unit || ''), format: f.format || (v => Math.round(v)),
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

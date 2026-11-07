/* 原版三维实验页的“嵌入模式”桥接。
 * 页面被第二章任务页（index.html）用 iframe 打开时：只留下三维视图，其余原有界面隐藏；
 * 外层面板通过 postMessage 发命令（点击、设值、调用接口），这里定时回报模型状态。
 * 单独打开原页面时不做任何改动。file:// 下同样可用（只用 postMessage，不跨文档读 DOM）。
 */
(() => {
  'use strict';
  const embedded = window.parent !== window || /[?&]embed\b/.test(location.search);
  if (!embedded) return;
  const $ = s => document.querySelector(s);
  const lab = () => document.documentElement.dataset.c2;
  const text = s => ($(s)?.textContent || '').trim();
  const pressed = s => $(s)?.getAttribute('aria-pressed') === 'true';
  const json = v => JSON.parse(JSON.stringify(v ?? null));

  /* 每个原版页面：保留哪个三维视图、隐藏其中哪些原有浮层、回报哪些状态 */
  const LABS = {
    motor: {
      keep: '#stage',
      hideInside: ['.view-hint', '.c2-viewbar'],
      probe() {
        const s = window.motorLab.getState(), m = window.motorLab.getModel(), st = window.motorLab.getStudent();
        const view = ['cutMode', 'wholeMode', 'wireMode'].find(id => pressed('#' + id)) || 'cutMode';
        return {voltage: s.voltage, load: s.load, dir: s.dir, paused: s.paused, part: s.part, showEM: s.showEM, cut: s.cut,
          n: m.n, I: m.I, T: m.T, P: m.P, eff: m.eff, stall: m.stall, stalled: m.stalled, view,
          partText: s.part !== 'all' ? text('.part-description') : '',
          // 组装模式（原版“学生任务：组装与接线”）
          student: {...st, step: $('#studentConsole')?.dataset.uiStep || '', feedback: text('#studentFeedback')}};
      },
    },
    diesel: {
      keep: '#viewport',
      probe() {
        const s = window.engineLab.getState();
        const stroke = $('#strokes [aria-pressed="true"]');
        return {mode: s.mode, observed: s.observed, angle: s.angle, running: s.running, speed: s.speed, explode: s.explode,
          targetExplode: s.targetExplode, cut: s.cut, labels: s.labels, effects: s.effects, vehicle: s.vehicle,
          installation: s.installation, audio: s.audioEnabled, selected: s.selected,
          stroke: stroke ? +stroke.dataset.stroke : null, rpm: text('#rpmReadout'),
          partName: s.selected ? text('#partName') : '', partDesc: s.selected ? text('#partDesc') : ''};
      },
    },
    transmission: {
      keep: '#canvasWrap',
      // transmission.html#gear / #hyd / #air
      setup() { const m = location.hash.slice(1); if (['gear', 'hyd', 'air'].includes(m)) window.MechanicsLab.switchMode(m); },
      probe() {
        const x = window.MechanicsLab.snapshot(), st = x.state;
        return {mode: x.mode, playing: x.playing, speed: x.speed, params: x.params[x.mode], tr: x.transmission,
          state: {x: st.x, v: st.v, pA: st.pA, pB: st.pB, force: st.force, status: st.status, command: st.command, cycles: st.cycles, auto: st.auto},
          focused: x.view.focused, watch: text('#watchTitle')};
      },
    },
    mechanisms: {
      keep: () => (location.hash === '#screw' ? '#screw-stage' : '#boom-stage'),
      hideInside: ['.stage-hint', '.stage-top', '.c2-viewbar'],
      setup() {
        const i = location.hash === '#screw' ? 1 : 0;
        const tab = document.querySelectorAll('.c2-experiments button')[i];
        tab?.click();
      },
      probe() {
        const x = window.mechanismLab.snapshot();
        return {active: x.activeMechanism, play: x.play, dir: x.dir, speed: x.speed, theta: x.theta, a: x.a, b: x.b, c: x.c,
          lead: x.lead, rpm: x.rpm, starts: x.starts, ns: x.ns, nn: x.nn, mode: x.mode, relative: x.relative, height: x.height,
          vibration: x.vibration, ecc: x.ecc, trace: x.trace, forces: x.forces, range: x.range,
          moment: x.model?.moment, mu: x.model?.mu, len: x.model?.len,
          stroke: +($('#stroke')?.value || 0), strokeMin: +($('#stroke')?.min || 0), strokeMax: +($('#stroke')?.max || 0),
          amplitude: x.vibrationMetrics?.amplitude};
      },
    },
  };

  const css = `
    html.c2-embed, html.c2-embed body { overflow:hidden !important; margin:0 !important; padding:0 !important; min-width:0 !important; min-height:0 !important; }
    html.c2-embed body { background:var(--stage-bg, #f5f6f8) !important; }
    html.c2-embed .c2-embed-hide { display:none !important; }
    html.c2-embed [data-c2-path] { transform:none !important; filter:none !important; contain:none !important; overflow:visible !important; }
    html.c2-embed [data-c2-keep="main"] {
      position:fixed !important; inset:0 !important; width:100vw !important; height:100vh !important;
      max-width:none !important; max-height:none !important; min-width:0 !important; min-height:0 !important;
      margin:0 !important; border:0 !important; border-radius:0 !important; z-index:2147480000 !important; box-shadow:none !important;
    }
    html.c2-embed [data-c2-keep="inset"] {
      position:fixed !important; right:14px !important; bottom:14px !important; left:auto !important; top:auto !important;
      width:min(30vw,280px) !important; height:min(34vh,210px) !important; min-height:0 !important; margin:0 !important;
      border:1px solid var(--course-line, #cbdbea) !important; border-radius:12px !important; overflow:hidden !important;
      z-index:2147480001 !important; box-shadow:0 6px 18px rgba(25,53,80,.18) !important;
    }
    html.c2-embed dialog { z-index:2147483000; }
  `;

  function isolate(cfg) {
    const pick = v => (typeof v === 'function' ? v() : v);
    const main = $(pick(cfg.keep)), inset = cfg.inset ? $(pick(cfg.inset)) : null;
    if (!main) return false;
    document.documentElement.classList.add('c2-embed');
    /* 嵌入外壳后：三维区里的部件标签不小于 13px，字体与外壳一致 */
    const type = '\n.part-label,.tag,button.tag,span.tag{font-size:13px!important;letter-spacing:0!important;font-family:"PingFang SC","Microsoft YaHei","Hiragino Sans GB","Noto Sans CJK SC","Segoe UI",system-ui,sans-serif!important}';
    const style = document.createElement('style'); style.textContent = css + type; document.head.append(style);
    const keeps = [main, inset].filter(Boolean);
    main.dataset.c2Keep = 'main'; if (inset) inset.dataset.c2Keep = 'inset';
    for (const k of keeps) for (let n = k; n && n !== document.body; n = n.parentElement) {
      if (n !== k) n.dataset.c2Path = '1';
      n.hidden = false; n.inert = false; n.classList.remove('hidden');
    }
    for (const k of keeps) {
      for (let n = k; n && n !== document.body; n = n.parentElement) {
        const parent = n.parentElement; if (!parent) break;
        for (const sib of parent.children) {
          if (sib.dataset.c2Path || sib.dataset.c2Keep || sib.matches('script,style,link,dialog,canvas.c2-keep-canvas')) continue;
          sib.classList.add('c2-embed-hide');
        }
      }
    }
    for (const sel of cfg.hideInside || []) main.querySelectorAll(sel).forEach(e => e.classList.add('c2-embed-hide'));
    // 画布多为透明：铺上外壳统一的三维区底色（--stage-bg 由外壳传入），不沿用原页面的网格、渐变底
    for (const k of keeps) k.style.setProperty('background', 'var(--stage-bg, #f5f6f8)', 'important');
    // 隐藏页面级的浮动按钮（深色模式切换等）
    document.querySelectorAll('body > button, body > .toast, #course-theme-toggle').forEach(e => { if (!e.dataset.c2Keep) e.classList.add('c2-embed-hide'); });
    return true;
  }

  const post = msg => window.parent.postMessage({c2: 'lab', lab: lab(), ...msg}, '*');
  function setValue(el, value) {
    if (!el) return;
    if (el.type === 'checkbox') { if (el.checked !== Boolean(value)) el.click(); return; }
    el.value = value;
    el.dispatchEvent(new Event('input', {bubbles: true}));
    el.dispatchEvent(new Event('change', {bubbles: true}));
  }
  function call(path, args) {
    const parts = path.split('.'); let ctx = window, fn = window;
    for (const p of parts) { ctx = fn; fn = fn?.[p]; }
    return typeof fn === 'function' ? fn.apply(ctx, args || []) : undefined;
  }
  addEventListener('message', e => {
    const d = e.data;
    if (!d || d.c2 !== 'cmd') return;
    try {
      if (d.op === 'click') { const list = document.querySelectorAll(d.sel); (list[d.index || 0])?.click(); }
      else if (d.op === 'clickText') { [...document.querySelectorAll(d.sel)].find(e => e.textContent.trim().startsWith(d.text))?.click(); }
      else if (d.op === 'set') setValue($(d.sel), d.value);
      else if (d.op === 'call') call(d.path, d.args);
      else if (d.op === 'event') document.dispatchEvent(new Event(d.name));
      else if (d.op === 'theme') {
        if (d.stage) {
          // 外壳的三维区取值：CSS 变量给页面样式用，StageTone 给三维场景用；再按主题重绘
          const t = d.value === 'dark' ? 'dark' : 'light', v = d.stage[t] || {};
          for (const [k, val] of Object.entries(v)) if (val) document.documentElement.style.setProperty('--stage-' + k, val);
          window.StageTone?.use(d.stage);
        }
        window.CourseTheme?.set?.(d.value);
      }
      else if (d.op === 'resize') dispatchEvent(new Event('resize'));
      else if (d.op === 'capture') (window.StageTone?.capture?.(document.body) || Promise.resolve(null)).then(url => post({type: 'shot', url}));
    } catch (err) { console.warn('[c2 bridge]', d, err); }
    setTimeout(send, 30);
  });

  let probe = null;
  function send() {
    if (!probe) return;
    try { post({type: 'state', data: json(probe())}); } catch (err) { /* 模型尚未就绪 */ }
  }
  addEventListener('load', () => {
    const cfg = LABS[lab()];
    if (!cfg) return;
    cfg.setup?.();
    isolate(cfg);
    probe = cfg.probe;
    // 不依赖 requestAnimationFrame：后台标签页里它不会执行
    dispatchEvent(new Event('resize')); post({type: 'ready'}); send();
    setTimeout(() => dispatchEvent(new Event('resize')), 300);
    setInterval(send, 160);
  });
})();

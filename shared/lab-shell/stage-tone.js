/* 三维区底色（全课程统一）：近白中性灰，适合印刷教材截图；深色模式用深石墨色。
 * 取值以 shared/lab-shell/lab-shell.css 里的 --stage-bg / --stage-floor / --stage-shadow 为准（深浅色一起切换）；
 * 页面样式还没载入时（运行时才挂外壳的页面、第二章被嵌入前的原版实验页）用下面同值的后备。
 * 用法：StageTone.bg() → '#f5f6f8'；StageTone.color(THREE) → THREE.Color；
 *       StageTone.paint(scene, THREE) 设底色并让雾跟着变；StageTone.contactShadow(THREE, {size}) 模型下方的柔和接触阴影。
 * 第二章：原版实验页被嵌入时，外壳把自己的取值经 postMessage 传进来（embed-bridge.js 调 StageTone.use）。
 */
(() => {
  'use strict';
  if (window.StageTone) return;
  const FALLBACK = {
    light: {bg: '#f5f6f8', floor: '#eceef1', shadow: 'rgba(28,36,48,.20)'},
    dark: {bg: '#1a1f27', floor: '#222833', shadow: 'rgba(0,0,0,.55)'},
  };
  const root = document.documentElement;
  let cache = null, override = null;
  const theme = () => (root.dataset.theme === 'dark' ? 'dark' : 'light');
  const read = () => {
    const t = theme(), f = FALLBACK[t], cs = getComputedStyle(root);
    const v = n => cs.getPropertyValue(n).trim();
    return {theme: t, bg: v('--stage-bg') || f.bg, floor: v('--stage-floor') || f.floor, shadow: v('--stage-shadow') || f.shadow, ...(override?.[t] || {})};
  };
  const get = () => (cache && cache.theme === theme() ? cache : (cache = read()));
  addEventListener('course-theme-change', () => { cache = null; });

  /* 电脑上（鼠标操作、宽屏）让三维画布保留最后一帧，“保存三维截图”随时读得到；
     不少页面是“画面有变化才重画”，不保留的话读到的是空白。手机上不开，省一次每帧拷贝。 */
  try {
    if (matchMedia('(pointer:fine) and (min-width:901px)').matches) {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, attrs) {
        return original.call(this, type, /^(webgl|webgl2|experimental-webgl)$/.test(type) ? {...(attrs || {}), preserveDrawingBuffer: true} : attrs);
      };
    }
  } catch { /* 保持默认 */ }

  /* 三维截图：把 root 里正在显示的三维画布存成一张 PNG（铺统一底色，不含页面上的按钮和文字标签）。
     画布内容只在“刚画完的那一帧”里读得到，所以排在页面自己的绘制之后读；读到空白就催一次重绘、下一帧再试。 */
  const blank = canvas => {
    const probe = document.createElement('canvas'); probe.width = probe.height = 24;
    const g = probe.getContext('2d', {willReadFrequently: true}); g.drawImage(canvas, 0, 0, 24, 24);
    const d = g.getImageData(0, 0, 24, 24).data;
    for (let i = 3; i < d.length; i += 4) if (d[i]) return false;
    return true;
  };
  function capture(scope = document.body, {scale = 1} = {}) {
    const list = [...scope.querySelectorAll('canvas')].filter(c => { const r = c.getBoundingClientRect(); return r.width > 80 && r.height > 80 && getComputedStyle(c).visibility !== 'hidden'; });
    const canvas = list.sort((a, b) => (b.dataset.engine ? 1 : 0) - (a.dataset.engine ? 1 : 0) || b.width * b.height - a.width * a.height)[0];
    return new Promise(resolve => {
      if (!canvas) return resolve(null);
      let tries = 0;
      const grab = () => {
        try {
          if (blank(canvas) && ++tries < 8) { if (tries === 1 || tries === 4) dispatchEvent(new Event('resize')); return requestAnimationFrame(grab); }
          const out = document.createElement('canvas'); out.width = Math.round(canvas.width * scale); out.height = Math.round(canvas.height * scale);
          const g = out.getContext('2d'); g.fillStyle = get().bg; g.fillRect(0, 0, out.width, out.height);
          g.imageSmoothingQuality = 'high'; g.drawImage(canvas, 0, 0, out.width, out.height);
          resolve(out.toDataURL('image/png'));
        } catch { resolve(null); }
      };
      requestAnimationFrame(grab);
    });
  }

  window.StageTone = {
    get, capture,
    bg: () => get().bg,
    floor: () => get().floor,
    /** 底色的 THREE.Color（传入页面自己的 THREE，模块化页面也能用）。 */
    color: (T = window.THREE, key = 'bg') => new T.Color(get()[key]),
    /** 设场景底色，雾（若有）随底色。返回 scene 便于链式调用。 */
    paint(scene, T = window.THREE) {
      if (!scene) return scene;
      const c = get().bg;
      if (scene.background?.isColor) scene.background.set(c); else scene.background = new T.Color(c);
      if (scene.fog?.color) scene.fog.color.set(c);
      return scene;
    },
    /** 模型下方的柔和接触阴影：一张径向渐变贴图的平面（不受光照影响，深浅色自动换）。
     *  size 为直径（场景单位），up 为 'y' 或 'z'（哪个轴朝上）。返回 Mesh，自己 position 到模型脚下。 */
    contactShadow(T = window.THREE, {size = 1, up = 'y', strength = 1} = {}) {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const g = c.getContext('2d'), grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(0,0,0,1)'); grad.addColorStop(.45, 'rgba(0,0,0,.55)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
      const tex = new T.CanvasTexture(c);
      const mat = new T.MeshBasicMaterial({map: tex, color: 0x000000, transparent: true, depthWrite: false, toneMapped: false});
      const mesh = new T.Mesh(new T.PlaneGeometry(size, size), mat);
      if (up === 'y') mesh.rotation.x = -Math.PI / 2;
      mesh.renderOrder = -1; mesh.userData.contactShadow = true;
      const tone = () => { mat.opacity = (theme() === 'dark' ? .5 : .16) * strength; };
      tone(); addEventListener('course-theme-change', tone);
      return mesh;
    },
    /** 外部指定取值（第二章嵌入时由外壳传入）；传 null 取消。 */
    use(values) { override = values; cache = null; },
    refresh() { cache = null; return get(); },
  };
})();

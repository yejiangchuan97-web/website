/* 砂浆机械工位的操作：投料、开机搅拌、摇手轮倾翻出料、推灰车送到砌筑位。状态来自 MortarModel。 */
(() => {
  const M = MortarModel;
  const NAMES = {sand: '砂', cement: '水泥', water: '水'};
  class MortarStation {
    constructor(root, {scene, onChange = () => {}, isActive = () => true} = {}) {
      this.root = root; this.scene = scene; this.onChange = onChange; this.isActive = isActive;
      this.reset(true);
      // 控件可能被任务页外壳搬出 root，所以在 document 上监听、按 id 查找
      document.addEventListener('click', e => this.click(e));
      document.addEventListener('input', e => { if (e.target.id === 'drumTilt') this.setTilt(+e.target.value); });
      this.last = 0;
      setInterval(() => this.tick(), 50);
    }
    reset(quiet) {
      this.s = M.initialMortar(); this.spin = 0; this.note = ''; this.flags = {recipe: false, wet: false};
      if (!quiet) this.render();
    }
    total() { return this.s.sand + this.s.cement + this.s.water; }
    pouring() { const s = this.s; return s.tilt > M.TILT_POUR && this.total() > 0 && s.cart.pos < .02 && s.cart.load < M.CART_CAPACITY; }
    say(text) { this.note = text; this.noteAt = performance.now(); }
    click(e) {
      const b = e.target.closest?.('button[data-mortar-add], #mixerRun, #cartGo, #cartBack'); if (!b || b.disabled) return;
      if (b.dataset.mortarAdd) {
        const key = b.dataset.mortarAdd, delta = +b.dataset.delta;
        this.s = M.add(this.s, key, delta);
        if (this.s.note) this.say(this.s.note);
        else if (delta > 0 && this.s.mixed > 0) this.say(`又加了${NAMES[key]}，新料还没拌开，要接着拌一阵。`);
      } else if (b.id === 'mixerRun') {
        this.s = {...this.s, running: !this.s.running};
        if (this.s.running && !this.total()) this.say('滚筒还是空的：先投料，再搅拌。');
      } else if (b.id === 'cartGo' || b.id === 'cartBack') {
        const go = b.id === 'cartGo';
        if (go && !this.s.cart.load) this.say('灰车是空的：先倾翻滚筒出料，再送过去。');
        this.s = {...this.s, cart: {...this.s.cart, target: go ? 1 : 0}};
      } else return;
      this.render();
    }
    setTilt(v) {
      this.s = {...this.s, tilt: v};
      if (v > M.TILT_POUR && this.total() && this.s.cart.pos > .02) this.say('灰车不在出料口下方：先把灰车推回出料位。');
      else if (v > M.TILT_POUR && this.total() && M.uniformity(this.s) < 1) this.say('还没拌匀就出料了，倒出来的料会夹着干砂和水泥。');
      this.render();
    }
    tick() {
      const now = performance.now(), dt = this.last ? Math.min(.1, (now - this.last) / 1000) : 0; this.last = now;
      if (!this.isActive() || !dt) return;
      const before = this.s, full = before.cart.load >= M.CART_CAPACITY - .01;
      const moving = before.running || Math.abs(before.cart.pos - before.cart.target) > 1e-3 || this.pouring() || (before.cart.pos > .98 && before.cart.load > 0);
      if (!moving) return;
      this.s = M.step(before, dt);
      if (this.s.running) this.spin = (this.spin + dt * 2.6) % (Math.PI * 2);
      if (!full && this.s.cart.load >= M.CART_CAPACITY - .01 && this.total()) this.say('灰车装满了：推到砌筑位卸料，再回来接。');
      if (before.cart.load > 0 && this.s.cart.load === 0 && this.s.cart.pos > .98) this.say(this.s.tray.quality === 'good' ? '砂浆倒进灰槽，砌筑位可以接着铺灰了。' : `倒进灰槽的料：${M.QUALITY_TEXT[this.s.tray.quality]}。这样的料不好铺灰。`);
      this.render(true);
    }
    getState() {
      const s = this.s, u = M.uniformity(s), c = M.consistency(s);
      if (M.recipeMatched(s)) this.flags.recipe = true;
      if (c === 'wet' && u >= 1) this.flags.wet = true;
      return {...s, uniformity: u, consistency: c, consistencyText: M.CONSISTENCY_TEXT[c], quality: M.batchQuality(s),
        drumLoad: M.drumLoad(s), spin: this.spin, pouring: this.pouring(), pourQuality: M.batchQuality(s),
        recipeHit: this.flags.recipe, wetMixed: this.flags.wet, note: this.note, noteAt: this.noteAt || 0};
    }
    render(fromTick) {
      const st = this.getState(), $ = id => document.getElementById(id);
      for (const k of ['sand', 'cement', 'water']) {
        const out = $('feed-' + k); if (out) out.textContent = `${Math.round(st[k] * 10) / 10} 份`;
        document.querySelectorAll(`[data-mortar-add="${k}"]`).forEach(b => { b.disabled = st.tilt > 5 || (+b.dataset.delta > 0 ? st[k] >= M.LIMITS[k] : st[k] <= 0); });
      }
      const run = $('mixerRun'); if (run) { run.textContent = st.running ? '■ 停机' : '▶ 开机搅拌'; run.setAttribute('aria-pressed', String(st.running)); }
      const pct = Math.round(st.uniformity * 100);
      const bar = $('mixBar'); if (bar) bar.style.width = pct + '%';
      const mv = $('mixValue'); if (mv) mv.textContent = pct + '%';
      const ms = $('mixState'); if (ms) ms.textContent = !st.drumLoad ? '滚筒里还没有料。' : `稀稠：${st.consistencyText}${st.uniformity < 1 ? ' · 还没拌匀' : ' · 已拌匀'}`;
      const tilt = $('drumTilt'); if (tilt && +tilt.value !== st.tilt) tilt.value = st.tilt;
      const tv = $('drumTiltValue'); if (tv) tv.textContent = Math.round(st.tilt) + '°' + (st.tilt > M.TILT_POUR ? ' · 出料' : st.tilt > 5 ? '' : ' · 搅拌位');
      const cl = $('cartLoadValue'); if (cl) cl.textContent = `灰车 ${Math.round(st.cart.load * 10) / 10} / ${M.CART_CAPACITY} 份 · 灰槽 ${Math.round(st.tray.load * 10) / 10} 份`;
      const go = $('cartGo'), back = $('cartBack');
      if (go) go.disabled = st.cart.target === 1; if (back) back.disabled = st.cart.target === 0;
      this.scene?.updateMortar?.(st);
      this.onChange(st, fromTick);
    }
  }
  window.MortarStation = MortarStation;
})();

/* The controls and the scene consume the same measured brick model. */
(() => {
  const M = ManualModel;
  const targets = ['stretcher', 'header', 'edge'];
  const targetText = [
    '把砖平放，让240 mm长边沿墙的长度方向。',
    '保持平放，转动90°，让240 mm长边穿过墙厚。',
    '把砖侧过来，观察这一皮的高度发生了什么变化。'
  ];
  class ManualGame {
    constructor(root, { onChange = () => {}, onComplete = () => {} } = {}) {
      this.root = root; this.onChange = onChange; this.onComplete = onComplete;
      this.lesson = 0; this.completed = [false, false, false]; this.orientationStep = 0;
      this.kind = 'header'; this.width = 240; this.placed = []; this.slot = 'slot-0';
      this.offset = 0; this.mortar = 14; this.sameBond = false; this.feedback = '';
      this.feedbackTone = ''; this.boundClick = e => this.click(e); this.boundInput = e => this.input(e);
      root.addEventListener('click', this.boundClick); root.addEventListener('input', this.boundInput);
      this.render();
    }
    setLesson(index) {
      this.lesson = M.clamp(index, 0, 2); this.feedback = ''; this.feedbackTone = '';
      if (this.lesson === 1 && this.kind === 'edge') this.kind = 'stretcher';
      this.render();
    }
    selectSlot(id) {
      if (typeof id === 'object') id = id.id || id.name || id.role;
      if (this.lesson !== 1) return;
      const key = String(id || '').replace(/^placed-/, '');
      if (M.thicknessPlan(this.width).slots.some(s => s.id === key)) {
        this.slot = key; this.feedback = ''; this.render();
      }
    }
    getState() {
      let scene;
      if (this.lesson === 0) {
        scene = { bricks: [M.orientedBrick(this.kind, { id: 'orientation-brick', selected: true })], width: 240, length: 240, course: 1, issue: '', kind: this.kind, single: true,
          title: '先看长边，再看砖高', caption: '拖动旋转画面；砖的朝向相对墙长方向判断，不随观察角度改变。' };
      } else if (this.lesson === 1) {
        const plan = M.thicknessPlan(this.width), s = plan.slots.find(s => s.id === this.slot);
        const occupied = this.placed.some(b => b.slot === this.slot);
        scene = { bricks: this.placed.map(b => ({ ...b, selected: b.slot === this.slot })), width: this.width, length: 240, course: 1,
          slots: plan.slots.filter(s => !this.placed.some(b => b.slot === s.id)).map(s => ({ ...s, selected: s.id === this.slot })),
          ghost: s && !occupied ? M.orientedBrick(this.kind, { ...s, w: M.ORIENTATIONS[this.kind].w, d: M.ORIENTATIONS[this.kind].d, h: M.ORIENTATIONS[this.kind].h, kind: this.kind, id: 'ghost' }) : null,
          title: this.width === 240 ? '拼出一砖厚的24墙' : '拼出一砖半厚的墙',
          caption: '本关只试排一皮墙厚；上下皮怎样咬合，在下一关继续检查。', check: M.validateThickness(this.placed, this.width) };
      } else {
        const wall = M.wallCourses({ width: this.width, offset: this.offset, mortar: this.mortar, sameBond: this.sameBond });
        const inspection = M.inspectBond(wall);
        scene = { ...wall, issue: inspection.throughCount ? 'through' : '', seams: inspection.aligned, inspection,
          title: '上下两皮，不能只是复制', caption: '直墙中部观察窗口；两端是截面，不能照搬为墙端或转角的收口排法。' };
      }
      return { ...scene, lesson: this.lesson, completed: [...this.completed], orientationStep: this.orientationStep,
        orientation: this.kind, placedCount: this.placed.length, selectedSlot: this.slot,
        offset: this.offset, mortar: this.mortar, sameBond: this.sameBond, feedback: this.feedback,
        progress: this.completed.filter(Boolean).length, model: 'standard-brick-mm' };
    }
    reset() {
      this.feedback = ''; this.feedbackTone = '';
      if (this.lesson === 0) { this.kind = 'header'; this.orientationStep = 0; }
      if (this.lesson === 1) { this.kind = 'stretcher'; this.placed = []; this.slot = 'slot-0'; }
      if (this.lesson === 2) { this.offset = 0; this.mortar = 14; this.sameBond = false; }
      this.completed[this.lesson] = false; this.render();
    }
    finish(message) {
      const fresh = !this.completed[this.lesson];
      this.completed[this.lesson] = true; this.feedback = message; this.feedbackTone = 'success';
      if (fresh) this.onComplete({ lesson: this.lesson, completed: [...this.completed] });
    }
    invalidate(lesson) {
      this.completed[lesson] = false;
      // Orientation is a sequence of observations; after editing a finished
      // sequence, reopen its first task instead of leaving its check disabled.
      if (lesson === 0 && this.orientationStep === 3) this.orientationStep = 0;
    }
    click(event) {
      const button = event.target.closest('button');
      if (!button || !this.root.contains(button) || button.disabled) return;
      const action = button.dataset.gameAction;
      if (!action) return;
      this.feedbackTone = '';
      if (action === 'lesson') return this.setLesson(Number(button.dataset.value));
      if (action === 'reset') return this.reset();
      if (action === 'next') return this.setLesson(Math.min(2, this.lesson + 1));
      if (action === 'rotate') { if (this.lesson === 0) this.invalidate(0); this.kind = this.kind === 'header' ? 'stretcher' : 'header'; this.feedback = '方向已改变。看长边沿着墙长，还是穿过墙厚。'; }
      if (action === 'flip') { if (this.lesson === 0) this.invalidate(0); this.kind = this.kind === 'edge' ? 'stretcher' : 'edge'; this.feedback = this.kind === 'edge' ? '侧放后高度为115 mm，已经不是53 mm高的一皮平砌砖。' : '砖已放平，高度恢复为53 mm。'; }
      if (action === 'orientation-check') {
        const target = targets[Math.min(this.orientationStep, 2)];
        if (this.kind !== target) {
          this.invalidate(0);
          this.feedback = target === 'edge' ? '还没有侧过来。用“翻转平 / 侧”，对照砖高。' : target === 'header' ? '还不是丁砖。先放平，再把长边转到墙厚方向。' : '还不是顺砖。先放平，再把长边转到墙长方向。'; this.feedbackTone = 'retry';
        } else if (this.orientationStep < 2) {
          this.orientationStep++; this.feedback = `观察正确。接下来：${targetText[this.orientationStep]}`; this.feedbackTone = 'success';
        } else {
          this.orientationStep = 3; this.finish('三种摆放都观察完成。顺砖、丁砖都可以平砌；“横竖”必须说清是平面转向，还是把砖侧立。');
        }
      }
      if (action === 'width') {
        const width = Number(button.dataset.value);
        if (width !== this.width) { this.width = width; this.placed = []; this.slot = 'slot-0'; this.invalidate(1); this.invalidate(2); }
        this.feedback = width === 365 ? '一砖半墙：240 + 10 + 115 = 365 mm，常称37墙。按这一模数试排。' : '一砖厚墙：240 mm。把丁砖的长边沿墙厚方向摆放。';
      }
      if (action === 'slot') { this.slot = button.dataset.value; this.feedback = '空位已选中，先观察蓝色预览砖是否放得下。'; }
      if (action === 'place') {
        const s = M.thicknessPlan(this.width).slots.find(s => s.id === this.slot), trial = M.tryPlace(this.placed, s, this.kind, this.width);
        this.feedback = trial.reason; this.feedbackTone = trial.ok ? 'success' : 'retry';
        if (trial.ok) { this.invalidate(1); this.placed.push(trial.brick); const next = M.thicknessPlan(this.width).slots.find(s => !this.placed.some(b => b.slot === s.id)); if (next) this.slot = next.id; }
      }
      if (action === 'undo') { const removed = this.placed.pop(); if (removed) { this.slot = removed.slot; this.invalidate(1); } this.feedback = '已撤回最后一块砖，可以换个方向再试。'; }
      if (action === 'thickness-check') {
        const result = M.validateThickness(this.placed, this.width);
        if (result.ok) this.finish(this.width === 240 ? '24墙试排完成：丁砖长边跨过240 mm墙厚。下一关还要检查上下皮咬合。' : '365 mm墙厚试排完成：丁砖与顺砖之间留10 mm示例灰缝。下一皮还要换位并错缝。');
        else { this.invalidate(1); this.feedback = `还有${result.missing.length}个空位没有正确填好。先选空位，转砖，再放砖。`; this.feedbackTone = 'retry'; }
      }
      if (action === 'bond') { const next = button.dataset.value === 'same'; if (next !== this.sameBond) this.invalidate(2); this.sameBond = next; this.feedback = this.sameBond ? '上下皮采用相同排法。即使正面错开，沿墙厚方向的纵缝还可能一直延续。' : '上皮切换顺丁关系，使上下皮能跨过下皮沿厚度方向的接缝。'; }
      if (action === 'bond-check') {
        const check = M.inspectBond(M.wallCourses({ width: this.width, offset: this.offset, mortar: this.mortar, sameBond: this.sameBond }));
        if (check.ok) this.finish('本关几何目标完成：顺丁换皮、62.5 mm模数偏移、10 mm示例灰缝。真实墙体还要复核砂浆饱满度、平整度和垂直度。');
        else {
          this.invalidate(2);
          const reasons = [];
          if (!check.linked) reasons.push('先用顺丁换皮，避免只复制下皮');
          if (check.throughCount) reasons.push('上下皮仍有竖缝重合');
          if (!check.targetStagger) reasons.push('把上皮调到本关62.5 mm偏移目标');
          if (!check.jointMatches) reasons.push('把本关示例灰缝调回10 mm');
          this.feedback = reasons.join('；') + '。'; this.feedbackTone = 'retry';
        }
      }
      this.render();
    }
    input(event) {
      const input = event.target;
      if (input.dataset.gameInput === 'offset') { if (this.offset !== Number(input.value)) this.invalidate(2); this.offset = Number(input.value); }
      else if (input.dataset.gameInput === 'mortar') { if (this.mortar !== Number(input.value)) this.invalidate(2); this.mortar = Number(input.value); }
      else return;
      this.feedback = '画面已随参数更新。观察竖缝和层高，再点击检查。'; this.feedbackTone = '';
      const out = this.root.querySelector(`[data-game-output="${input.dataset.gameInput}"]`);
      if (out) out.textContent = `${input.value} mm`;
      this.refreshReadout(); this.emit();
    }
    emit() { this.onChange(this.getState()); }
    refreshReadout() {
      this.root.querySelectorAll?.('[data-game-action="lesson"]').forEach(button => {
        const i = Number(button.dataset.value), badge = button.querySelector('b');
        if (badge) badge.textContent = this.completed[i] ? '✓' : String(i + 1);
      });
      const progress = this.root.querySelector('[data-game-progress-count]');
      if (progress) progress.textContent = `已完成 ${this.completed.filter(Boolean).length} / 3 关`;
      const note = this.root.querySelector('[data-game-feedback]');
      if (note) { note.textContent = this.feedback || this.defaultFeedback(); note.dataset.tone = this.feedbackTone; }
      const stats = this.root.querySelector('[data-game-stats]');
      if (stats && this.lesson === 2) {
        const inspected = M.inspectBond(M.wallCourses({ width: this.width, offset: this.offset, mortar: this.mortar, sameBond: this.sameBond }));
        stats.innerHTML = `<span>竖缝重合 <b>${inspected.throughCount}处</b></span><span>单皮砖高 <b>53 mm</b></span><span>水平灰缝 <b>${this.mortar} mm</b></span>`;
      }
    }
    defaultFeedback() {
      return ['先按目标摆砖，再点击“确认摆放”。可以拖动画面从各个方向观察。', '蓝色砖是当前预览；点击空位后转动方向，再放入。', '先观察初始问题，再调整上皮。10 mm是本关演示目标，并非所有材料统一验收值。'][this.lesson];
    }
    render() {
      const names = ['认识一块砖', '拼出墙厚', '检查上下皮'];
      const state = this.getState();
      const nav = `<div class="game-progress" aria-label="人工砌筑闯关进度">${names.map((n, i) => `<button type="button" data-game-action="lesson" data-value="${i}" aria-pressed="${i === this.lesson}"><b>${this.completed[i] ? '✓' : i + 1}</b><span>${n}</span></button>`).join('')}</div>`;
      const thickness = `<div class="game-choices" aria-label="选择墙厚"><button type="button" data-game-action="width" data-value="240" aria-pressed="${this.width === 240}">24墙 · 240 mm</button><button type="button" data-game-action="width" data-value="365" aria-pressed="${this.width === 365}">一砖半 · 365 mm</button></div>`;
      let body = '';
      if (this.lesson === 0) {
        const shape = M.ORIENTATIONS[this.kind], target = Math.min(this.orientationStep, 2);
        body = `<div class="game-task"><span class="game-kicker">观察 ${Math.min(3, this.orientationStep + 1)} / 3</span><h3>${this.orientationStep === 3 ? '顺、丁、侧，你分清了吗？' : targetText[target]}</h3><p>标准砖示例：240 × 115 × 53 mm。沿台面“墙长方向”标识判断。</p></div>
          <div class="game-current"><span>当前摆放</span><strong>${shape.name}</strong><p>${shape.note}</p></div>
          <div class="game-stats"><span>沿墙长 <b>${shape.w} mm</b></span><span>沿墙厚 <b>${shape.d} mm</b></span><span>砖高 <b>${shape.h} mm</b></span></div>
          <div class="game-button-row"><button type="button" data-game-action="rotate" ${this.kind === 'edge' ? 'disabled' : ''}>绕竖轴转90°</button><button type="button" data-game-action="flip">翻转平 / 侧</button></div>
          <button type="button" class="game-primary game-wide" data-game-action="orientation-check" ${this.orientationStep === 3 ? 'disabled' : ''}>确认摆放</button>`;
      } else if (this.lesson === 1) {
        const plan = M.thicknessPlan(this.width), shape = M.ORIENTATIONS[this.kind];
        body = `<div class="game-task"><span class="game-kicker">单皮试排 · 已放 ${this.placed.length} / ${plan.slots.length} 块</span><h3>空位、朝向、灰缝，一个都不能少。</h3></div>${thickness}
          <p class="game-small">${this.width === 240 ? '240 mm是一砖长。丁砖横跨墙厚，先用两块拼满本关小样。' : '240 + 10 + 115 = 365 mm，常称37墙。本页把“三六墙”按一砖半墙的模数讲解。'}</p>
          <div class="game-slots" aria-label="选择试排空位">${plan.slots.map((s, i) => `<button type="button" data-game-action="slot" data-value="${s.id}" aria-pressed="${s.id === this.slot}">${this.placed.some(b => b.slot === s.id) ? '✓' : '○'} ${i + 1} ${s.label}</button>`).join('')}</div>
          <div class="game-current game-compact"><span>待放砖</span><strong>${shape.name}</strong><span>${shape.w} × ${shape.d} × ${shape.h} mm</span></div>
          <div class="game-button-row"><button type="button" data-game-action="rotate">转90°</button><button type="button" class="game-primary" data-game-action="place">放入选中空位</button><button type="button" data-game-action="undo" ${!this.placed.length ? 'disabled' : ''}>撤销</button></div>
          <button type="button" class="game-wide" data-game-action="thickness-check">检查墙厚 →</button>`;
      } else {
        body = `<div class="game-task"><span class="game-kicker">两皮组砌 · 直墙中部观察窗口</span><h3>正面错开了，墙厚方向也要咬合。</h3></div>${thickness}
          <div class="game-choices"><button type="button" data-game-action="bond" data-value="swap" aria-pressed="${!this.sameBond}">顺丁换皮</button><button type="button" data-game-action="bond" data-value="same" aria-pressed="${this.sameBond}">照搬下皮 · 对照</button></div>
          <label class="game-range-label" for="gameOffset">上皮沿墙长偏移 <output data-game-output="offset">${this.offset} mm</output></label><input id="gameOffset" data-game-input="offset" type="range" min="0" max="125" step="12.5" value="${this.offset}"><p class="game-small">本关目标62.5 mm，即250 mm排砖模数的四分之一。先观察通缝，再修正。</p>
          <label class="game-range-label" for="gameMortar">水平灰缝示例 <output data-game-output="mortar">${this.mortar} mm</output></label><input id="gameMortar" data-game-input="mortar" type="range" min="4" max="18" step="2" value="${this.mortar}">
          <div class="game-stats" data-game-stats></div><button type="button" class="game-primary game-wide" data-game-action="bond-check">检查组砌与灰缝</button>`;
      }
      this.root.innerHTML = `${nav}<div class="game-body">${body}<div class="game-feedback" data-game-feedback role="status" aria-live="polite"></div>
        <div class="game-footer"><button type="button" data-game-action="reset">↺ 重试本关</button>${this.lesson < 2 ? `<button type="button" data-game-action="next">${this.completed[this.lesson] ? '下一关 →' : '先看下一关 →'}</button>` : `<span data-game-progress-count>已完成 ${this.completed.filter(Boolean).length} / 3 关</span>`}</div></div>`;
      this.refreshReadout(); this.emit();
    }
    destroy() { this.root.removeEventListener('click', this.boundClick); this.root.removeEventListener('input', this.boundInput); }
  }
  window.ManualGame = ManualGame;
})();

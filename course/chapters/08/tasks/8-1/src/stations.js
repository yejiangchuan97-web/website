/* 任务 8-1 安全操作 —— 统一任务页外壳的四个工位。
 * 三维现场（scene.js）和状态（model.js）都由 app.js 接好，这里只通过 window.SafetyLab 读状态、发事件。
 * 四个工位就是一次“现场暂停”的四步：巡查找危险 → 急停隔离 → 处置复查 → 复位重启；状态一路带过去。
 */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

  function boot() {
    const lab = window.SafetyLab, M = lab.model, H = M.hazards, scene = lab.scene;
    const send = ev => lab.dispatch(ev);
    const count = (s, k) => M.count(s, k);

    // 事件里的“被拦住”只出现一次，记下来给试一试用
    const flags = {};
    const resetFlags = () => { for (const k of Object.keys(flags)) delete flags[k]; };
    lab.onChange((s, ev) => {
      if (s.error) flags[ev.type + ':' + s.code] = true;
      // 不等外壳 200 ms 一次的轮询：状态一变就推给当前工位，按钮和卡片立即跟上
      setTimeout(() => window.c2Lab?.ctx?._state(lab.state()));
    });

    /* —— 三维区上方：六处危险（找到之前只显示问号）—— */
    const picker = document.createElement('div');
    picker.className = 'c8-hazards'; picker.setAttribute('role', 'radiogroup'); picker.setAttribute('aria-label', '六处危险');
    let toast = null;
    const chips = H.map(h => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.id = h.id; b.setAttribute('role', 'radio');
      b.addEventListener('click', () => {
        const s = lab.state();
        if (!s.found[h.id]) {
          if (!scene.webgl) { send({type: 'find', id: h.id}); return; }
          toast?.('这一处还没找到：在三维现场里点出来。', 'info'); return;
        }
        send({type: 'select', id: h.id}); scene.focus(h.id);
      });
      picker.append(b); return b;
    });
    const paintPicker = s => chips.forEach((b, i) => {
      const h = H[i], f = s.found[h.id], v = s.verified[h.id], x = s.fixed[h.id];
      const html = f ? `<span class="c8-ico">${h.icon}</span><b>${esc(h.label)}</b><i class="c8-dots"><em class="on"></em><em class="${x ? 'on' : ''}"></em><em class="${v ? 'on' : ''}"></em></i>`
        : `<span class="c8-ico q">?</span><b>未找到</b><i class="c8-dots"><em></em><em></em><em></em></i>`;
      if (b.dataset.html !== html) { b.innerHTML = html; b.dataset.html = html; }
      b.classList.toggle('found', f); b.classList.toggle('ok', v);
      b.setAttribute('aria-checked', String(s.selected === h.id));
      b.title = !f ? '还没找到' : v ? '已复查' : x ? '已处置，待复查' : '已找到，待处置';
    });

    /* —— 小部件 —— */
    const statusRow = (c, into) => {
      const st = c.h('div', 'c8-run'), stop = c.button('急停', () => send({type: 'estop'}));
      stop.classList.add('c8-stop'); into.append(c.row(st, stop));
      c.lab.onState(s => {
        const [cls, b, t] = s.running ? ['on', s.started ? '已重新启动' : '现场运行中', s.started ? '按新通道恢复作业' : '挖掘机在回转，皮带在转']
          : s.armed ? ['ready', '已复位，静止', '等单独的启动指令'] : ['off', '急停已按下', '机械停住，能量还在'];
        const html = `<i></i><b>${b}</b><span>${t}</span>`;
        st.className = 'c8-run ' + cls; if (st.innerHTML !== html) st.innerHTML = html;
      });
    };
    const hazardCard = (c, into, mode) => {
      const card = c.h('div', 'c8-card'); into.append(card);
      let key = '';
      c.lab.onState(s => {
        const id = s.selected, h = H.find(x => x.id === id);
        const k = [id, s.found[id], s.fixed[id], s.verified[id], mode].join();
        if (k === key) return; key = k;
        if (!h || !s.found[id]) {
          card.className = 'c8-card empty';
          card.innerHTML = mode === 'find' ? '<p>在三维现场里点一处你觉得危险的地方。</p>' : '<p>在上方选一处已找到的危险。</p>';
          return;
        }
        const tag = s.verified[id] ? ['ok', '已复查'] : s.fixed[id] ? ['mid', '待复查'] : ['', '待处置'];
        card.className = 'c8-card';
        card.innerHTML = `<div class="c8-card-head"><span class="c8-ico">${h.icon}</span><b>${esc(h.label)}</b>${mode === 'find' ? '' : `<span class="c8-tag ${tag[0]}">${tag[1]}</span>`}</div>`
          + `<p>${esc(h.finding)}</p>`
          + (mode === 'fix' ? `<p class="c8-do"><span>处置</span>${esc(h.fix)}</p>` : '')
          + (mode === 'fix' && s.verified[id] ? `<p class="c8-do ev"><span>复查</span>${esc(h.evidence)}</p>` : '');
      });
    };

    const STATIONS = [
      {
        id: 'find', name: '巡查找危险', lead: '现场还在干活。拖动看一圈，在三维里点出你觉得危险的地方。',
        build(c) {
          const g = c.section('刚找到的');
          hazardCard(c, g, 'find');
          const g2 = c.section('巡查记录');
          const grid = c.h('div', 'c8-found'); g2.append(grid);
          const cells = H.map(h => { const e = c.h('span', ''); grid.append(e); return [h, e]; });
          c.lab.onState(s => cells.forEach(([h, e]) => {
            const t = s.found[h.id] ? h.icon + ' ' + h.label : '？';
            if (e.textContent !== t) e.textContent = t; e.classList.toggle('on', s.found[h.id]);
          }));
          const tip = c.button('看哪里', () => {
            const s = lab.state(), left = H.filter(h => !s.found[h.id]);
            if (!left.length) { c.feedback('六处都找到了，去下一站。', 'ok'); return; }
            scene.focus(left[Math.floor(Math.random() * left.length)].id); c.feedback('镜头移过去了：仔细看看这附近。', 'info');
          });
          g2.append(c.row(tip, c.button('回到全景', () => scene.view('home'))));
          c.challenges([
            {id: 'first', icon: '🔍', title: '找到第一处', hint: '在三维里点设备或地面', check: s => count(s, 'found') >= 1,
              result: '先看清、先记下，不急着动手。'},
            {id: 'three', icon: '👀', title: '找到三处', hint: '转一转视角再找', check: s => count(s, 'found') >= 3,
              result: '危险分散在现场各处：用电、机械、高处、压力都要看。'},
            {id: 'opening', icon: '🕳', title: '发现脚下的洞口', hint: '俯视看得更清楚', check: s => s.found.opening,
              result: '洞口紧挨通道，没盖板没护栏，一脚踩空就是坠落。'},
            {id: 'all', icon: '📋', title: '六处都找到', hint: '还有藏在小设备上的', check: s => count(s, 'found') === 6,
              result: '六处都记下了。光找到不会让危险消失，下一站先停机。'},
          ]);
        },
      },
      {
        id: 'isolate', name: '急停隔离', lead: '先按急停让现场停下来，再把电、压力、吊物三股能量分别隔离。',
        build(c) {
          const g = c.section('现场');
          statusRow(c, g);
          const g2 = c.section('能量隔离');
          const rows = [
            {key: 'power', icon: '⚡', name: '配电箱', act: '断电挂锁', focus: 'electric', state: s => s.power === 'locked' ? ['ok', '已断电挂锁'] : ['no', '有电']},
            {key: 'pressure', icon: '💨', name: '喷涂机管路', act: '打开泄压', focus: 'pressure', state: s => s.pressure ? ['no', '有残余压力'] : ['ok', '压力表归零']},
            {key: 'load', icon: '🏗', name: '塔吊吊物', act: '落钩着地', focus: 'load', state: s => s.load === 'down' ? ['ok', '已落在垫木上'] : ['no', '悬在空中']},
          ];
          const list = c.h('div', 'c8-energy'); g2.append(list);
          const els = rows.map(r => {
            const row = c.h('div', 'c8-erow'), info = c.h('div', 'c8-einfo');
            const b = c.button(r.act, () => { scene.focus(r.focus); send({type: 'isolate', target: r.key}); }, {small: true});
            row.append(c.h('span', 'c8-eico', r.icon), info, b); list.append(row);
            return {r, row, info, b};
          });
          c.lab.onState(s => els.forEach(({r, row, info, b}) => {
            const [cls, t] = r.state(s), html = `<b>${r.name}</b><span>${t}</span>`;
            if (info.innerHTML !== html) info.innerHTML = html; row.className = 'c8-erow ' + cls; b.disabled = cls === 'ok';
          }));
          c.challenges([
            {id: 'early', icon: '⛔', title: '没停机先隔离', hint: '急停前点一次“断电挂锁”', check: () => flags['isolate:running'],
              result: '机械还在动就上手，会被拦下：先急停。'},
            {id: 'lock', icon: '🔒', title: '断电并挂锁', hint: '锁和“禁止合闸”牌都挂上', check: s => s.power === 'locked',
              result: '挂上自己的锁，别人就合不上闸。'},
            {id: 'bleed', icon: '💨', title: '让压力表回零', hint: '断电后再泄压', check: s => !s.pressure,
              result: '机器关了，管里的压力还在；泄压后才能拆接头。'},
            {id: 'load', icon: '🏗', title: '让吊物落地', hint: '放到垫木上', check: s => s.load === 'down',
              result: '急停只让吊钩停住，吊物还悬着；落地后才没有坠落能量。'},
          ]);
        },
      },
      {
        id: 'fix', name: '处置复查', lead: '在上方选一处危险，先处置，再核对复查：处置过的标签变蓝，复查过的变绿。',
        build(c) {
          const g = c.section('当前危险');
          hazardCard(c, g, 'fix');
          const fixB = c.button('处置', () => { const s = lab.state(); if (s.selected) { send({type: 'fix', id: s.selected}); scene.focus(s.selected); } else c.feedback('先在上方选一处危险。', 'warn'); }, {primary: true});
          const verB = c.button('核对复查', () => { const s = lab.state(); if (s.selected) send({type: 'verify', id: s.selected}); else c.feedback('先在上方选一处危险。', 'warn'); });
          const nextB = c.button('下一处', () => {
            const s = lab.state(), list = H.filter(h => s.found[h.id] && !s.verified[h.id]);
            const h = list.find(x => x.id !== s.selected) || list[0];
            if (!h) { c.feedback(count(s, 'found') < 6 ? '还有没找到的危险：回第一站接着找。' : '六处都复查过了。', 'info'); return; }
            send({type: 'select', id: h.id}); scene.focus(h.id);
          });
          g.append(c.row(fixB, verB, nextB));
          c.lab.onState(s => { const id = s.selected; fixB.disabled = !id || !s.found[id] || s.fixed[id]; verB.disabled = !id || !s.found[id] || s.verified[id]; });
          const g2 = c.section('复查进度');
          const bar = c.h('div', 'c8-steps'); g2.append(bar);
          const steps = H.map(h => { const e = c.h('span', '', h.icon); e.title = h.label; bar.append(e); return [h, e]; });
          c.lab.onState(s => steps.forEach(([h, e]) => { e.className = s.verified[h.id] ? 'ok' : s.fixed[h.id] ? 'mid' : s.found[h.id] ? 'f' : ''; }));
          c.challenges([
            {id: 'one', icon: '🛠', title: '处置第一处', hint: '选一处，点“处置”', check: s => count(s, 'fixed') >= 1,
              result: '处置完还不算完，要回头核对一遍。'},
            {id: 'belt', icon: '⚙', title: '装回皮带罩', hint: '断电后才能装', check: s => s.fixed.belt,
              result: '皮带和带轮被罩住，手和衣角就卷不进去。'},
            {id: 'opening', icon: '🕳', title: '盖好洞口', hint: '盖板加四周护栏', check: s => s.fixed.opening,
              result: '盖板固定、护栏封闭，人和东西都掉不下去。'},
            {id: 'all', icon: '✅', title: '六处都复查', hint: '每处：处置 → 核对复查', check: s => M.allVerified(s),
              result: '每处都有处置、有复查，现场才算恢复安全状态。'},
          ]);
        },
      },
      {
        id: 'restart', name: '复位重启', lead: '复位不等于开机：撤锁送电、急停复位、鸣笛启动，一步一步来。',
        build(c) {
          const g = c.section('现场');
          statusRow(c, g);
          const g2 = c.section('重新启动');
          g2.append(c.row(
            c.button('撤锁送电', () => { scene.focus('electric'); send({type: 'unlock'}); }),
            c.button('急停复位', () => { scene.view('home'); send({type: 'reset'}); }),
            c.button('鸣笛启动', () => { scene.view('home'); send({type: 'start'}); }, {primary: true}),
          ));
          const g3 = c.section('启动前核对');
          const list = c.h('div', 'c8-checks'); g3.append(list);
          const rows = [
            ['六处复查', s => `${count(s, 'verified')} / 6`, s => M.allVerified(s)],
            ['电源', s => s.power === 'on' ? '已送电' : '挂锁中', s => s.power === 'on'],
            ['急停', s => s.latched ? '锁住' : '已复位', s => !s.latched],
            ['吊物 / 压力', s => (s.load === 'down' ? '落地' : '悬空') + ' · ' + (s.pressure ? '有压' : '零压'), s => s.load === 'down' && !s.pressure],
          ].map(([label, val, ok]) => { const r = c.h('div', 'c8-check'); r.innerHTML = `<span>${label}</span><b></b>`; list.append(r); return {r, val, ok}; });
          c.lab.onState(s => rows.forEach(({r, val, ok}) => { r.className = 'c8-check ' + (ok(s) ? 'ok' : 'no'); const t = val(s), b = r.querySelector('b'); if (b.textContent !== t) b.textContent = t; }));
          c.challenges([
            {id: 'blocked', icon: '🚫', title: '复位被拦住', hint: '没复查完时试“急停复位”', check: () => flags['reset:unverified'] || flags['unlock:unverified'],
              result: '还有危险没复查，复位和送电都会被拦下。'},
            {id: 'still', icon: '🔓', title: '复位后它会动吗', hint: '复查完后点“急停复位”', check: s => s.armed && !s.running,
              result: '复位只是解开急停，设备照样静止。'},
            {id: 'power', icon: '🔌', title: '没送电启动不了', hint: '挂着锁时点“鸣笛启动”', check: () => flags['start:power'],
              result: '锁还挂在配电箱上，谁也启动不了——这正是挂锁的用处。'},
            {id: 'start', icon: '📢', title: '鸣笛后单独启动', hint: '送电、复位，再启动', check: s => s.started && s.running,
              result: '启动是一条单独的指令，先鸣笛提醒，人员走新通道。'},
          ]);
        },
      },
    ];

    let lastSeq = -1;
    NativeShell.start({
      task: '8-1', title: '安全操作',
      stage: byId('site'),
      stageTop: picker,
      stations: STATIONS,
      hint: '拖动旋转 · 滚轮缩放 · 点击设备',
      poll: () => lab.state(),
      reset() { send({type: 'restart-case'}); resetFlags(); scene.view('home'); },
      build(c) {
        toast = c.feedback;
        picker.hidden = c.station.id === 'restart';
        c.view('全景', () => scene.view('home'));
        c.view('俯视', () => scene.view('top'));
        c.view('近看', () => { const s = lab.state(); if (s.selected) scene.focus(s.selected); else c.feedback('先选一处危险。', 'info'); });
        const pause = c.tool('暂停画面', p => { scene.paused = p; });
        pause.set(!!scene.paused);
        const read = c.readouts([
          {id: 'found', label: '已找到'}, {id: 'ver', label: '已复查'}, {id: 'run', label: '现场'}, {id: 'energy', label: '未隔离能量'},
        ]);
        lastSeq = lab.state().seq;
        c.lab.onState(s => {
          paintPicker(s);
          read('found', count(s, 'found'), '/ 6'); read('ver', count(s, 'verified'), '/ 6');
          read('run', s.running ? '运行' : s.armed ? '已复位' : '急停', '');
          read('energy', M.energyLeft(s), '项');
        });
        const off = lab.onChange((s, ev) => {
          if (s.seq === lastSeq) return; lastSeq = s.seq;
          if (ev.type === 'select' && !s.error) return;
          if (s.message) c.feedback(s.message, s.error ? 'warn' : 'info');
        });
        c.onCleanup(off);
      },
    });
  }

  (function wait(n) {
    if (window.SafetyLab && window.NativeShell && document.getElementById('site')) boot();
    else if (n < 200) setTimeout(() => wait(n + 1), 50);
  })(0);
})();

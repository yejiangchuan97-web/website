/* 8-1 安全操作：现场暂停推演的状态模型（纯函数，三维场景和面板都只读它）。
 * 流程：巡查找出六处危险 → 急停 → 能量隔离（断电挂锁、泄压、吊物落地）→ 逐项处置并复查 → 撤锁送电、急停复位、单独启动。
 * 所有危险与处置均为课堂案例，不给通用安全距离，也不代表真实作业放行。
 */
(function (g) {
  'use strict';
  const hazards = [
    {id: 'electric', label: '临时用电', icon: '⚡',
      finding: '配电箱引出的电缆外皮破损，泡在积水里。',
      fix: '更换破损电缆，架空敷设',
      needs: 'power', evidence: '新电缆已架空，离开积水；绝缘外皮完好。'},
    {id: 'swing', label: '回转碰撞', icon: '🚜',
      finding: '人员通道穿过挖掘机回转范围。',
      fix: '设回转隔离围挡，人员通道改道',
      evidence: '围挡把回转范围圈起来，新通道绕开了它。'},
    {id: 'belt', label: '外露传动', icon: '⚙',
      finding: '钢筋加工机的皮带轮防护罩拆下没装回。',
      fix: '装回皮带防护罩',
      needs: 'power', evidence: '防护罩已装回并固定，手够不到皮带和带轮。'},
    {id: 'load', label: '悬吊物', icon: '🏗',
      finding: '塔吊吊着钢筋捆，下方就是人员通道。',
      fix: '吊物落在垫木上，拉警戒带',
      needs: 'load', evidence: '钢筋捆已平稳落在垫木上，下方区域已拉警戒。'},
    {id: 'opening', label: '楼面洞口', icon: '🕳',
      finding: '楼面预留洞口没有盖板和护栏。',
      fix: '盖上盖板，四周装防护栏杆',
      evidence: '盖板已固定，四周防护栏杆封闭。'},
    {id: 'pressure', label: '残余压力', icon: '💨',
      finding: '喷涂机已关，管路压力表仍有读数，接头在渗漏。',
      fix: '更换渗漏的管路接头',
      needs: 'pressure', evidence: '压力表回零后更换接头，复查无渗漏。'},
  ];
  const ids = hazards.map(h => h.id);
  const map = (v) => Object.fromEntries(ids.map(id => [id, v]));
  const byId = id => hazards.find(h => h.id === id);

  const initial = () => ({
    running: true, latched: false, armed: false, started: false,
    power: 'on', pressure: true, load: 'hung',
    found: map(false), fixed: map(false), verified: map(false),
    selected: null, message: '现场还在运行。先别动手，找出六处危险。', error: false, seq: 0,
  });

  const count = (s, k) => ids.filter(id => s[k][id]).length;
  const allVerified = s => ids.every(id => s.verified[id]);
  const energyLeft = s => (s.power === 'on' ? 1 : 0) + (s.pressure ? 1 : 0) + (s.load === 'hung' ? 1 : 0);

  function reduce(state, ev) {
    if (ev.type === 'restart-case') return initial();
    const s = JSON.parse(JSON.stringify(state));
    s.seq = (state.seq || 0) + 1; s.error = false; s.code = '';
    const ok = msg => { s.message = msg; return s; };
    const fail = (msg, code) => { s.message = msg; s.error = true; s.code = code || 'blocked'; return s; };
    const h = ev.id ? byId(ev.id) : null;

    switch (ev.type) {
      case 'select':
        if (!h) return s;
        s.selected = h.id;
        return ok(s.found[h.id] ? h.finding : '这处还没在巡查里找到。');
      case 'find':
        if (!h) return ok('这里没有发现问题，再看看别处。');
        s.selected = h.id;
        if (s.found[h.id]) return ok(h.finding);
        s.found[h.id] = true;
        return ok('找到了：' + h.finding);
      case 'estop':
        if (!s.running && s.latched) return ok('急停已经按下并锁住了。');
        s.running = false; s.latched = true; s.armed = false;
        return ok('急停按下：机械全部停住。但电、压力和吊物还在，要分别隔离。');
      case 'isolate': {
        if (s.running) return fail('设备还在运行：先按急停，再动手隔离。', 'running');
        if (ev.target === 'power') {
          if (s.power === 'locked') return ok('配电箱已经断电挂锁。');
          s.power = 'locked'; return ok('断开总闸，挂上个人锁和“禁止合闸”牌。');
        }
        if (ev.target === 'pressure') {
          if (!s.pressure) return ok('管路已经泄压，压力表为零。');
          if (s.power !== 'locked') return fail('先断电挂锁，防止喷涂机在泄压时被再次启动。', 'order');
          s.pressure = false; return ok('打开泄压阀，压力表指针回到零。');
        }
        if (ev.target === 'load') {
          if (s.load === 'down') return ok('钢筋捆已经落在垫木上。');
          s.load = 'down'; return ok('吊钩慢慢下放，钢筋捆平稳落在垫木上。');
        }
        return s;
      }
      case 'fix': {
        if (!h) return s;
        if (!s.found[h.id]) return fail('这处危险还没在巡查里找到。', 'notfound');
        if (s.running) return fail('设备还在运行，不能上去处置：先按急停。', 'running');
        if (h.needs === 'power' && s.power !== 'locked') return fail('电还没断：先到配电箱断电挂锁。', 'energy');
        if (h.needs === 'pressure' && s.pressure) return fail('管路还有压力，拆接头会喷出来：先泄压。', 'energy');
        if (h.needs === 'load' && s.load !== 'down') return fail('钢筋捆还吊在空中：先让吊物落地。', 'energy');
        if (s.fixed[h.id]) return ok(h.label + '已处置，去核对复查。');
        s.fixed[h.id] = true; s.verified[h.id] = false;
        return ok(h.fix + '。处置完了，还要复查。');
      }
      case 'verify':
        if (!h) return s;
        if (!s.fixed[h.id]) return fail('还没处置，不能只点“复查”把危险勾掉。', 'notfixed');
        s.verified[h.id] = true;
        return ok('复查通过：' + h.evidence);
      case 'unlock':
        if (s.power === 'on') return ok('电源本来就是通的。');
        if (!allVerified(s)) return fail('还有危险没复查，不能撤锁送电。', 'unverified');
        s.power = 'on'; return ok('确认人员撤离，本人取下自己的锁，合闸送电。');
      case 'reset':
        if (!s.latched) return ok(s.running ? '设备在运行，没有需要复位的急停。' : '急停已经复位。');
        if (!allVerified(s)) return fail('还有危险没复查，急停复位被拦下。', 'unverified');
        s.latched = false; s.armed = true; s.running = false;
        return ok('急停已复位：设备仍然静止，等单独的启动指令。');
      case 'start':
        if (s.latched) return fail('急停还锁着：先复位。', 'latched');
        if (!s.armed) return fail('还没复位，不能启动。', 'latched');
        if (s.power !== 'on') return fail('配电箱还挂着锁，没有送电。', 'power');
        if (s.running) return ok('现场已经在运行。');
        s.running = true; s.started = true;
        return ok('鸣笛示警后启动：现场按新通道恢复作业。');
      default:
        return s;
    }
  }

  const api = {hazards, ids, initial, reduce, count, allVerified, energyLeft};
  g.SafetyModel = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);

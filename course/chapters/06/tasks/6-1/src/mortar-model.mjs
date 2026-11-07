/** 砂浆搅拌与送料的教学模型（纯数据，无 DOM）。
 * 用“份”表示投料量，本页示例配料为 砂 4 · 水泥 1 · 水 1，只是教学设定，不是任何砂浆的施工配合比。
 * 拌匀程度、稀稠只分档显示，不给强度、稠度等实测数值。
 */
export const RECIPE = Object.freeze({sand: 4, cement: 1, water: 1});
export const LIMITS = Object.freeze({sand: 6, cement: 2, water: 3});
export const MIX_SECONDS = 6;        // 教学设定：投料后连续搅拌 6 s 视为拌匀
export const TILT_POUR = 60;         // 滚筒倾翻到 60° 以上开始出料
export const CART_CAPACITY = 6;      // 灰车一次能装的“份”数

export function initialMortar() {
  return {sand: 0, cement: 0, water: 0, mixed: 0, running: false, tilt: 0,
    cart: {pos: 0, load: 0, quality: '', target: 0}, tray: {load: 0, quality: ''}, poured: [], delivered: []};
}

const total = s => s.sand + s.cement + s.water;
const dry = s => s.sand + s.cement;

/** 稀稠只看水和干料的比例：本页示例为 1 份水配 5 份干料。 */
export function consistency(s) {
  if (!dry(s) && !s.water) return 'empty';
  if (!dry(s)) return 'water';
  const r = s.water / dry(s) * 5;
  return r < 0.75 ? 'dry' : r > 1.3 ? 'wet' : 'ok';
}
export const CONSISTENCY_TEXT = {empty: '空筒', water: '只有水', dry: '太干', wet: '太稀', ok: '合适'};

export function recipeMatched(s) { return s.sand === RECIPE.sand && s.cement === RECIPE.cement && s.water === RECIPE.water; }
export function uniformity(s) { return total(s) ? Math.min(1, s.mixed / MIX_SECONDS) : 0; }

/** 这一筒料现在倒出来是什么质量。 */
export function batchQuality(s) {
  const c = consistency(s);
  if (c === 'empty') return '';
  if (uniformity(s) < 1) return 'unmixed';
  return c === 'ok' ? 'good' : c;
}
export const QUALITY_TEXT = {'': '—', good: '拌匀、稀稠合适', unmixed: '没拌匀', dry: '太干', wet: '太稀', water: '只有水'};

/** 投料：拌好的料里再加东西，相当于又要重新拌一阵。 */
export function add(s, key, delta) {
  if (s.tilt > 5) return {...s, note: '先把滚筒摇回搅拌位置，再投料。'};
  const next = Math.max(0, Math.min(LIMITS[key], s[key] + delta));
  if (next === s[key]) return {...s, note: delta > 0 ? '这一样已经加到本页上限。' : ''};
  const before = total(s), after = before - s[key] + next;
  // 新加入的料没拌过：已拌时间按旧料所占比例折算
  const mixed = delta > 0 && after ? s.mixed * before / after * 0.5 : s.mixed;
  return {...s, [key]: next, mixed, note: ''};
}

/** 时间推进 dt 秒：转动时累计拌和；倾翻时出料到灰车；灰车在两个位置间移动。 */
export function step(s, dt) {
  let n = {...s, cart: {...s.cart}, tray: {...s.tray}};
  if (n.running && total(n) && n.tilt <= TILT_POUR) n.mixed = Math.min(MIX_SECONDS * 1.5, n.mixed + dt);
  // 出料：滚筒倾翻且灰车停在出料口下方
  if (n.tilt > TILT_POUR && total(n) && n.cart.pos < 0.02 && n.cart.load < CART_CAPACITY) {
    const rate = 2.4 * dt * (n.running ? 1 : 0.35), t = total(n), take = Math.min(rate, t, CART_CAPACITY - n.cart.load);
    const q = batchQuality(n);
    n.cart.load += take;
    n.cart.quality = n.cart.quality && n.cart.quality !== q ? worse(n.cart.quality, q) : q;
    for (const k of ['sand', 'cement', 'water']) n[k] = Math.max(0, n[k] - take * n[k] / t);
    if (total(n) < 0.05) { n.sand = n.cement = n.water = 0; n.mixed = 0; }
    if (!n.poured.includes(q)) n.poured = [...n.poured, q];
  }
  // 灰车移动（0 = 出料口下，1 = 砌筑位）
  const goal = n.cart.target, d = goal - n.cart.pos;
  if (Math.abs(d) > 1e-3) n.cart.pos = Math.abs(d) < dt * 0.45 ? goal : n.cart.pos + Math.sign(d) * dt * 0.45;
  // 到砌筑位后把料倒进灰槽
  if (n.cart.pos > 0.98 && n.cart.load > 0) {
    const take = Math.min(n.cart.load, 3 * dt);
    n.tray.quality = n.tray.load > 0.05 && n.tray.quality !== n.cart.quality ? worse(n.tray.quality, n.cart.quality) : n.cart.quality;
    n.tray.load = Math.min(8, n.tray.load + take); n.cart.load -= take;
    if (n.cart.load < 0.05) {
      n.cart.load = 0;
      if (!n.delivered.includes(n.tray.quality)) n.delivered = [...n.delivered, n.tray.quality];
      n.cart.quality = '';
    }
  }
  return n;
}
function worse(a, b) { const order = ['good', 'dry', 'wet', 'unmixed', 'water']; return order.indexOf(a) > order.indexOf(b) ? a : b; }

/** 有多少“份”料还在滚筒里（显示用，一位小数）。 */
export function drumLoad(s) { return Math.round(total(s) * 10) / 10; }

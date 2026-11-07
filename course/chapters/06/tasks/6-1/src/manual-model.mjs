/* Physical teaching model. Coordinates are millimetres; x follows the wall,
   y is wall thickness, z is height. The observation window is a section of a
   continuing straight wall, not a worked-out end or corner bonding detail. */
export const BRICK = Object.freeze({ length: 240, width: 115, height: 53 });
export const JOINT = 10;
export const ORIENTATIONS = Object.freeze({
  stretcher: { w: 240, d: 115, h: 53, name: '顺砖', note: '砖的长边沿墙长方向，长侧面朝向墙面。' },
  header: { w: 115, d: 240, h: 53, name: '丁砖', note: '砖的长边沿墙厚方向，短端面朝向墙面。' },
  edge: { w: 240, d: 53, h: 115, name: '侧砌观察', note: '砖侧过来后，单皮砖高变为115 mm；不能继续按平砌53 mm排皮数。' }
});
export const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));
export function orientedBrick(kind = 'stretcher', data = {}) {
  const shape = ORIENTATIONS[kind] || ORIENTATIONS.stretcher;
  return { id: 'brick', x: 0, y: 0, z: 0, w: shape.w, d: shape.d, h: shape.h, kind, ...data };
}
export function overlaps(a, b, epsilon = 0.001) {
  return a.x < b.x + b.w - epsilon && a.x + a.w > b.x + epsilon &&
    a.y < b.y + b.d - epsilon && a.y + a.d > b.y + epsilon &&
    a.z < b.z + b.h - epsilon && a.z + a.h > b.z + epsilon;
}
export function thicknessPlan(width = 240) {
  width = Number(width) === 365 ? 365 : 240;
  // This exercise assembles one course. The following exercise separately
  // teaches cross-course bonding, so one trial never asserts a finished wall.
  const slots = width === 240 ? [
    { id: 'slot-0', x: 0, y: 0, z: 0, w: 115, d: 240, h: 53, kind: 'header', label: '左侧空位' },
    { id: 'slot-1', x: 125, y: 0, z: 0, w: 115, d: 240, h: 53, kind: 'header', label: '右侧空位' }
  ] : [
    { id: 'slot-0', x: 0, y: 0, z: 0, w: 115, d: 240, h: 53, kind: 'header', label: '前排左侧' },
    { id: 'slot-1', x: 125, y: 0, z: 0, w: 115, d: 240, h: 53, kind: 'header', label: '前排右侧' },
    { id: 'slot-2', x: 0, y: 250, z: 0, w: 240, d: 115, h: 53, kind: 'stretcher', label: '后排空位' }
  ];
  return { width, length: 240, slots };
}
export function tryPlace(placed, slot, kind, width) {
  if (!slot) return { ok: false, reason: '先选择一个空位。' };
  if (placed.some(b => b.slot === slot.id)) return { ok: false, reason: '这个位置已经放了砖；可先撤销，再重新试排。' };
  const brick = orientedBrick(kind, { id: `placed-${slot.id}`, slot: slot.id, x: slot.x, y: slot.y, z: slot.z });
  if (brick.x < 0 || brick.y < 0 || brick.x + brick.w > 240 || brick.y + brick.d > width)
    return { ok: false, reason: '砖超出了这块试排小样的边界。转动90°，再看长边是否沿墙厚方向。' };
  if (placed.some(other => overlaps(brick, other)))
    return { ok: false, reason: '砖与已放好的砖重叠了。需要保留灰缝，并调整摆放方向。' };
  if (brick.w !== slot.w || brick.d !== slot.d || brick.h !== slot.h)
    return { ok: false, reason: kind === 'edge' ? '本关按平砌试排。先把砖放平，砖高应为53 mm。' : '这个方向没有填满目标空位。转动90°后，比较砖长与墙厚。' };
  return { ok: true, brick, reason: `已放好一块${ORIENTATIONS[kind].name}，与邻砖之间保留10 mm示例灰缝。` };
}
export function validateThickness(placed, width) {
  const plan = thicknessPlan(width);
  const missing = plan.slots.filter(s => !placed.some(b => b.slot === s.id && b.x === s.x && b.y === s.y && b.w === s.w && b.d === s.d && b.h === s.h));
  const collision = placed.some((b, i) => placed.slice(i + 1).some(c => overlaps(b, c)));
  const outside = placed.some(b => b.x < 0 || b.y < 0 || b.x + b.w > plan.length || b.y + b.d > plan.width);
  return { ok: !missing.length && !collision && !outside && placed.length === plan.slots.length, missing: missing.map(s => s.id), collision, outside, count: placed.length, total: plan.slots.length };
}
function row(kind, y, z, length, offset, course, rowId) {
  const size = ORIENTATIONS[kind], pitch = size.w + JOINT, items = [];
  const first = Math.floor(-offset / pitch) - 1, last = Math.ceil((length - offset) / pitch) + 1;
  for (let i = first; i <= last; i++) {
    const start = i * pitch + offset, end = start + size.w;
    const x = Math.max(0, start), right = Math.min(length, end);
    if (right > x + 0.001) items.push(orientedBrick(kind, {
      id: `c${course}-${rowId}-${i}`, x, y, z, w: right - x, course,
      // cut means clipped by the observation section, not a prescribed cut brick.
      cut: x !== start || right !== end, section: x !== start || right !== end
    }));
  }
  return items;
}
export function wallCourses({ width = 240, length = 740, offset = 62.5, mortar = 10, sameBond = false } = {}) {
  width = Number(width) === 365 ? 365 : 240;
  offset = clamp(offset, 0, 125); mortar = clamp(mortar, 4, 18);
  let bottom, top;
  if (width === 240) {
    bottom = [...row('stretcher', 0, 0, length, 0, 0, 0), ...row('stretcher', 125, 0, length, 0, 0, 1)];
    top = sameBond ? [...row('stretcher', 0, 53 + mortar, length, offset, 1, 0), ...row('stretcher', 125, 53 + mortar, length, offset, 1, 1)] : row('header', 0, 53 + mortar, length, offset, 1, 0);
  } else {
    bottom = [...row('header', 0, 0, length, 0, 0, 0), ...row('stretcher', 250, 0, length, 0, 0, 1)];
    top = sameBond ? [...row('header', 0, 53 + mortar, length, offset, 1, 0), ...row('stretcher', 250, 53 + mortar, length, offset, 1, 1)] : [...row('stretcher', 0, 53 + mortar, length, offset, 1, 0), ...row('header', 125, 53 + mortar, length, offset, 1, 1)];
  }
  const bricks = [...bottom, ...top];
  return { bricks, bottom, top, width, length, offset, mortar, sameBond, course: 2, boundary: 'section' };
}
export function jointsOf(bricks) {
  const joints = [];
  // Find actual adjacent end faces whose y extents overlap. Across a bed joint,
  // only the common wall-thickness interval can form a vertically aligned seam.
  for (const a of bricks) for (const b of bricks) {
    const left = a.x + a.w, right = b.x, y0 = Math.max(a.y, b.y), y1 = Math.min(a.y + a.d, b.y + b.d);
    if (Math.abs(right - left - JOINT) < 0.001 && y1 > y0 + 0.001)
      joints.push({ x0: left, x1: right, y0, y1, center: (left + right) / 2 });
  }
  return joints;
}
export function inspectBond(wall) {
  const lower = jointsOf(wall.bottom), upper = jointsOf(wall.top), aligned = [];
  for (const a of lower) for (const b of upper) {
    const x0 = Math.max(a.x0, b.x0), x1 = Math.min(a.x1, b.x1), y0 = Math.max(a.y0, b.y0), y1 = Math.min(a.y1, b.y1);
    if (x1 > x0 + 0.001 && y1 > y0 + 0.001) aligned.push({ x: (x0 + x1) / 2, y: y0, d: y1 - y0, w: x1 - x0, z: 0, h: 106 + wall.mortar });
  }
  const lengths = lower.flatMap(a => upper.filter(b => Math.min(a.y1, b.y1) > Math.max(a.y0, b.y0)).map(b => Math.abs(a.center - b.center)));
  const minimumStagger = lengths.length ? Math.min(...lengths) : 0;
  return { aligned, throughCount: aligned.length, minimumStagger, linked: !wall.sameBond,
    ok: aligned.length === 0 && !wall.sameBond && Math.abs(wall.offset - 62.5) < 0.001 && wall.mortar === 10,
    jointMatches: wall.mortar === 10, targetStagger: Math.abs(wall.offset - 62.5) < 0.001 };
}

import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/manual-model.mjs';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('standard brick orientation preserves volume and shows side-laid height', () => {
  for (const kind of Object.keys(M.ORIENTATIONS)) {
    const b = M.orientedBrick(kind);
    assert.equal(b.w * b.d * b.h, 240 * 115 * 53);
  }
  assert.equal(M.orientedBrick('edge').h, 115);
});
test('wall-thickness games have physically valid success paths in both widths', () => {
  for (const width of [240, 365]) {
    const plan = M.thicknessPlan(width), placed = [];
    assert.equal(M.validateThickness(placed, width).ok, false);
    for (const slot of plan.slots) {
      const trial = M.tryPlace(placed, slot, slot.kind, width);
      assert.equal(trial.ok, true); placed.push(trial.brick);
    }
    assert.equal(M.validateThickness(placed, width).ok, true);
    assert.equal(Math.max(...placed.map(b => b.y + b.d)), width);
  }
});
test('placement rejects wrong orientation, side laying and occupied positions', () => {
  const plan = M.thicknessPlan(240), slot = plan.slots[0];
  assert.equal(M.tryPlace([], slot, 'stretcher', 240).ok, false);
  assert.equal(M.tryPlace([], slot, 'edge', 240).ok, false);
  const first = M.tryPlace([], slot, 'header', 240).brick;
  assert.equal(M.tryPlace([first], slot, 'header', 240).ok, false);
});
test('quarter-module bonding eliminates actual vertical seam overlap in both wall widths', () => {
  for (const width of [240, 365]) {
    const bad = M.inspectBond(M.wallCourses({ width, offset: 0 }));
    const good = M.inspectBond(M.wallCourses({ width, offset: 62.5 }));
    assert.ok(bad.throughCount > 0); assert.equal(bad.ok, false);
    assert.equal(good.throughCount, 0); assert.equal(good.minimumStagger, 62.5); assert.equal(good.ok, true);
  }
});
test('small nonzero offset still forms seam overlap; any nonzero shift is not a pass', () => {
  assert.ok(M.inspectBond(M.wallCourses({ offset: 5 })).throughCount > 0);
  assert.equal(M.inspectBond(M.wallCourses({ offset: 25 })).ok, false);
});
test('fixed observation sections never move bricks past the boundaries or overlap solids', () => {
  for (const width of [240, 365]) for (const offset of [0, 5, 12.5, 50, 62.5, 100, 125]) {
    const wall = M.wallCourses({ width, offset });
    for (const b of wall.bricks) {
      assert.ok(b.w > 0 && b.x >= 0 && b.y >= 0);
      assert.ok(b.x + b.w <= wall.length && b.y + b.d <= width);
    }
    for (let i = 0; i < wall.bricks.length; i++) for (const b of wall.bricks.slice(i + 1))
      assert.equal(M.overlaps(wall.bricks[i], b), false);
  }
});
test('offset alone cannot pass when depth bonding or demonstration mortar target is wrong', () => {
  assert.equal(M.inspectBond(M.wallCourses({ sameBond: true, offset: 62.5 })).ok, false);
  assert.equal(M.inspectBond(M.wallCourses({ mortar: 14, offset: 62.5 })).ok, false);
  assert.equal(M.wallCourses({ mortar: 14 }).top[0].z, 67);
});

function gameHarness() {
  const root = { innerHTML: '', addEventListener() {}, removeEventListener() {}, contains: () => true, querySelector: () => null };
  const context = { ManualModel: M, window: {} };
  vm.runInNewContext(readFileSync(new URL('../src/manual-game.js', import.meta.url), 'utf8'), context);
  const changes = [], completed = [];
  const game = new context.window.ManualGame(root, { onChange: s => changes.push(s), onComplete: s => completed.push(s) });
  const act = (action, value) => {
    const button = { dataset: { gameAction: action, value }, disabled: false };
    game.click({ target: { closest: () => button } });
  };
  return { game, act, changes, completed, root };
}
test('all three orientation tasks require the requested physical brick orientation', () => {
  const { game, act, completed } = gameHarness();
  act('orientation-check'); assert.equal(game.orientationStep, 0);
  act('rotate'); act('orientation-check'); assert.equal(game.orientationStep, 1);
  act('orientation-check'); assert.equal(game.orientationStep, 1);
  act('rotate'); act('orientation-check'); assert.equal(game.orientationStep, 2);
  act('flip'); act('orientation-check'); assert.equal(game.completed[0], true);
  assert.equal(completed.length, 1);
  act('orientation-check'); assert.equal(completed.length, 1);
  game.reset(); assert.equal(game.completed[0], false); assert.equal(game.orientationStep, 0);
});
test('game supports failed placement, successful placement, undo and a complete 365mm wall', () => {
  const { game, act } = gameHarness();
  game.setLesson(1); act('width', '365');
  game.kind = 'stretcher'; act('place'); assert.equal(game.placed.length, 0);
  act('rotate'); act('place'); assert.equal(game.placed.length, 1);
  act('place'); assert.equal(game.placed.length, 2);
  act('place'); assert.equal(game.placed.length, 2); // back row needs a stretcher
  act('rotate'); act('place'); assert.equal(game.placed.length, 3);
  act('undo'); assert.equal(game.placed.length, 2);
  act('thickness-check'); assert.equal(game.completed[1], false);
  act('place'); act('thickness-check'); assert.equal(game.completed[1], true);
});
test('bond challenge reads real geometric state and emits changed masonry height', () => {
  const { game, act, changes } = gameHarness(); game.setLesson(2);
  act('bond-check'); assert.equal(game.completed[2], false);
  game.input({ target: { dataset: { gameInput: 'offset' }, value: '62.5' } });
  act('bond-check'); assert.equal(game.completed[2], false); // mortar remains 14
  game.input({ target: { dataset: { gameInput: 'mortar' }, value: '10' } });
  act('bond-check'); assert.equal(game.completed[2], true);
  assert.equal(changes.at(-1).inspection.throughCount, 0);
  assert.equal(changes.at(-1).bricks.find(b => b.course === 1).z, 63);
});
test('undo revokes a completed wall-thickness result, navigation alone preserves it', () => {
  const { game, act } = gameHarness(); game.setLesson(1);
  game.kind = 'header'; act('place'); act('place'); act('thickness-check');
  assert.equal(game.completed[1], true);
  game.setLesson(2); game.setLesson(1); assert.equal(game.completed[1], true);
  act('undo'); assert.equal(game.completed[1], false);
  act('thickness-check'); assert.equal(game.completed[1], false);
  act('place'); act('thickness-check'); assert.equal(game.completed[1], true);
});
test('bonding parameter edits revoke the checked result until checked again', () => {
  const { game, act } = gameHarness(); game.setLesson(2); game.offset = 62.5; game.mortar = 10;
  act('bond-check'); assert.equal(game.completed[2], true);
  game.setLesson(0); game.setLesson(2); assert.equal(game.completed[2], true);
  game.input({ target: { dataset: { gameInput: 'offset' }, value: '62.5' } });
  assert.equal(game.completed[2], true); // unchanged input does not revoke
  game.input({ target: { dataset: { gameInput: 'offset' }, value: '0' } });
  assert.equal(game.completed[2], false); assert.equal(game.getState().inspection.ok, false);
  game.input({ target: { dataset: { gameInput: 'offset' }, value: '62.5' } });
  assert.equal(game.completed[2], false); // restoring geometry still needs a check
  act('bond-check'); assert.equal(game.completed[2], true);
  game.input({ target: { dataset: { gameInput: 'mortar' }, value: '14' } });
  assert.equal(game.completed[2], false);
});
test('bond type, wall width and failed checks cannot retain a stale completion badge', () => {
  const { game, act } = gameHarness(); game.setLesson(2); game.offset = 62.5; game.mortar = 10;
  act('bond-check'); act('bond', 'same'); assert.equal(game.completed[2], false);
  act('bond', 'swap'); act('bond-check'); assert.equal(game.completed[2], true);
  act('width', '365'); assert.equal(game.completed[2], false);
  act('bond-check'); assert.equal(game.completed[2], true);
  game.offset = 0; act('bond-check'); assert.equal(game.completed[2], false);
});
test('editing a finished orientation exercise reopens an actionable task', () => {
  const { game, act } = gameHarness();
  act('rotate'); act('orientation-check'); act('rotate'); act('orientation-check'); act('flip'); act('orientation-check');
  assert.equal(game.completed[0], true); assert.equal(game.orientationStep, 3);
  act('flip'); assert.equal(game.completed[0], false); assert.equal(game.orientationStep, 0);
  act('orientation-check'); assert.equal(game.orientationStep, 1);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createPatch, abrade, surfaceStatus, dustState, initialMaintenance, maintenance } from '../src/game.model.mjs';

const pass = (patch, grit = '180', extra = {}) => abrade(patch, { grit, pressure: 'light', dwell: false, ...extra });
const healthyDust = { power: true, connected: true, filterClean: true, bagReady: true, seal: true };
const step = (state, action) => maintenance(state, action).state;

test('三遍中等磨料加一遍细磨料达到教学目标，原状态不变', () => {
  const original = createPatch();
  let patch = original;
  for (const grit of ['180', '180', '180', '240']) patch = pass(patch, grit);
  assert.equal(surfaceStatus(patch).key, 'ready');
  assert.equal(patch.passes, 4);
  assert.deepEqual(original, createPatch());
});

test('粗磨去除起伏较快，但深砂痕需继续精磨', () => {
  const coarse = pass(createPatch(), '80');
  const medium = pass(createPatch(), '180');
  assert(coarse.rough < medium.rough);
  assert(coarse.scratch > medium.scratch);
  assert.equal(surfaceStatus(coarse).key, 'scratch');
  let refined = coarse;
  for (const grit of ['180', '180', '240']) refined = pass(refined, grit);
  assert.equal(surfaceStatus(refined).key, 'ready');
});

test('重压和驻留分别造成不可用后续打磨消除的损伤', () => {
  for (const misuse of [{ pressure: 'heavy' }, { dwell: true }]) {
    let damaged = pass(createPatch(), '180', misuse);
    const injury = damaged.damage;
    for (let i = 0; i < 30; i++) damaged = pass(damaged, '240');
    assert.equal(damaged.damage, injury);
    assert.equal(surfaceStatus(damaged).key, 'damaged');
    assert.equal(createPatch().damage, 0);
  }
});

test('磨损磨料反复操作不能达到本关表面目标', () => {
  let patch = createPatch();
  for (let i = 0; i < 150; i++) patch = pass(patch, 'worn');
  assert.notEqual(surfaceStatus(patch).key, 'ready');
});

test('表面目标的三个边界必须同时满足', () => {
  const boundary = { rough: .15, scratch: .2, damage: .199, passes: 1 };
  assert.equal(surfaceStatus(boundary).key, 'ready');
  assert.equal(surfaceStatus({ ...boundary, rough: .151 }).key, 'raw');
  assert.equal(surfaceStatus({ ...boundary, scratch: .201 }).key, 'scratch');
  assert.equal(surfaceStatus({ ...boundary, damage: .2 }).key, 'damaged');
});

test('所有控尘条件通过后可作业，任一故障均阻止作业', () => {
  assert.equal(dustState(healthyDust).ready, true);
  for (const property of Object.keys(healthyDust)) {
    const failed = dustState({ ...healthyDust, [property]: false });
    assert.equal(failed.ready, false, property);
    assert.notEqual(failed.key, 'ready');
    assert(failed.title && failed.tip);
  }
});

test('养护必须先停磨、清余尘、断电，后续检查可任意顺序', () => {
  for (const order of [['abrasive', 'checkFilter', 'cleanBody'], ['cleanBody', 'abrasive', 'checkFilter'], ['checkFilter', 'cleanBody', 'abrasive']]) {
    let state = initialMaintenance();
    for (const action of ['stop', 'extract', 'isolate', ...order, 'record']) {
      const result = maintenance(state, action);
      assert.equal(result.ok, true, action);
      state = result.state;
    }
    assert.equal(state.completed, true);
    assert.equal(state.running, false);
    assert.equal(state.isolated, true);
  }
});

test('错误养护顺序不可推进或完成，函数保持输入不变', () => {
  const initial = initialMaintenance();
  for (const action of ['extract', 'isolate', 'abrasive', 'checkFilter', 'cleanBody', 'record']) {
    const result = maintenance(initial, action);
    assert.equal(result.ok, false, action);
    assert.deepEqual(result.state, initial);
  }
  assert.deepEqual(initial, initialMaintenance());
  const stopped = step(initial, 'stop');
  assert.equal(maintenance(stopped, 'isolate').ok, false);
  const extracted = step(stopped, 'extract');
  assert.equal(maintenance(extracted, 'cleanBody').ok, false);
  const isolated = step(extracted, 'isolate');
  assert.equal(maintenance(isolated, 'record').ok, false);
  assert.equal(maintenance(isolated, 'extract').ok, false);
});

test('重复检查不累计虚假完成项，漏做一项不能提交记录', () => {
  let state = initialMaintenance();
  for (const action of ['stop', 'extract', 'isolate', 'abrasive', 'abrasive', 'checkFilter']) state = step(state, action);
  assert.equal(state.done.length, 2);
  assert.equal(maintenance(state, 'record').ok, false);
  assert.equal(maintenance(state, 'unknown').ok, false);
});

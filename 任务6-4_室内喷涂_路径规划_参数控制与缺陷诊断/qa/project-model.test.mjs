import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, advanceRun, summarizeRun, repairAt, repairAll, planReport } from '../src/project-model.mjs';

const good = { spacing: 200, distance: 300, speed: 300, guard: 'footprint', slow: true, compensate: true };

test('a new job has no completed coating and snapshots input parameters', () => {
  const p = { ...good, meta: { name: 'original' } }, run = createRun(p);
  p.spacing = 500; p.meta.name = 'changed';
  assert.equal(run.params.spacing, 200); assert.equal(run.params.meta.name, 'original');
  const s = summarizeRun(run);
  assert.equal(s.coverage, 0); assert.equal(s.pollution, 0); assert.equal(s.complete, false); assert.equal(s.ready, false);
  assert.equal(run.coat.cells.length, run.coat.cols * run.coat.rows);
  assert.equal(run.coat.cellSize, 40);
  assert.equal(s.missArea, 8);
  assert(s.issues.length <= 8);
});

test('canonical path sampling is identical for one advance or many small advances', () => {
  const a = createRun(good), b = createRun(good);
  advanceRun(a, 1);
  for (let i = 1; i <= 137; i++) advanceRun(b, i / 137);
  assert.deepEqual(b.coat, a.coat); assert.deepEqual(summarizeRun(b), summarizeRun(a));
  const before = structuredClone(b.coat);
  advanceRun(b, 1); assert.deepEqual(b.coat, before);
  assert.throws(() => advanceRun(b, 0.5), /rewound/);
});

test('partial progress deposits only reached wall cells; complete plans are separate', () => {
  const run = createRun(good), prediction = planReport(good);
  advanceRun(run, 0.03);
  const partial = summarizeRun(run);
  assert(partial.coverage > 0 && partial.coverage < prediction.coverage / 2);
  assert.equal(partial.complete, false); assert.equal(partial.ready, false);
  assert(run.coat.cells.filter(c => c.x > 1800 && !c.hole).every(c => !c.n));
});

test('full footprint protection avoids window pollution while center-only triggering does not', () => {
  const safe = createRun(good), center = createRun({ ...good, guard: 'center' });
  advanceRun(safe, 1); advanceRun(center, 1);
  assert.equal(summarizeRun(safe).pollution, 0);
  assert(summarizeRun(center).pollution > 0);
  assert(summarizeRun(safe).issues.some(i => i.type === 'edge'));
  assert.equal(summarizeRun(safe).ready, false);
});

test('large spacing leaves physical gaps and per-pass counts do not grow with repeated samples', () => {
  const run = createRun({ ...good, spacing: 500 }), normal = createRun(good);
  advanceRun(run, 1); advanceRun(normal, 1);
  assert(summarizeRun(run).coverage < summarizeRun(normal).coverage);
  assert(summarizeRun(run).issues.some(i => i.type === 'miss'));
  assert(run.coat.cells.every(c => c.n <= 2));
  assert.equal(planReport({ ...good, spacing: 500 }).gap, 100);
});

test('speed-dependent dose produces real issue cells and compensation removes that cause', () => {
  const bad = createRun({ ...good, compensate: false }), safe = createRun(good);
  advanceRun(bad, 1); advanceRun(safe, 1);
  assert(summarizeRun(bad).uniformity < 100);
  assert(summarizeRun(bad).issues.some(i => i.type === 'dose'));
  assert.equal(summarizeRun(safe).uniformity, 100);
  assert.deepEqual(planReport({ ...good, compensate: false }).doseRange, { min: 1, max: 2 });
  assert.deepEqual(planReport(good).doseRange, { min: 1, max: 1 });
});

test('local finishing touches only nearby existing issue cells and records the operation', () => {
  const run = createRun({ ...good, spacing: 500 });
  assert.equal(repairAt(run, 400, 400).changed, 0);
  advanceRun(run, 1);
  const issue = summarizeRun(run).issues.find(i => i.type === 'miss');
  const before = structuredClone(run.coat.cells), action = repairAt(run, issue.x, issue.z);
  assert(action.changed > 0); assert.equal(run.repairs.length, 1);
  run.coat.cells.forEach((cell, i) => {
    if (Math.hypot(cell.x - issue.x, cell.z - issue.z) > action.radius) assert.deepEqual(cell, before[i]);
  });
  assert(summarizeRun(run).issueCount > 0);
});

test('a passing average never hides an out-of-range individual spray pass', () => {
  const run = createRun({ ...good, speed: 420, compensate: false });
  advanceRun(run, 1);
  const cell = run.coat.cells.find(c => !c.hole && c.doseIssue && c.dose >= 0.85 && c.dose <= 1.2);
  assert(cell, 'overlapping passes should expose an average that hides a bad individual dose');
  assert(cell.n > 1);
  const action = repairAt(run, cell.x, cell.z);
  assert(action.recoated > 0);
  assert.equal(cell.doseIssue, false);
  assert.equal(cell.dose, 1);
});

test('area finishing repairs actual missing, polluted and abnormal cells before delivery becomes ready', () => {
  const run = createRun({ ...good, spacing: 500, guard: 'off', compensate: false });
  advanceRun(run, 1);
  const before = summarizeRun(run);
  assert(before.pollution > 0 && before.uniformity < 100 && before.coverage < 99.5);
  const result = repairAll(run), after = summarizeRun(run);
  assert(result.changed > 0 && result.actions.length > 0);
  assert.equal(after.coverage, 100); assert.equal(after.pollution, 0); assert.equal(after.uniformity, 100);
  assert.equal(after.ready, true); assert.equal(after.issueCount, 0);
  assert(run.coat.cells.every(c => c.hole ? c.n === 0 : c.n > 0));
  assert.equal(repairAll(run).changed, 0);
});

test('invalid inputs cannot create infinite paths or corrupt progress', () => {
  assert.throws(() => createRun({ spacing: 0 }), RangeError);
  assert.throws(() => createRun({ speed: NaN }), RangeError);
  assert.throws(() => advanceRun(createRun(good), NaN), TypeError);
});

const {test} = require('node:test'), assert = require('node:assert/strict'), M = require('../src/model.js');
const run = (s, ...evs) => evs.reduce((x, e) => M.reduce(x, e), s);
const findAll = s => run(s, ...M.ids.map(id => ({type: 'find', id})));

test('six hazards, nothing found at start, site running', () => {
  const s = M.initial();
  assert.equal(M.hazards.length, 6); assert(s.running); assert.equal(M.count(s, 'found'), 0); assert.equal(M.energyLeft(s), 3);
});
test('handling and isolation are blocked while the site runs', () => {
  let s = findAll(M.initial());
  s = M.reduce(s, {type: 'fix', id: 'opening'}); assert(s.error); assert.equal(s.code, 'running'); assert(!s.fixed.opening);
  s = M.reduce(s, {type: 'isolate', target: 'power'}); assert(s.error); assert.equal(s.power, 'on');
});
test('e-stop stops motion but leaves power, pressure and hanging load', () => {
  const s = M.reduce(M.initial(), {type: 'estop'});
  assert(!s.running); assert(s.latched); assert.equal(s.power, 'on'); assert(s.pressure); assert.equal(s.load, 'hung');
});
test('pressure is bled only after power is locked out', () => {
  let s = run(M.initial(), {type: 'estop'}, {type: 'isolate', target: 'pressure'});
  assert(s.error); assert(s.pressure);
  s = run(s, {type: 'isolate', target: 'power'}, {type: 'isolate', target: 'pressure'});
  assert(!s.error); assert(!s.pressure);
});
test('each fix needs its own energy isolated, and verify needs a fix', () => {
  let s = run(findAll(M.initial()), {type: 'estop'});
  for (const [id, code] of [['electric', 'energy'], ['belt', 'energy'], ['load', 'energy']]) { const x = M.reduce(s, {type: 'fix', id}); assert(x.error); assert.equal(x.code, code); }
  s = M.reduce(s, {type: 'verify', id: 'swing'}); assert(s.error); assert(!s.verified.swing);
});
test('unfound hazards cannot be handled', () => {
  const s = run(M.initial(), {type: 'estop'}, {type: 'fix', id: 'opening'});
  assert(s.error); assert.equal(s.code, 'notfound');
});
test('reset stays still; start needs reset and power back on', () => {
  let s = run(findAll(M.initial()), {type: 'estop'}, {type: 'reset'});
  assert(s.error); assert(s.latched);
  s = run(s, ...['power', 'pressure', 'load'].map(target => ({type: 'isolate', target})));
  for (const id of M.ids) s = run(s, {type: 'fix', id}, {type: 'verify', id});
  assert(M.allVerified(s));
  s = run(s, {type: 'reset'}); assert(!s.error); assert(s.armed); assert(!s.running);
  s = run(s, {type: 'start'}); assert(s.error); assert(!s.running);
  s = run(s, {type: 'unlock'}, {type: 'start'}); assert(!s.error); assert(s.running); assert(s.started);
});
test('restart-case restores the unresolved site without touching prior state', () => {
  const a = M.initial(), b = M.reduce(a, {type: 'find', id: 'swing'});
  assert(!a.found.swing); assert(b.found.swing);
  assert(!M.reduce(b, {type: 'restart-case'}).found.swing);
});

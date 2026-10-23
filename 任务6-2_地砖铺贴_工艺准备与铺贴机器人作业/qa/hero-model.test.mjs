import test from 'node:test';
import assert from 'node:assert/strict';
import {act, createState, readings, sceneData, step, SOURCE, TARGET} from '../src/game.model.mjs';

// These are classroom scenario checks, not construction acceptance limits.
const advance = (state, seconds, dt = 1 / 60) => {
 let s = state;
 for (let elapsed = 0; elapsed < seconds; elapsed += dt) s = step(s, dt);
 return s;
};
const finishMotion = s => {
 for (let i = 0; s.motion && i < 1000; i++) s = step(s, 1 / 60);
 assert.equal(s.motion, null, 'bounded classroom movement must terminate');
 return s;
};
const withoutMessage = s => {
 const result = structuredClone(s);
 delete result.message;
 delete result.kind;
 return result;
};
const readyGrip = (layout = 'single') => {
 let s = act(createState(), 'gripConfig', {layout});
 s = act(s, 'center');
 s = finishMotion(act(s, 'trial'));
 assert(s.grip.trial && readings(s).grip.ready);
 return s;
};
const readyPress = (config = {}) => {
 let s = act(createState(), 'stage', 'press');
 s = act(s, 'pressConfig', {mode:'force', ...config});
 return advance(act(s, 'pressRun'), 10);
};

test('continuous job visibly fails an eccentric pickup, recovers, transfers, aligns and lays one tile', () => {
 let s = createState();
 const input = s, baseline = structuredClone(s);
 s = act(s, 'trial');
 assert.deepEqual(input, baseline, 'actions must not mutate their input');
 s = advance(s, .8);
 assert(s.tile.y > SOURCE.y && s.tile.tilt > 0, 'a failed trial tilts just above its support');
 s = finishMotion(s);
 assert(!s.grip.trial && s.grip.observedFailure);
 assert.deepEqual(s.tile, SOURCE);
 s = act(s, 'center');
 s = finishMotion(act(s, 'trial'));
 s = act(s, 'transfer');
 s = advance(s, 1.6);
 assert(s.tile.y > TARGET.y && s.tile.x > SOURCE.x && s.tile.x < TARGET.x);
 s = finishMotion(s);
 assert.equal(s.stage, 'align');
 assert.equal(s.practice, false);
 assert(!readings(s).vision.valid);
 s = act(s, 'recognize');
 s = act(s, 'alignRun');
 s = advance(s, .4);
 s = act(s, 'visibility', 'blocked');
 s = act(s, 'slip');
 s = act(s, 'visibility', 'clear');
 s = act(s, 'recognize');
 s = advance(act(s, 'alignRun'), 5);
 assert(readings(s).vision.aligned);
 s = act(s, 'acceptAlign');
 assert(s.done.align);
 s = act(s, 'toPress');
 assert.equal(s.stage, 'press');
 assert.equal(s.motion.kind,'land');
 s = finishMotion(s);
 assert.equal(s.tile.y, .016);
 s = act(s, 'pressConfig', {mode:'force'});
 s = advance(act(s, 'pressRun'), 10);
 assert(readings(s).press.passed);
 assert(Math.abs(s.tile.y - .014) < .00001);
 assert(!act(s, 'finish').done.press, 'force settling cannot replace the ruler check');
 s = act(s, 'ruler');
 s = act(s, 'finish');
 assert(s.done.grip && s.done.align && s.done.press);
 assert.equal(s.attached, false);
 assert.equal(sceneData(s).completed, true);
});

test('one, two and four centered cups can all pass at equal total nominal area', () => {
 const states = ['single','dual','quad'].map(readyGrip);
 const grips = states.map(s => readings(s).grip);
 for (const g of grips) {
  assert(Math.abs(g.area - grips[0].area) < 1e-12);
  assert(Math.abs(g.holding - grips[0].holding) < 1e-8);
  assert(g.ready);
 }
});

test('every changed grip setting invalidates the previously observed trial', () => {
 const good = readyGrip('quad');
 const changes = [{layout:'dual'},{spread:.5},{offsetX:20},{offsetY:20},{vacuum:50},{mass:15},{surface:'textured'},{isolated:true},{failed:1}];
 for (const config of changes) {
  const changed = act(good, 'gripConfig', config);
  assert.equal(changed.grip.trial, false, JSON.stringify(config));
  assert.equal(changed.done.grip, false);
  assert.equal(act(changed, 'transfer').motion, null, 'a changed configuration must be retried');
 }
 const recentered = act(good, 'center');
 assert.equal(recentered.grip.trial, false);
});

test('an eccentric cup frame must keep every sealing lip inside the actual tile', () => {
 for (const offset of [{offsetX:110,offsetY:0},{offsetX:0,offsetY:110},{offsetX:0,offsetY:-110}]) {
  let s = act(createState(), 'gripConfig', {layout:'quad',spread:.6,...offset});
  assert.equal(readings(s).grip.fit, false, '180 mm cup spacing + 40 mm lip radius + 110 mm offset exceeds the 300 mm half tile');
  assert.equal(readings(s).grip.ready, false);
  s = act(s, 'center');
  assert.equal(readings(s).grip.fit, true);
  assert.equal(readings(s).grip.ready, true);
 }
});

test('a moving tile prevents parameter, stage and competing movement changes', () => {
 const moving = act(readyGrip(), 'transfer');
 const commands = [
  ['stage','press'], ['gripConfig',{layout:'quad'}], ['center'], ['trial'], ['transfer'],
  ['visibility','blocked'], ['recognize'], ['slip'], ['nudge',{x:4}],
  ['alignRun'], ['alignStep'], ['acceptAlign'], ['toPress'],
  ['pressConfig',{stiffness:160}], ['pressRun'], ['pressStep'], ['rebed'], ['ruler'], ['finish']
 ];
 for (const [type, value] of commands) {
  assert.deepEqual(withoutMessage(act(moving, type, value)), withoutMessage(moving), type);
 }
 const repeated = act(readyGrip(), 'trial');
 assert.equal(repeated.grip.trial, false, 'starting a repeat trial withdraws the previous certificate immediately');
 assert.deepEqual(withoutMessage(act(repeated, 'transfer')), withoutMessage(repeated));
});

test('occlusion freezes the last observation, independently applied slip changes reality, and clearing requires reacquisition', () => {
 let s = act(createState(), 'stage', 'align');
 s = act(s, 'recognize');
 s = advance(act(s, 'alignRun'), .2);
 const observed = structuredClone(s.align.last);
 const actual = {ex:s.align.ex,ey:s.align.ey,angle:s.align.angle};
 s = act(s, 'visibility', 'blocked');
 s = advance(s, 1);
 assert.equal(s.align.running, false);
 assert.deepEqual({ex:s.align.ex,ey:s.align.ey,angle:s.align.angle}, actual, 'occlusion itself must not move the tile');
 assert.deepEqual(s.align.last, observed);
 for (const key of ['ex','ey','angle']) assert.equal(readings(s).vision[key], null);
 s = act(s, 'slip');
 assert.notEqual(s.align.ex, actual.ex);
 assert.deepEqual(s.align.last, observed, 'the occluded camera must not secretly update its cache');
 assert.equal(readings(s).vision.ex, null);
 const slipped = structuredClone(s.tile);
 s = act(s, 'alignRun');
 s = act(s, 'alignStep');
 assert.deepEqual(s.tile, slipped);
 s = act(s, 'visibility', 'clear');
 assert(!readings(s).vision.valid);
 assert.equal(readings(s).vision.ex, null);
 assert.deepEqual(s.align.last, observed);
 s = act(s, 'recognize');
 assert(readings(s).vision.valid && s.align.reacquired);
 assert.equal(s.align.last.ex, s.align.ex);
 s = advance(act(s, 'alignRun'), 5);
 assert(readings(s).vision.aligned);
});

test('partial edge occlusion also withholds pose, and rotation must pass along with translation', () => {
 let s = act(createState(), 'stage', 'align');
 s = act(s, 'recognize');
 s = act(s, 'nudge', {x:-24,y:18});
 assert.equal(readings(s).vision.ex, 0);
 assert.equal(readings(s).vision.ey, 0);
 assert(!readings(s).vision.aligned, 'translation alone does not align the rotated tile');
 s = act(s, 'visibility', 'partial');
 assert(!readings(s).vision.valid);
 assert.equal(readings(s).vision.angle, null);
 assert.equal(act(s, 'recognize').align.needsRecognition, true);
});

test('force feedback and height are independent checks, including hard or raised mortar', () => {
 const ordinary = readyPress();
 const hard = readyPress({stiffness:160});
 const raised = readyPress({base:2});
 assert(readings(ordinary).press.passed);
 for (const state of [hard, raised]) {
  const p = readings(state).press;
  assert(p.forceOK && !p.heightOK && !p.passed);
  assert.equal(act(act(state, 'ruler'), 'finish').done.press, false);
 }
 assert(hard.press.compression < ordinary.press.compression);
 assert(sceneData(raised).tile.y > sceneData(ordinary).tile.y);
});

test('fixed compression on hard mortar latches overpressure, which only a completed physical rebed clears', () => {
 let s = act(createState(), 'stage', 'press');
 s = act(s, 'pressConfig', {mode:'position',stiffness:160,targetCompression:3});
 s = advance(act(s, 'pressRun'), 4);
 assert(s.press.damaged && !s.press.running);
 const peak = s.press.peakForce;
 s = act(s, 'pressConfig', {mode:'force',targetForce:160,stiffness:80});
 assert(s.press.damaged && s.press.peakForce >= peak);
 assert.equal(act(s, 'pressRun').press.running, false);
 assert.equal(act(s, 'pressStep').press.compression, s.press.compression);
 s = act(s, 'stage', 'align');
 s = act(s, 'stage', 'press');
 assert(s.press.damaged, 'stage navigation cannot erase the overpressure history');
 s = act(s, 'rebed');
 s = advance(s, .5);
 assert(s.motion && s.tile.y > .02, 'the tile must actually be raised during preparation');
 assert(s.press.damaged, 'damage remains latched until preparation finishes');
 s = finishMotion(s);
 assert(!s.press.damaged);
 assert.equal(s.press.peakForce, 0);
 assert.equal(s.press.compression, 0);
 assert.equal(s.press.base, 0);
 assert.equal(s.tile.y, .016);
 s = advance(act(s, 'pressRun'), 10);
 assert(readings(s).press.passed);
});

test('changing pressure parameters invalidates both the ruler result and the settled hold', () => {
 const s = act(readyPress(), 'ruler');
 assert(s.press.checked && readings(s).press.stable);
 const changed = act(s, 'pressConfig', {targetForce:170});
 assert(!changed.press.checked && !changed.press.showRuler && !changed.done.press);
 assert.equal(changed.press.settledTime, 0);
 assert.equal(act(changed, 'finish').done.press, false);
});

test('release unloads the measured force while preserving compaction history and the finished tile height', () => {
 const prepared = act(readyPress(), 'ruler');
 const before = readings(prepared).press;
 const brick = structuredClone(prepared.tile);
 let s = act(prepared, 'finish');
 assert.equal(s.motion.kind, 'release');
 assert.equal(s.attached, false);
 assert.equal(sceneData(s).toolLift, 0);
 assert.equal(readings(s).sensorForce, before.force);
 s = advance(s, .5);
 const during = readings(s);
 assert(during.sensorForce > 0 && during.sensorForce < before.force);
 assert(sceneData(s).toolLift > 0 && sceneData(s).toolLift < .18);
 assert.equal(sceneData(s).force, during.sensorForce, 'the visible sensor uses the live unloading force');
 assert.deepEqual(s.tile, brick, 'only the tool rises during release');
 s = finishMotion(s);
 assert.equal(readings(s).sensorForce, 0);
 assert.equal(sceneData(s).force, 0);
 assert.equal(sceneData(s).toolLift, .18);
 assert.deepEqual(s.tile, brick);
 assert.equal(s.press.compression, before.compression);
 assert.equal(s.press.peakForce, before.peakForce);
 assert.equal(readings(s).press.force, before.force, 'the completed compaction result is retained separately');
 assert(s.done.press && readings(s).press.passed);
});

test('rebed after release approaches the stationary tile before lifting it and cannot report a contact load in the air', () => {
 let s = finishMotion(act(act(readyPress(), 'ruler'), 'finish'));
 const top = s.tile.y;
 s = act(s, 'rebed');
 assert(s.motion.fromDetached);
 assert.equal(sceneData(s).toolLift, .18);
 assert.equal(s.tile.y, top);
 assert.equal(readings(s).sensorForce, 0, 'a raised head cannot be pressing the tile');
 s = advance(s, .2);
 assert.equal(s.tile.y, top, 'the tile waits while the head approaches');
 assert(sceneData(s).toolLift > 0 && sceneData(s).toolLift < .18);
 assert.equal(readings(s).sensorForce, 0);
 s = advance(s, .6);
 assert.equal(sceneData(s).toolLift, 0);
 assert(s.tile.y > top, 'after reacquiring the tile, the tool and tile lift together');
 s = finishMotion(s);
 assert(s.attached && !s.done.press);
 assert.equal(s.press.compression, 0);
 assert.equal(s.press.peakForce, 0);
 assert.equal(s.tile.y, .016);
});

test('the shallow initial position command demonstrates insufficient compaction instead of passing untouched', () => {
 let s = act(createState(), 'stage', 'press');
 assert.equal(s.press.mode, 'position');
 s = advance(act(s, 'pressRun'), 10);
 const p = readings(s).press;
 assert(p.force < 120 && !p.forceOK);
 assert(p.error > .5 && !p.heightOK);
 assert(!p.passed && !p.damaged);
 s = act(s, 'ruler');
 s = act(s, 'finish');
 assert.equal(s.done.press, false);
 assert.equal(s.motion, null);
 assert.equal(s.attached, true);
});

test('cups crossing the edge lose seal area and drag down a shared vacuum circuit', () => {
 const centered = readyGrip('quad');
 const normal = readings(centered).grip;
 const shifted = act(centered, 'gripConfig', {offsetY:110});
 const leaking = readings(shifted).grip;
 assert.equal(leaking.positions.filter(p => p.active).length, 2);
 assert(leaking.activeArea < normal.activeArea);
 assert(leaking.pressure < normal.pressure);
 assert(leaking.holding < normal.holding);
 assert(!leaking.fit && !leaking.ready && !shifted.grip.trial);
 const isolated = readings(act(shifted, 'gripConfig', {isolated:true})).grip;
 assert.equal(isolated.pressure, normal.pressure, 'isolation retains vacuum in the cups that still seal');
 assert.equal(isolated.activeArea, leaking.activeArea);
 assert(!isolated.ready, 'preserved vacuum does not repair the out-of-bounds layout');
 const outside = readings(act(createState(), 'gripConfig', {layout:'single',offsetY:250})).grip;
 assert.equal(outside.activeArea, 0);
 assert.equal(outside.pressure, 0);
 assert.equal(outside.holding, 0);
 assert(!outside.ready);
});

test('a detached tool cannot resume pressing, change force parameters, or replay its release without a new preparation', () => {
 const done = finishMotion(act(act(readyPress(), 'ruler'), 'finish'));
 for (const [type,value] of [['pressRun'],['pressStep'],['pressConfig',{targetForce:300}],['finish']]) {
  assert.deepEqual(withoutMessage(act(done, type, value)), withoutMessage(done), type);
 }
 const revisited = act(act(done, 'stage', 'align'), 'stage', 'press');
 assert.equal(revisited.attached, false);
 assert.equal(readings(revisited).sensorForce, 0);
 assert.equal(act(revisited, 'pressRun').press.running, false);
});

test('commands from another stage cannot alter a retained successful scenario', () => {
 // Retained readings are legitimate when moving between independent practice stations.
 // A stale button or keyboard event must not act on that hidden station.
 let seed = readyPress();
 seed = act(seed, 'ruler');
 seed.grip = {...readyGrip().grip};
 seed.done = {grip:true,align:true,press:false};
 seed.align = {...seed.align,ex:.1,ey:.1,angle:.1,visibility:'clear',needsRecognition:false,blockedSeen:true,reacquired:true};
 const allowed = {
  center:['grip'], transfer:['grip'], alignRun:['align'], alignStep:['align'],
  acceptAlign:['align'], toPress:['align'], finish:['press']
 };
 for (const [type, stages] of Object.entries(allowed)) {
  for (const stage of ['grip','align','press'].filter(stage => !stages.includes(stage))) {
   const s = {...structuredClone(seed),stage};
   assert.deepEqual(withoutMessage(act(s, type)), withoutMessage(s), `${type} cannot act in ${stage}`);
  }
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MISSIONS, createState, selectMission, selectRobot, access, advance, setStage,
  photoQuality, addPhoto, saveRecord, followup, summary
} from '../src/inspection-model.mjs';

const good = mode => ({ centered: true, visible: true, exposure: .7, incidence: 12, coverage: mode === 'wide' ? .06 : .2 });
function arrive(s) {
  const e = s.entries[s.mission];
  if (s.mission === 'wall') { e.magnet = true; e.tether = true; }
  e.moving = true; advance(s, 20); assert.equal(e.arrived, true);
}
function photo(s, mode = 'detail', metrics = good(mode), condition = 'original') {
  s.camera.mode = mode;
  return addPhoto(s, { mode, metrics, condition, image: `data:image/png;base64,${s.serial + 1}` }).photo;
}
const revisitPhoto = s => photo(s, 'detail', good('detail'), s.mission === 'road' ? 'after-maintenance' : 'original');
function record(s) {
  photo(s, 'wide'); photo(s, 'detail');
  const m = MISSIONS.find(m => m.id === s.mission);
  const r = saveRecord(s, m.observation, m.disposition);
  assert.equal(r.ok, true); return r.record;
}

test('wrong platform moves only to its visible obstacle and cannot produce a valid photo', () => {
  const s = createState(); selectMission(s, 'stairs'); selectRobot(s, 'wheel');
  const e = s.entries.stairs; e.moving = true;
  assert.equal(advance(s, 1).progress, 1 / 12);
  const stop = advance(s, 20);
  assert.equal(stop.ok, false); assert.equal(e.progress, .15);
  assert.equal(e.moving, false); assert.equal(e.arrived, false); assert.match(e.blocked, /台阶/);
  assert.equal(photo(s).valid, false);
  selectRobot(s, 'dog'); assert.equal(e.progress, 0); arrive(s);
  assert.equal(photo(s).valid, true);
});

test('wheel and dog can inspect the road; the crawler cannot substitute for them', () => {
  const s = createState();
  assert.equal(access(s).ok, true);
  selectRobot(s, 'dog'); assert.equal(access(s).ok, true);
  selectRobot(s, 'crawler'); assert.equal(access(s).ok, false);
  selectMission(s, 'wall'); assert.equal(s.robot, 'crawler');
  selectRobot(s, 'dog'); assert.equal(access(s).code, 'platform');
});

test('wall travel requires both magnetic attachment check and independent tether', () => {
  const s = createState(); selectMission(s, 'wall'); const e = s.entries.wall;
  e.moving = true; assert.equal(advance(s, 5).code, 'magnet'); assert.equal(e.progress, 0);
  e.magnet = true; e.moving = true;
  assert.equal(advance(s, 5).code, 'tether'); assert.equal(e.progress, 0);
  e.tether = true; e.moving = true; advance(s, 4);
  assert.equal(e.progress, .5); assert.equal(e.arrived, false);
  advance(s, 4); assert.equal(e.progress, 1); assert.equal(e.arrived, true);
});

test('arrival is time-based and paused entries do not advance', () => {
  const s = createState(), e = s.entries.road;
  assert.equal(advance(s, 8).updated, false);
  e.moving = true; advance(s, 3); assert.equal(e.progress, .375);
  selectMission(s, 'stairs'); assert.equal(e.moving, false);
  selectMission(s, 'road'); assert.equal(e.progress, .375);
  e.moving = true; advance(s, 5); assert.equal(e.arrived, true);
  assert.equal(advance(s, NaN).ok, false); assert.equal(advance(s, -1).ok, false);
});

test('capture checks actual visibility, aim, light, incidence, coverage and stillness', () => {
  const s = createState(); arrive(s); s.camera.mode = 'detail';
  assert.equal(photoQuality(s, good('detail')).valid, true);
  for (const patch of [{centered:false},{visible:false},{exposure:.44},{incidence:71},{coverage:.129},{incidence:NaN}]) {
    assert.equal(photoQuality(s, {...good('detail'),...patch}).valid, false, JSON.stringify(patch));
  }
  assert.equal(photoQuality(s, {...good('detail'),exposure:.45,incidence:70,coverage:.13}).valid, true);
  assert.equal(photoQuality(s, {...good('wide'),mode:'wide',coverage:.025}).valid, true);
  s.entries.road.moving = true; assert.equal(photoQuality(s, good('detail')).valid, false);
});

test('a later camera improvement never repairs an old photograph', () => {
  const s = createState(); arrive(s);
  const metrics = {...good('detail'),exposure:.1};
  s.camera.mode = 'detail';
  const bad = addPhoto(s, {mode:'detail',metrics,image:'data:image/png;base64,old'}).photo;
  metrics.exposure = 1; s.camera.lamp = true;
  assert.equal(bad.metrics.exposure, .1); assert.equal(bad.camera.lamp, false); assert.equal(bad.valid, false);
  assert.equal(Object.isFrozen(bad.metrics), true);
  assert.equal(photo(s).valid, true); assert.equal(bad.valid, false);
});

test('missing actual image stays invalid even if camera metrics are good', () => {
  const s = createState(); arrive(s);
  const r = addPhoto(s, {mode:'wide',metrics:good('wide')});
  assert.equal(r.ok, true); assert.equal(r.valid, false); assert.match(r.reason, /实际拍摄/);
});

test('a record needs current-point wide and detail evidence and bounded conclusions', () => {
  const s = createState(); arrive(s); const m = MISSIONS[0];
  assert.equal(saveRecord(s,m.observation,m.disposition).ok,false);
  photo(s,'detail'); assert.equal(saveRecord(s,m.observation,m.disposition).ok,false);
  photo(s,'wide'); assert.equal(saveRecord(s,'桥梁结构安全',m.disposition).ok,false);
  assert.equal(saveRecord(s,m.observation,'无需处理').ok,false);
  assert.equal(saveRecord(s,m.observation,m.disposition).ok,true);
  selectMission(s,'stairs'); arrive(s);
  assert.equal(saveRecord(s,MISSIONS[1].observation,MISSIONS[1].disposition).ok,false);
});

test('record IDs bind the chosen evidence even after more photos and a robot change', () => {
  const s = createState(); arrive(s); const r = record(s), ids = [...r.photos];
  photo(s,'detail'); selectRobot(s,'dog');
  assert.equal(s.entries.road.arrived,false); assert.deepEqual(s.entries.road.record.photos,ids);
  assert.equal(s.entries.road.record,r); assert.equal(s.entries.road.photos.length,3);
  assert.equal(Object.isFrozen(r.photoIDs),true);
});

test('followup rejects old, wrong-point, poor, and overview-only images', () => {
  const s = createState(); arrive(s); const original=photo(s);
  assert.equal(followup(s,original).ok,false);
  record(s); assert.equal(followup(s,original).ok,false);
  const bad = photo(s,'detail',{...good('detail'),visible:false}); assert.equal(followup(s,bad).ok,false);
  const wide = photo(s,'wide'); assert.equal(followup(s,wide).ok,false);
  assert.equal(followup(s,{...photo(s),mission:'wall'}).ok,false);
});

test('road closure requires the condition captured by the renderer, not a later UI flag', () => {
  const s = createState(); arrive(s); record(s);
  const before = photo(s);
  assert.equal(followup(s, before).ok, false);
  s.serviceMode = true;
  s.entries.road.condition = 'after-maintenance';
  assert.equal(followup(s, before).ok, false);
  // Replacing properties on the input object cannot rewrite an archived snapshot.
  assert.equal(followup(s, {...before,condition:'after-maintenance'}).ok, false);
  const unverified = addPhoto(s, {mode:'detail',metrics:good('detail'),image:'data:image/png;base64,missing-condition'}).photo;
  assert.equal(unverified.condition, 'unverified');
  assert.equal(followup(s, unverified).ok, false);
  const after = revisitPhoto(s);
  assert.equal(followup(s, after).ok, true);
  assert.equal(s.entries.road.follow.status, 'resolved');
});

test('a captured condition is independent of the mutable render request', () => {
  const s = createState(); arrive(s); record(s);
  const request = {mode:'detail',metrics:good('detail'),condition:'after-maintenance',image:'data:image/png;base64,renderer-frame'};
  const after = addPhoto(s, request).photo;
  request.condition = 'original';
  assert.equal(after.condition, 'after-maintenance');
  assert.equal(Object.isFrozen(after), true);
  assert.equal(followup(s, after).ok, true);
});

test('followup resolves road while retaining the two different unresolved dispositions', () => {
  const s = createState();
  for (const m of MISSIONS) {
    selectMission(s,m.id); arrive(s); const r=record(s); const revisit=revisitPhoto(s);
    const f=followup(s,revisit);
    assert.equal(f.ok,true); assert.equal(f.follow.originalPhotoID,r.photoIDs.detail);
    assert.equal(f.follow.photoID,revisit.id); assert.equal(f.follow.status,m.followStatus);
  }
  assert.deepEqual({...summary(s),items:undefined},{total:3,completed:3,recorded:3,pending:2,resolved:1,awaitingFollowup:0,allComplete:true,items:undefined});
});

test('revising a record requires a fresh followup and switching missions resets only camera', () => {
  const s=createState(); arrive(s); record(s); followup(s,revisitPhoto(s));
  assert.equal(summary(s).completed,1);
  const m=MISSIONS[0]; saveRecord(s,m.observation,m.disposition);
  assert.equal(s.entries.road.follow,null); assert.equal(summary(s).completed,0);
  s.camera.zoom=3; selectMission(s,'stairs'); selectMission(s,'road');
  assert.equal(s.camera.zoom,1); assert.equal(s.entries.road.arrived,true); assert.equal(s.stage,'capture');
  assert.equal(setStage(s,'record').ok,true); assert.equal(s.stage,'record');
});

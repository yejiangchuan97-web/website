/* 课程首页：数据与清单一致、每章展品齐全且动作可见、旧章节封面地址跳转到首页 #chapter-N。 */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const catalog = JSON.parse(read('course/catalog.json')).tasks;

function load() {
  const ctx = {console, Math, Object, Array, Set, Map, WeakMap, Number, String, JSON, Error, Symbol, Promise, ArrayBuffer, DataView,
    Float32Array, Float64Array, Int8Array, Int16Array, Int32Array, Uint8Array, Uint8ClampedArray, Uint16Array, Uint32Array};
  ctx.window = ctx.self = ctx.globalThis = ctx; vm.createContext(ctx);
  for (const file of ['course/home/data.js', 'shared/vendor/three-r160.min.js', 'shared/workshop/machines.js', 'shared/workshop/machine-models.js', 'shared/workshop/six-axis.js', 'shared/chapter-cover/safety-maintenance-models.js', 'shared/chapter-cover/cover-models.js', 'course/home/exhibits.js'])
    vm.runInContext(read(file), ctx, {filename: file});
  return ctx;
}

test('home data follows the catalog: 8 chapters, every active task once, task pages exist', () => {
  const COURSE = JSON.parse(JSON.stringify(load().COURSE));
  assert.equal(COURSE.chapters.length, 8);
  const ids = COURSE.chapters.flatMap(c => c.tasks.map(t => t.id));
  assert.deepEqual(ids, catalog.map(t => t.id));
  for (const c of COURSE.chapters) {
    assert.equal(c.entry, `course/home/index.html#chapter-${c.id}`);
    for (const t of c.tasks) { assert(fs.existsSync(path.join(root, t.demo)), t.demo); assert(t.note && t.note.length <= 18, 'note ' + t.id); }
  }
  const html = read('course/home/index.html');
  for (const [, src] of html.matchAll(/(?:src|href)="([^"#?]+)(?:\?[^"]*)?"/g)) if (!/^(https?:|index\.html$)/.test(src)) assert(fs.existsSync(path.join(root, 'course/home', src)), src);
});

test('each chapter has one exhibit per task, a hero among them, and the hero motion is visible', () => {
  const ctx = load(), {HomeExhibits, COURSE, THREE: T} = ctx;
  for (const c of COURSE.chapters) {
    const spec = HomeExhibits.chapters[c.id];
    assert.deepEqual([...Object.keys(spec.tasks)].sort(), [...c.tasks.map(t => t.id)].sort(), 'chapter ' + c.id);
    assert(spec.tasks[spec.hero], 'hero of chapter ' + c.id);
    for (const t of c.tasks) {
      const item = HomeExhibits.build(c.id, t.id);
      const snapshot = () => { item.root.updateMatrixWorld(true); const out = []; item.root.traverse(o => { if (o.isMesh) out.push(...o.matrixWorld.elements); }); return out; };
      item.step(0); const a = snapshot(); item.step(2.3); const b = snapshot();
      assert(a.length && b.every(Number.isFinite), `finite pose ${t.id}`);
      const size = new T.Box3().setFromObject(item.root).getSize(new T.Vector3());
      assert(size.x > 1 && size.x < 8 && size.y > .5 && size.y < 7, `normalized size ${t.id} ${size.toArray()}`);
      if (t.id === spec.hero) assert(a.some((v, i) => Math.abs(v - b[i]) > 1e-3), `hero ${t.id} moves`);
    }
  }
});

test('old chapter cover URLs redirect into the home page chapter state', () => {
  for (let n = 1; n <= 8; n++) {
    const html = read(`course/chapters/0${n}/overview/index.html`);
    assert.match(html, new RegExp(`location\\.replace\\("\\.\\./\\.\\./\\.\\./home/index\\.html#chapter-${n}"\\)`));
    assert.match(html, new RegExp(`http-equiv="refresh" content="0;url=\\.\\./\\.\\./\\.\\./home/index\\.html#chapter-${n}"`));
  }
});

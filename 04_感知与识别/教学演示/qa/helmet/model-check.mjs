import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { CLASS_NAMES, clampBox, iou, normalizeBox, makePredictions, matchPredictions, annotationIssues, zipStore } from '../../src/helmet/model.mjs';
let assertions = 0, groups = 0;
function check(actual, expected, message) { assertions++; assert.deepEqual(actual, expected, message); }
function throws(fn, message) { assertions++; assert.throws(fn, undefined, message); }
function near(actual, expected, message) { assertions++; assert.ok(Math.abs(actual - expected) < 1e-12, message); }
function group(name, fn) { fn(); groups++; console.log(`PASS ${name}`); }
const truths = [
  { id: 'H01', cls: 0, bbox: [160, 80, 320, 240] },
  { id: 'H02', cls: 1, bbox: [54.971, 244.952, 110.709, 309.201] },
  { id: 'H03', cls: 0, bbox: [414, 220, 487.6, 293.6] },
  { id: 'H04', cls: 1, bbox: [524.687, 334.812, 577.77, 396] },
  { id: 'H05', cls: 0, bbox: [352, 365, 411.2, 424.2] }
];
group('类别、归一化与原图尺寸', () => {
  check(CLASS_NAMES[0], '戴安全帽'); check(CLASS_NAMES.review, '待复核');
  check(normalizeBox(truths[0], 640, 640), '0 0.375000 0.250000 0.250000 0.250000');
  check(normalizeBox(truths[0], 960, 640), '0 0.250000 0.250000 0.166667 0.250000');
  check(normalizeBox({ ...truths[0], cls: 'review' }, 640, 640), null);
  for (const bbox of [[0, 0, 0, 10], [10, 0, 0, 10], [-1, 0, 10, 10], [0, 0, 641, 640], [0, '', 10, 10], [0, null, 10, 10], [0, NaN, 10, 10], [0, Infinity, 10, 10], [0, 0, 10]]) throws(() => normalizeBox({ cls: 0, bbox }, 640, 640));
  for (const dimension of [0, -1, '', null, NaN, Infinity]) throws(() => normalizeBox(truths[0], dimension, 640));
  for (const cls of [2, undefined, '0']) throws(() => normalizeBox({ ...truths[0], cls }, 640, 640));
});
group('坐标夹取与 IoU 边界', () => {
  check(clampBox([700, 650, -10, -20], 640, 640), [0, 0, 640, 640]);
  check(clampBox([32, 40, 12, 20], 640, 640), [12, 20, 32, 40]);
  near(iou([0, 0, 10, 10], [0, 0, 10, 10]), 1);
  near(iou([0, 0, 10, 10], [5, 0, 15, 10]), 1 / 3);
  check(iou([0, 0, 0, 10], [0, 0, 10, 10]), 0);
  check(iou([0, 0, 10, 10], [10, 0, 20, 10]), 0);
  throws(() => clampBox([0, '', 10, 20], 640, 640));
  throws(() => iou([0, 0, null, 10], [0, 0, 10, 10]));
});
group('固定预测在不同阈值下的完整计数', () => {
  const predictions = makePredictions(truths), snapshot = JSON.stringify({ truths, predictions });
  check(predictions.map(prediction => prediction.id), ['P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'P07']);
  check(predictions[3].cls, 0);
  const a = matchPredictions(truths, predictions, .25);
  check([a.tp, a.fp, a.fn], [4, 3, 1]); near(a.precision, 4 / 7); near(a.recall, .8);
  check(a.predictions.map(prediction => prediction.id), ['P01', 'P03', 'P05', 'P02', 'P04', 'P07', 'P06']);
  check(a.predictions.filter(prediction => prediction.status === 'fp').map(prediction => prediction.reason), ['类别错误', '重复检测', '背景误检']);
  check(a.missed.map(truth => truth.id), ['H04']);
  const b = matchPredictions(truths, predictions, .5);
  check([b.tp, b.fp, b.fn], [3, 0, 2]); near(b.precision, 1); near(b.recall, .6);
  const c = matchPredictions(truths, predictions, .42); check([c.tp, c.fp, c.fn], [4, 0, 1]);
  const d = matchPredictions(truths, predictions, .92); check([d.tp, d.fp, d.fn], [0, 0, 5]); check(d.precision, null); check(d.recall, 0);
  const stricter = matchPredictions(truths, predictions, .25, .8); check([stricter.tp, stricter.fp, stricter.fn], [3, 4, 2]);
  const offset = a.predictions.find(prediction => prediction.id === 'P02'); assertions++; assert.ok(offset.matchedIoU > .7 && offset.matchedIoU < .8, '轻微偏移框应在 .5 配对、在 .8 被拒绝');
  check(JSON.stringify({ truths, predictions }), snapshot, '匹配不能改写原始数组');
});
group('同类优先、一对一和未匹配目标优先', () => {
  const gt = [{ id: 'A', cls: 0, bbox: [0, 0, 10, 10] }, { id: 'B', cls: 0, bbox: [2, 0, 12, 10] }, { id: 'C', cls: 1, bbox: [0, 0, 10, 10] }];
  const predictions = [{ id: '1', cls: 0, bbox: [0, 0, 10, 10], score: .9 }, { id: '2', cls: 0, bbox: [0, 0, 10, 10], score: .8 }, { id: '3', cls: 1, bbox: [0, 0, 10, 10], score: .7 }];
  const result = matchPredictions(gt, predictions);
  check(result.predictions.map(prediction => prediction.matchedId), ['A', 'B', 'C']);
  near(result.predictions[1].matchedIoU, 2 / 3); near(result.predictions[1].bestIoU, 1);
  check([result.tp, result.fp, result.fn], [3, 0, 0]);
  const double = matchPredictions(gt.slice(0, 1), predictions.slice(0, 2)); check([double.tp, double.fp, double.fn], [1, 1, 0]);
  check(double.predictions[1].reason, '重复检测');
  const equal = matchPredictions(gt.slice(0, 1), [{ id: 'boundary', cls: 0, bbox: [0, 0, 5, 10], score: .25 }], .25, .5);
  check(equal.tp, 1, '阈值边界包含等于');
});
group('空集合、待复核与非法预测', () => {
  const empty = matchPredictions([], []); check([empty.tp, empty.fp, empty.fn, empty.precision, empty.recall], [0, 0, 0, null, null]);
  const noGT = matchPredictions([], [{ id: 'x', cls: 0, bbox: [0, 0, 1, 1] }]); check([noGT.tp, noGT.fp, noGT.fn, noGT.precision, noGT.recall], [0, 1, 0, 0, null]);
  const review = matchPredictions([...truths, { id: 'R', cls: 'review', bbox: [1, 1, 2, 2] }], makePredictions(truths)); check([review.tp, review.fp, review.fn], [4, 3, 1]);
  for (const score of [-1, 1.1, NaN, '', null]) throws(() => matchPredictions([], [{ id: 'x', cls: 0, bbox: [0, 0, 1, 1], score }]));
  for (const threshold of [-.01, 1.01, '', null]) throws(() => matchPredictions([], [], threshold));
  throws(() => matchPredictions([], [], .25, 0));
});
group('标注复核、漏标、错类、重复与整图未决状态', () => {
  check(annotationIssues(truths, truths), []);
  check(annotationIssues([], null), [], '自选图的完整性须由页面单独人工确认');
  check(annotationIssues([], truths).length, 5);
  check(annotationIssues([{ ...truths[0], cls: 1 }], truths).some(issue => issue.includes('类别错误')), true);
  check(annotationIssues([...truths, { ...truths[0], id: 'copy' }], truths).some(issue => issue.includes('重复')), true);
  check(annotationIssues(truths, [...truths, { id: 'R', cls: 'review', bbox: [1, 1, 2, 2] }]).some(issue => issue.includes('整图待复核')), true);
  check(annotationIssues([{ id: 'R', cls: 'review', bbox: [1, 1, 2, 2] }]).some(issue => issue.includes('整张图')), true);
  check(annotationIssues([{ id: 'bad', cls: 0, bbox: [0, '', 1, 1] }]).some(issue => issue.includes('无效')), true);
});
group('ZIP 独立 Python 解析、UTF-8、CRC 与空文件', () => {
  const pngLike = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 255, 128]);
  const zip = zipStore([{ name: 'images/教学原图.png', data: pngLike }, { name: 'labels/教学原图.txt', data: `${normalizeBox(truths[0], 640, 640)}\n` }, { name: '空文件.txt', data: '' }]);
  const script = "import sys,io,zipfile,base64,json,zlib\nb=base64.b64decode(sys.stdin.buffer.read())\nz=zipfile.ZipFile(io.BytesIO(b))\nassert z.testzip() is None\nassert all(i.flag_bits & 0x800 and i.compress_type == 0 for i in z.infolist())\nassert all(zlib.crc32(z.read(i.filename)) & 0xffffffff == i.CRC for i in z.infolist())\nassert z.read('images/教学原图.png') == bytes([137,80,78,71,13,10,26,10,0,255,128])\nassert z.read('labels/教学原图.txt').decode('utf-8') == '0 0.375000 0.250000 0.250000 0.250000\\n'\nassert z.read('空文件.txt') == b''\nprint(json.dumps(z.namelist(),ensure_ascii=False))";
  const bundledPython = join(homedir(), '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'python', 'python.exe');
  const parsed = spawnSync(process.env.HELMET_PYTHON || (existsSync(bundledPython) ? bundledPython : 'python'), ['-c', script], { input: Buffer.from(zip).toString('base64'), encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
  check(parsed.status, 0, parsed.stderr); check(JSON.parse(parsed.stdout), ['images/教学原图.png', 'labels/教学原图.txt', '空文件.txt']);
  check(zipStore([]).length, 22);
  for (const name of ['../escape.txt', '/absolute.txt', 'C:\\absolute.txt', 'a\0b', '']) throws(() => zipStore([{ name, data: '' }]));
  throws(() => zipStore([{ name: 'same', data: '' }, { name: 'same', data: '' }]));
  throws(() => zipStore([{ name: 'bad', data: null }]));
});
group('1000 组确定性随机几何守恒', () => {
  let seed = 20261016;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  for (let index = 0; index < 1000; index++) {
    const x = random() * 500, y = random() * 500, width = 1 + random() * 100, height = 1 + random() * 100;
    const box = [x, y, x + width, y + height];
    near(iou(box, box), 1);
    const other = [x + 10, y + 10, x + width + 10, y + height + 10]; near(iou(box, other), iou(other, box));
    const row = normalizeBox({ cls: index % 2, bbox: box }, 640, 640).split(' ').map(Number);
    assertions++; assert.ok(row.slice(1).every(value => value >= 0 && value <= 1));
    near(row[3], Number((width / 640).toFixed(6))); near(row[4], Number((height / 640).toFixed(6)));
  }
});
console.log(JSON.stringify({ status: 'passed', groups, assertions }));

import * as M from './model.mjs';

// Classroom targets, not engineering acceptance limits or a film-thickness model.
export const TARGET = Object.freeze({ coverage: 99.5, minDose: 0.85, maxDose: 1.2 });
export const CELL_SIZE = 40;
const PATH_STEP = 20;
const REPAIR_RADIUS = 180;
const EPS = 1e-7;

function parameters(input = {}) {
  const p = { ...M.DEFAULTS, ...input };
  for (const key of ['spacing', 'distance', 'speed']) {
    if (!Number.isFinite(p[key]) || p[key] <= 0) throw new RangeError(`${key} must be positive`);
  }
  // Keep accidental API calls from building unbounded paths.
  if (p.spacing < 20) throw new RangeError('spacing must be at least 20 mm');
  if (!['footprint', 'center', 'off'].includes(p.guard)) throw new RangeError('Unknown opening protection');
  return JSON.parse(JSON.stringify(p));
}

function eventsFor(p) {
  const segments = M.pathSegments(p);
  const events = [];
  let travelled = 0;
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    if (!s.travel) {
      // Canonical samples are independent of the animation's frame rate and batching.
      for (let d = 0; d <= s.length + EPS; d += PATH_STEP) {
        const t = Math.min(1, d / s.length);
        const x = s.x0 + (s.x1 - s.x0) * t;
        const z = s.z0 + (s.z1 - s.z0) * t;
        events.push({ distance: travelled + d, pass: i / 2, x, z,
          on: M.sprayAllowed(x, z, p), dose: M.depositionAt((z - 40) / 2320, p).dose });
      }
    }
    travelled += s.length;
  }
  return { events, total: travelled };
}

export function createRun(params = {}) {
  const p = parameters(params);
  const cols = Math.ceil(M.WALL.w / CELL_SIZE), rows = Math.ceil(M.WALL.h / CELL_SIZE);
  const cells = [];
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const x = (col + 0.5) * CELL_SIZE, z = (row + 0.5) * CELL_SIZE;
    cells.push({ x, z, n: 0, dose: 0, doseIssue: false, hole: M.inHole(x, z), repaired: false });
  }
  const { events, total } = eventsFor(p);
  const run = { params: p, progress: 0, coat: { cols, rows, cellSize: CELL_SIZE, cells }, repairs: [] };
  Object.defineProperties(run, {
    _events: { value: events }, _total: { value: total }, _cursor: { value: 0, writable: true },
    _visits: { value: cells.map(() => new Map()) },
    _doseIssues: { value: new Uint8Array(cells.length) },
  });
  return run;
}

function deposit(run, event) {
  if (!event.on) return;
  const { cols, rows, cellSize, cells } = run.coat;
  const halfWidth = M.fanWidth(run.params.distance) / 2;
  const c0 = Math.max(0, Math.ceil((event.x - halfWidth) / cellSize - 0.5));
  const c1 = Math.min(cols - 1, Math.floor((event.x + halfWidth) / cellSize - 0.5));
  const r0 = Math.max(0, Math.ceil((event.z - 40) / cellSize - 0.5));
  const r1 = Math.min(rows - 1, Math.floor((event.z + 40) / cellSize - 0.5));
  for (let row = r0; row <= r1; row++) for (let col = c0; col <= c1; col++) {
    const index = row * cols + col, cell = cells[index], visits = run._visits[index];
    if (visits.has(event.pass)) continue;
    visits.set(event.pass, event.dose);
    cell.dose = (cell.dose * cell.n + event.dose) / (cell.n + 1);
    cell.n++;
    if (event.dose < TARGET.minDose - EPS || event.dose > TARGET.maxDose + EPS) {
      run._doseIssues[index] = 1;
      cell.doseIssue = true;
    }
  }
}

export function advanceRun(run, toProgress) {
  if (!Number.isFinite(toProgress)) throw new TypeError('Progress must be finite');
  const next = Math.max(0, Math.min(1, toProgress));
  if (next < run.progress - EPS) throw new RangeError('A completed spray path cannot be rewound; create a new run');
  if (next <= run.progress) return run;
  const distance = next * run._total;
  while (run._cursor < run._events.length && run._events[run._cursor].distance <= distance + EPS) {
    deposit(run, run._events[run._cursor++]);
  }
  run.progress = next;
  return run;
}

function nearOpening(cell) {
  const h = M.WALL.hole;
  return cell.x >= h.x - 340 && cell.x <= h.x + h.w + 340 &&
    cell.z >= h.z - 160 && cell.z <= h.z + h.h + 160;
}

function issueFor(run, cell, index) {
  if (cell.hole) return cell.n ? 'pollution' : null;
  if (!cell.n) return nearOpening(cell) ? 'edge' : 'miss';
  return run._doseIssues[index] ? 'dose' : null;
}

const ISSUE_TEXT = {
  miss: ['漏喷区', '这部分墙面尚未被实际喷幅覆盖；调整道间距或安排局部补喷。'],
  edge: ['窗边待补喷', '完整喷幅保护保留了窗边空白；保留遮蔽，用局部精细作业补齐。'],
  pollution: ['保护区受喷', '窗洞保护区记录到喷涂；先清理污染，再复核停喷时机。'],
  dose: ['相对沉积偏差', '至少一道的相对沉积超出本项目 0.85–1.20× 教学目标；核对速度和流量后处理。'],
};

export function summarizeRun(run) {
  let target = 0, covered = 0, holes = 0, polluted = 0, uniform = 0, issueCount = 0;
  const byType = { pollution: [], dose: [], edge: [], miss: [] };
  run.coat.cells.forEach((cell, index) => {
    if (cell.hole) { holes++; if (cell.n) polluted++; }
    else { target++; if (cell.n) { covered++; if (!run._doseIssues[index]) uniform++; } }
    const type = issueFor(run, cell, index);
    if (type) { issueCount++; byType[type].push({ cell, index }); }
  });
  // Pick spatially distinct examples and reserve room for each kind of defect.
  const issues = [];
  for (let round = 0; round < 2; round++) for (const [type, candidates] of Object.entries(byType)) {
    const item = candidates.find(({ cell }) => !issues.some(i => i.type === type && Math.hypot(i.x - cell.x, i.z - cell.z) < 420));
    if (item) {
      const [label, detail] = ISSUE_TEXT[type];
      issues.push({ id: `${type}-${item.index}`, type, x: item.cell.x, z: item.cell.z, label, detail });
    }
  }
  const coverage = target ? covered / target * 100 : 0;
  const pollution = holes ? polluted / holes * 100 : 0;
  const uniformity = covered ? uniform / covered * 100 : 0;
  const complete = run.progress >= 1;
  return { coverage, pollution, missArea: (target - covered) * run.coat.cellSize ** 2 / 1e6,
    uniformity, issueCount, complete,
    ready: complete && coverage >= TARGET.coverage && polluted === 0 && uniform === covered,
    issues };
}

export function repairAt(run, x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) throw new TypeError('Repair position must be finite');
  if (run.progress < 1) return { changed: 0, reason: '请完成本轮喷涂后再进行局部处理。', x, z };
  const action = { id: `repair-${run.repairs.length + 1}`, x, z, radius: REPAIR_RADIUS,
    changed: 0, filled: 0, cleaned: 0, recoated: 0, cellIndices: [] };
  run.coat.cells.forEach((cell, index) => {
    if (Math.hypot(cell.x - x, cell.z - z) > REPAIR_RADIUS) return;
    const type = issueFor(run, cell, index);
    if (!type) return;
    if (type === 'pollution') {
      cell.n = 0; cell.dose = 0; action.cleaned++;
    } else {
      // The local finishing operation includes removal/recoating for an abnormal layer.
      // n describes the currently retained coat; the removal remains in the action log.
      if (type === 'dose') action.recoated++; else action.filled++;
      cell.n = 1; cell.dose = 1;
    }
    cell.repaired = true;
    cell.doseIssue = false;
    run._doseIssues[index] = 0;
    run._visits[index].clear();
    if (!cell.hole) run._visits[index].set(action.id, 1);
    action.cellIndices.push(index); action.changed++;
  });
  action.label = [action.filled ? `精细补喷 ${action.filled} 格` : '',
    action.cleaned ? `清理保护区 ${action.cleaned} 格` : '',
    action.recoated ? `处理异常层并重喷 ${action.recoated} 格` : ''].filter(Boolean).join('；') || '该区域无需处理';
  if (action.changed) run.repairs.push(action);
  return action;
}

export function repairAll(run) {
  if (run.progress < 1) return { changed: 0, actions: [], summary: summarizeRun(run), reason: '请完成本轮喷涂后再进行局部处理。' };
  const actions = [];
  // Traverse actual faulty cells; each action changes only its bounded local area.
  run.coat.cells.forEach((cell, index) => {
    if (issueFor(run, cell, index)) {
      const action = repairAt(run, cell.x, cell.z);
      if (action.changed) actions.push(action);
    }
  });
  return { changed: actions.reduce((n, a) => n + a.changed, 0), actions, summary: summarizeRun(run) };
}

export function planReport(params = {}) {
  const p = parameters(params), geometry = M.coverage(p), overlap = M.overlap(p);
  const doses = Array.from({ length: 101 }, (_, i) => M.depositionAt(i / 100, p).dose);
  const doseRange = { min: Math.min(...doses), max: Math.max(...doses) };
  return { params: p, geometry: { coverage: geometry.percent, pollution: geometry.pollution, missArea: geometry.area },
    coverage: geometry.percent, pollution: geometry.pollution, missArea: geometry.area,
    width: overlap.width, overlap: overlap.ratio, gap: overlap.gap, passCount: M.passes(p.spacing).length,
    doseRange, doseMin: doseRange.min, doseMax: doseRange.max, target: { ...TARGET } };
}

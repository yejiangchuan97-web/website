/**
 * Educational LiDAR model. Coordinates and ranges are metres, world Z is up,
 * azimuth/elevation/yaw are degrees, and timeNs is the round-trip flight time.
 * The scene consumes this geometry; visual trims are not additional targets.
 */
export const LIGHT_SPEED = 299792458;
const DEG = Math.PI / 180;
const EPS = 1e-9;
export const POSITIONS = Object.freeze({
  A: Object.freeze([-2.3, -0.6]),
  B: Object.freeze([-0.8, -1.4]),
});

const TARGETS = [
  { id: 'back-wall', type: 'box', name: '后墙', min: [3.15, -2.1, 0], max: [3.3, 2.2, 2.2] },
  { id: 'side-wall', type: 'box', name: '侧墙', min: [-3.2, 2.05, 0], max: [3.15, 2.2, 2.2] },
  { id: 'crate', type: 'box', name: '遮挡箱', min: [-0.5, -0.9, 0], max: [0.5, 0.3, 1.4] },
  { id: 'low-block', type: 'box', name: '低垫块', min: [0.1, -1.65, 0], max: [0.65, -1.15, 0.22] },
  { id: 'beam', type: 'box', name: '上方横梁', min: [1.8, -1, 1.1], max: [2, 1.3, 1.35] },
  { id: 'beam-post-left', type: 'box', name: '横梁左立柱', min: [1.82, -1.16, 0], max: [1.98, -1, 1.35] },
  { id: 'beam-post-right', type: 'box', name: '横梁右立柱', min: [1.82, 1.3, 0], max: [1.98, 1.46, 1.35] },
  { id: 'thin-pole', type: 'cylinder', name: '细柱', center: [1.25, -1.5], radius: 0.035, zMin: 0, zMax: 1.9 },
  { id: 'floor', type: 'plane', name: '地面', z: 0, min: [-3.4, -2.25, 0], max: [3.4, 2.25, 0] },
];
for (const target of TARGETS) {
  for (const value of Object.values(target)) if (Array.isArray(value)) Object.freeze(value);
  Object.freeze(target);
}
Object.freeze(TARGETS);

/** Fresh definitions prevent a rendering module mutating subsequent scans. */
export function environment() {
  return TARGETS.map(target => Object.fromEntries(Object.entries(target).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value])));
}

function finite(value, fallback) {
  return value !== null && value !== '' && Number.isFinite(Number(value)) ? Number(value) : fallback;
}
function coords(value) {
  const array = Array.isArray(value) ? value : value?.point ?? value?.xyz;
  if (!Array.isArray(array) || array.length < 3 || !array.slice(0, 3).every(Number.isFinite)) throw new TypeError('需要三个有限数值坐标');
  return array.slice(0, 3);
}
function normaliseAngle(angle) { return ((angle % 360) + 360) % 360; }

export function sensorOrigin(state = {}) {
  if (Array.isArray(state.origin)) return coords(state.origin);
  const position = typeof state.position === 'string' ? POSITIONS[state.position] : state.position;
  const p = Array.isArray(position) ? position : POSITIONS.A;
  return [finite(p[0], POSITIONS.A[0]), finite(p[1], POSITIONS.A[1]), finite(state.height, p.length > 2 ? p[2] : 0.7)];
}

export function elevations(channels = 16) {
  const count = Number(channels);
  if (!Number.isInteger(count) || count < 1 || count > 128) throw new RangeError('教学通道数需要在 1 至 128 之间');
  return count === 1 ? [0] : Array.from({ length: count }, (_, i) => -20 + 40 * i / (count - 1));
}

/** Known rigid pose only; this is not registration/SLAM inferred from points. */
export function transformPoint(value, pose = {}, inverse = false) {
  const p = coords(value);
  const origin = Array.isArray(pose) ? coords(pose) : sensorOrigin(pose);
  const yaw = finite(pose.yaw, 0) * DEG;
  const c = Math.cos(yaw), s = Math.sin(yaw);
  if (inverse) {
    const x = p[0] - origin[0], y = p[1] - origin[1];
    return [c * x + s * y, -s * x + c * y, p[2] - origin[2]];
  }
  return [c * p[0] - s * p[1] + origin[0], s * p[0] + c * p[1] + origin[1], p[2] + origin[2]];
}
export function worldToLocal(value, pose = {}) { return transformPoint(value, pose, true); }
export function pointDistance(a, b) {
  const x = coords(a), y = coords(b);
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

function intersectBox(origin, direction, box) {
  let enter = -Infinity, leave = Infinity;
  for (let axis = 0; axis < 3; axis++) {
    if (Math.abs(direction[axis]) < EPS) {
      if (origin[axis] < box.min[axis] - EPS || origin[axis] > box.max[axis] + EPS) return null;
      continue;
    }
    const a = (box.min[axis] - origin[axis]) / direction[axis];
    const b = (box.max[axis] - origin[axis]) / direction[axis];
    enter = Math.max(enter, Math.min(a, b));
    leave = Math.min(leave, Math.max(a, b));
    if (leave < enter - EPS) return null;
  }
  if (leave < EPS) return null;
  return enter >= EPS ? enter : leave;
}

function intersectCylinder(origin, direction, cylinder) {
  const x = origin[0] - cylinder.center[0], y = origin[1] - cylinder.center[1];
  const a = direction[0] ** 2 + direction[1] ** 2;
  const b = 2 * (x * direction[0] + y * direction[1]);
  const c = x * x + y * y - cylinder.radius ** 2;
  const candidates = [];
  if (a > EPS * EPS) {
    const disc = b * b - 4 * a * c;
    if (disc >= -EPS) {
      const root = Math.sqrt(Math.max(0, disc));
      for (const t of [(-b - root) / (2 * a), (-b + root) / (2 * a)]) {
        const z = origin[2] + direction[2] * t;
        if (t >= EPS && z >= cylinder.zMin - EPS && z <= cylinder.zMax + EPS) candidates.push(t);
      }
    }
  }
  if (Math.abs(direction[2]) > EPS) {
    for (const z of [cylinder.zMin, cylinder.zMax]) {
      const t = (z - origin[2]) / direction[2];
      const px = x + direction[0] * t, py = y + direction[1] * t;
      if (t >= EPS && px * px + py * py <= cylinder.radius ** 2 + EPS) candidates.push(t);
    }
  }
  return candidates.length ? Math.min(...candidates) : null;
}

function intersectPlane(origin, direction, plane) {
  if (Math.abs(direction[2]) < EPS) return null;
  const t = (plane.z - origin[2]) / direction[2];
  if (t < EPS) return null;
  const x = origin[0] + direction[0] * t, y = origin[1] + direction[1] * t;
  return x >= plane.min[0] - EPS && x <= plane.max[0] + EPS && y >= plane.min[1] - EPS && y <= plane.max[1] + EPS ? t : null;
}

// Hash/Box–Muller: repeatable radial error, independent of scan angular spacing.
function hash(n) {
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return (n ^ (n >>> 16)) >>> 0;
}
function radialGaussian(seed, azimuth, elevation, origin) {
  let key = hash(seed | 0);
  for (const value of [azimuth, elevation, ...origin]) key = hash(key ^ Math.round(value * 1e6));
  const u = (hash(key ^ 0x9e3779b9) + 0.5) / 4294967296;
  const v = (hash(key ^ 0x85ebca6b) + 0.5) / 4294967296;
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function castRay(options = {}) {
  const origin = sensorOrigin(options);
  const yaw = finite(options.yaw, 0);
  let azimuth = normaliseAngle(finite(options.azimuth, finite(options.angle, 0)));
  let elevation = finite(options.elevation, 0);
  let direction;
  if (options.direction) {
    direction = coords(options.direction);
    const norm = Math.hypot(...direction);
    if (norm < EPS) throw new RangeError('射线方向不能是零向量');
    direction = direction.map(value => value / norm);
    const localHeading = Math.atan2(direction[1], direction[0]) / DEG - yaw;
    azimuth = normaliseAngle(localHeading);
    elevation = Math.asin(Math.max(-1, Math.min(1, direction[2]))) / DEG;
  } else {
    const a = (azimuth + yaw) * DEG, b = elevation * DEG;
    direction = [Math.cos(b) * Math.cos(a), Math.cos(b) * Math.sin(a), Math.sin(b)];
  }
  const maxRange = finite(options.maxRange, 12);
  if (maxRange <= 0) throw new RangeError('最大测距需要大于零');
  const objects = options.objects ?? TARGETS;
  let nearest = Infinity, objectId = null;
  for (const target of objects) {
    const t = target.type === 'box' ? intersectBox(origin, direction, target)
      : target.type === 'cylinder' ? intersectCylinder(origin, direction, target)
      : target.type === 'plane' || target.type === 'floor' ? intersectPlane(origin, direction, target) : null;
    if (t !== null && Number.isFinite(t) && t <= maxRange + EPS && t < nearest) { nearest = t; objectId = target.id; }
  }
  const ray = {
    index: Math.max(0, Math.floor(finite(options.index, 0))), azimuth, elevation,
    origin, direction, hit: false, distance: null, truthDistance: null,
    point: null, truthPoint: null, local: null, timeNs: null, objectId: null,
  };
  if (!Number.isFinite(nearest)) return ray;
  const sigma = Math.max(0, finite(options.sigma, 0));
  const distance = Math.max(EPS, nearest + sigma * radialGaussian(finite(options.seed, 1), azimuth, elevation, origin));
  const truthPoint = direction.map((v, i) => origin[i] + v * nearest);
  const point = direction.map((v, i) => origin[i] + v * distance);
  return {
    ...ray, hit: true, distance, truthDistance: nearest, point, truthPoint,
    local: worldToLocal(point, { origin, yaw }), timeNs: 2 * distance / LIGHT_SPEED * 1e9, objectId,
  };
}

export function rayFor(state = {}) {
  const channels = Math.floor(finite(state.channels, 16));
  const beams = elevations(channels);
  const channel = Math.max(0, Math.min(channels - 1, Math.floor(finite(state.channel, Math.floor(channels / 2)))));
  return castRay({ ...state, origin: sensorOrigin(state), azimuth: finite(state.angle, 0), elevation: beams[channel], index: finite(state.index, channel) });
}

export function scan(state = {}) {
  const step = finite(state.step, 2);
  if (step < 0.25 || step > 360) throw new RangeError('角间距需要在 0.25° 至 360° 之间');
  const channels = Math.floor(finite(state.channels, 16));
  const beams = elevations(channels);
  const settings = {
    position: typeof state.position === 'string' ? state.position : 'custom',
    origin: sensorOrigin(state), height: sensorOrigin(state)[2], yaw: finite(state.yaw, 0),
    step, channels, sigma: Math.max(0, finite(state.sigma, 0)), maxRange: finite(state.maxRange, 12), seed: finite(state.seed, 1),
  };
  const rays = [];
  for (let azimuthIndex = 0; azimuthIndex * step < 360 - EPS; azimuthIndex++) {
    const azimuth = azimuthIndex * step;
    for (const elevation of beams) {
      rays.push(castRay({ ...settings, objects: state.objects, azimuth, elevation, index: rays.length }));
    }
  }
  const points = rays.filter(ray => ray.hit);
  return { rays, points, emitted: rays.length, returned: points.length, missed: rays.length - points.length, settings };
}

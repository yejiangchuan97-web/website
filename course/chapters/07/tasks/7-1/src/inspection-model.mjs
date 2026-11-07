/* Inspection evidence model. Metres in the scene, seconds in advance().
 * Capture gates are lesson settings, not inspection or machine safety standards.
 */
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const clone = value => JSON.parse(JSON.stringify(value));
const result = (ok, reason = '', extra = {}) => ({ ok, reason, ...extra });
const finite = value => typeof value === 'number' && Number.isFinite(value);

export const ROBOTS = freeze([
  { id: 'wheel', type: 'wheel', name: '轮式机器人', short: '轮式', role: '沿桥面与平整通道巡视', limitation: '本课轮式平台不能越过检修阶梯，也不能附着钢梁。' },
  { id: 'dog', type: 'dog', name: '四足机器人', short: '四足', role: '通过台阶到达桥台检查点', limitation: '本课四足平台可以通过设定台阶；不能附着竖直钢梁。' },
  { id: 'crawler', type: 'crawler', name: '爬壁机器人', short: '爬壁', role: '沿可磁吸钢梁表面近距观察', limitation: '本课采用磁吸机型，需核对钢梁表面并安装独立防坠系绳。' }
]);

export const MISSIONS = freeze([
  {
    id: 'road', code: 'A01', name: '桥面排水口', short: '桥面', robot: 'wheel', seconds: 8,
    target: [-2, 4.80, 2.65],
    brief: '雨后先沿桥面找积水。确认排水口的位置，再近看堵塞物，留下能够复查的照片。',
    observation: '排水口可见落叶杂物堵塞，周边有积水',
    disposition: '安排清理，并在清理后回到同一点复查排水情况',
    conclusion: '复查照片显示堵塞物已清理、积水消退，本条工单可关闭。',
    followStatus: 'resolved', followLabel: '已闭环',
    principle: '机器人把异常带回记录；清理后的同点复查，才让这条管养任务闭环。'
  },
  {
    id: 'stairs', code: 'B02', name: '桥台侧面水迹', short: '桥台', robot: 'dog', seconds: 12,
    target: [-8.3, 3.85, 3.52],
    brief: '检修台阶把桥台观察点与桥面分开。选能通过台阶的平台，找到水迹与接缝的相对位置。',
    observation: '桥台侧面可见水迹，来源尚未确认',
    disposition: '登记位置并安排同点复查，结合排水与接缝检查查明来源',
    conclusion: '同点复查仍能看到水迹，继续跟踪并查找来源，不能仅凭照片判定渗漏成因。',
    followStatus: 'tracked', followLabel: '继续跟踪',
    principle: '看到了水迹，只能先记录可见现象；原因需要后续检查与复核。'
  },
  {
    id: 'wall', code: 'C03', name: '钢梁表面近查', short: '钢梁', robot: 'crawler', seconds: 8,
    target: [3, 3.9, 3.21],
    brief: '从桥下近看钢梁表面。先确认磁吸条件与防坠系绳，再靠近涂层上的线状异常。',
    observation: '钢梁涂层表面可见线状异常，性质尚未确认',
    disposition: '标注位置并提交专业复核，必要时采用适用检测手段确认',
    conclusion: '复拍确认异常仍在原位置，转交专业人员复核；照片不能给出结构安全结论。',
    followStatus: 'professional-review', followLabel: '待专业复核',
    principle: '爬上去、拍清楚，是获取证据；异常性质与结构安全还需要专业判断。'
  }
]);

const missionOf = id => MISSIONS.find(m => m.id === id);
const entryOf = state => state?.entries?.[state.mission];
const freshCamera = () => ({ mode: 'wide', yaw: 0, pitch: 0, zoom: 1, lamp: false });

export function createState() {
  return {
    mission: 'road', stage: 'survey', robot: 'wheel', camera: freshCamera(), serial: 0,
    entries: Object.fromEntries(MISSIONS.map(m => [m.id, {
      robot: m.robot, progress: 0, moving: false, arrived: false, blocked: '',
      magnet: false, tether: false, serviceDone: false, photos: [], record: null, follow: null
    }]))
  };
}

export function selectMission(state, id) {
  if (!missionOf(id)) return result(false, '没有这个巡检点。');
  const previous = entryOf(state);
  if (previous) previous.moving = false;
  state.mission = id;
  state.robot = state.entries[id].robot;
  state.camera = freshCamera();
  state.stage = state.entries[id].arrived ? 'capture' : 'survey';
  return result(true, `已切换至${missionOf(id).name}。`);
}

export function selectRobot(state, type) {
  if (!ROBOTS.some(r => r.id === type)) return result(false, '没有这个机器人。');
  const entry = entryOf(state);
  if (!entry) return result(false, '请先选择巡检点。');
  if (entry.robot === type) { state.robot = type; return result(true, '已选择该机器人。'); }
  entry.robot = type;
  state.robot = type;
  entry.progress = 0;
  entry.moving = false;
  entry.arrived = false;
  entry.blocked = '';
  return result(true, '机器人已更换，请重新到达巡检点。已有照片与记录保留。');
}

export function access(state) {
  const entry = entryOf(state), id = state?.mission;
  if (!entry || !missionOf(id)) return result(false, '请先选择巡检点。', { code: 'mission' });
  const robot = entry.robot;
  if (id === 'road' && ['wheel', 'dog'].includes(robot)) return result(true, '可沿桥面到达排水口。', { code: 'ready' });
  if (id === 'stairs' && robot === 'dog') return result(true, '可通过本课检修台阶。', { code: 'ready' });
  if (id === 'wall' && robot === 'crawler') {
    if (!entry.magnet) return result(false, '先确认磁吸机型与可磁吸钢梁表面，并完成附着检查。', { code: 'magnet' });
    if (!entry.tether) return result(false, '独立防坠系绳尚未连接，不能开始爬升。', { code: 'tether' });
    return result(true, '附着检查与独立防坠系绳已确认，可沿钢梁近查。', { code: 'ready' });
  }
  const reason = id === 'road'
    ? '这台爬壁平台用于附着表面近查，请换轮式或四足平台巡视桥面。'
    : id === 'stairs'
      ? (robot === 'wheel' ? '本课轮式平台在台阶前停止，请换四足平台。' : '本课磁吸爬壁平台不能沿混凝土台阶行走，请换四足平台。')
      : '本课的地面轮式和四足平台不能附着竖直钢梁，请换爬壁平台。';
  return result(false, reason, { code: 'platform' });
}

export function advance(state, dt) {
  const entry = entryOf(state), mission = missionOf(state?.mission);
  if (!entry || !mission) return result(false, '请先选择巡检点。', { updated: false, arrived: false });
  if (!finite(dt) || dt < 0) return result(false, '推进时间必须是非负秒数。', { updated: false, arrived: entry.arrived });
  if (!entry.moving || dt === 0) return result(true, '', { updated: false, arrived: entry.arrived, progress: entry.progress });
  const route = access(state);
  if (!route.ok && route.code !== 'platform') {
    entry.moving = false;
    entry.blocked = route.reason;
    return result(false, route.reason, { updated: true, arrived: false, progress: entry.progress, blocked: true, code: route.code });
  }
  const end = route.ok ? 1 : .15;
  const previous = entry.progress;
  entry.progress = Math.min(end, Math.max(0, entry.progress) + dt / mission.seconds);
  entry.blocked = '';
  if (entry.progress >= end) {
    entry.moving = false;
    entry.arrived = route.ok;
    if (!route.ok) entry.blocked = route.reason;
  }
  return result(route.ok, route.ok ? (entry.arrived ? '已到达，停稳后可取景拍照。' : '正在前往巡检点。') : route.reason, {
    updated: entry.progress !== previous, arrived: entry.arrived, progress: entry.progress,
    blocked: !!entry.blocked, code: route.code
  });
}

export function setStage(state, stage) {
  if (typeof stage !== 'string' || !stage.trim()) return result(false, '请选择实训环节。');
  // The presentation owns stage names; evidence gates live in the actions below.
  state.stage = stage;
  return result(true);
}

export function photoQuality(state, metrics = {}) {
  const entry = entryOf(state);
  const mode = metrics.mode || state?.camera?.mode || 'wide';
  const coverageMin = mode === 'detail' ? .13 : .025;
  const checks = {
    arrived: !!entry?.arrived,
    stationary: !!entry && !entry.moving,
    centered: metrics.centered === true,
    visible: metrics.visible === true,
    exposure: finite(metrics.exposure) && metrics.exposure >= .45,
    incidence: finite(metrics.incidence) && metrics.incidence >= 0 && metrics.incidence <= 70,
    coverage: finite(metrics.coverage) && metrics.coverage >= coverageMin,
    mode: mode === 'wide' || mode === 'detail'
  };
  const messages = {
    arrived: '机器人尚未到达这个巡检点。', stationary: '机器人仍在移动，停稳后再拍。',
    centered: '巡检点偏离取景中心，请转动镜头重新对准。', visible: '巡检点被遮挡，当前画面不能作为有效证据。',
    exposure: '画面太暗，打开补光或调整取景。', incidence: '观察角度太斜，调整到更正对表面的位置。',
    coverage: mode === 'detail' ? '细部在画面中太小，请放大或靠近。' : '巡检点在全景中太小，请调整距离。',
    mode: '请选择全景或细部拍摄。'
  };
  const reasons = Object.entries(checks).filter(([, pass]) => !pass).map(([key]) => messages[key]);
  return result(!reasons.length, reasons.join(' ') || '取景满足本课证据要求。', {
    valid: !reasons.length, reasons, checks, mode,
    thresholds: { exposureMin: .45, incidenceMax: 70, coverageMin, teachingOnly: true }
  });
}

export function addPhoto(state, supplied = {}) {
  const entry = entryOf(state);
  if (!entry) return result(false, '请先选择巡检点。');
  if (supplied.mission && supplied.mission !== state.mission) return result(false, '照片属于另一个巡检点，不能放入当前记录。');
  const mode = supplied.mode || state.camera.mode;
  const metrics = clone({ ...(supplied.metrics || {}), mode });
  const quality = photoQuality(state, metrics);
  const reasons = [...quality.reasons];
  if (typeof supplied.image !== 'string' || !supplied.image.length) reasons.push('没有保存到实际拍摄画面，请重新拍照。');
  state.serial += 1;
  const photo = freeze({
    ...clone(supplied), id: `P${String(state.serial).padStart(3, '0')}`, serial: state.serial,
    mission: state.mission, code: missionOf(state.mission).code, robot: entry.robot,
    mode, image: typeof supplied.image === 'string' ? supplied.image : '', metrics,
    // The renderer supplies this condition from the world that produced the image.
    // Never infer a captured condition from the current UI or later scene state.
    condition: typeof supplied.condition === 'string' ? supplied.condition : 'unverified',
    camera: clone(state.camera), progress: entry.progress, arrived: entry.arrived,
    moving: entry.moving, valid: !reasons.length, reasons,
    reason: reasons.join(' ') || quality.reason,
    quality: { ...quality, ok: !reasons.length, valid: !reasons.length, reason: reasons.join(' ') || quality.reason, reasons },
    capturedAt: supplied.capturedAt || new Date().toISOString()
  });
  entry.photos.push(photo);
  return result(true, photo.reason, { photo, valid: photo.valid });
}

export function saveRecord(state, observation, disposition) {
  const entry = entryOf(state), mission = missionOf(state?.mission);
  if (!entry || !mission) return result(false, '请先选择巡检点。');
  const photos = entry.photos.filter(p => p.mission === state.mission && p.valid);
  const wide = [...photos].reverse().find(p => p.mode === 'wide');
  const detail = [...photos].reverse().find(p => p.mode === 'detail');
  if (!wide || !detail) return result(false, !wide && !detail ? '先保存一张合格全景和一张合格细部照片。' : !wide ? '还缺少能定位的合格全景照片。' : '还缺少看清异常的合格细部照片。');
  if (observation !== mission.observation) return result(false, '记录应只写照片能支持的可见现象，不要把异常直接写成原因或结构安全结论。');
  if (disposition !== mission.disposition) return result(false, '请安排与现有证据相符的管养处置，保留需要复查或专业确认的事项。');
  const record = freeze({
    id: `R-${mission.code}-${state.serial}`, mission: mission.id, code: mission.code,
    observation, disposition, photos: [wide.id, detail.id],
    photoIDs: { wide: wide.id, detail: detail.id }, referencePhotoID: detail.id,
    captureSerial: state.serial, createdAt: new Date().toISOString()
  });
  entry.record = record;
  entry.follow = null;
  return result(true, '位置、全景、细部和处置已归入记录。接下来回到同一点复查。', { record });
}

export function followup(state, supplied) {
  const entry = entryOf(state), mission = missionOf(state?.mission);
  if (!entry || !mission) return result(false, '请先选择巡检点。');
  if (!entry.record) return result(false, '先形成巡检记录，再进行同点复查。');
  if (!supplied || typeof supplied !== 'object') return result(false, '请保存一张本次复查的实际照片。');
  if (supplied.mission && supplied.mission !== state.mission) return result(false, '复查照片不属于当前巡检点。');
  let photo;
  if (supplied.id) {
    photo = entry.photos.find(p => p.id === supplied.id);
    if (!photo) return result(false, '这张照片不在当前巡检点的证据册中。');
  } else {
    const saved = addPhoto(state, supplied);
    if (!saved.ok) return saved;
    photo = saved.photo;
  }
  if (!photo.valid) return result(false, `复查照片尚不合格：${photo.reason}`, { photo });
  if (photo.serial <= entry.record.captureSerial) return result(false, '需要记录形成后重新拍摄的复查照片，不能复用原始证据。');
  if (photo.mode !== 'detail') return result(false, '请按原细部观察位置重新取景，便于对比异常变化。');
  if (mission.id === 'road' && photo.condition !== 'after-maintenance') {
    return result(false, '这张照片尚未记录清理后的现场状态。请在管养清理完成后重新复拍，再判断能否关闭工单。', { photo });
  }
  const follow = freeze({
    mission: mission.id, recordID: entry.record.id,
    originalPhotoID: entry.record.photoIDs.detail, photoID: photo.id,
    status: mission.followStatus, label: mission.followLabel,
    conclusion: mission.conclusion, createdAt: new Date().toISOString()
  });
  entry.follow = follow;
  return result(true, mission.conclusion, { follow, photo });
}

export function summary(state) {
  const items = MISSIONS.map(m => {
    const entry = state.entries[m.id];
    return {
      id: m.id, code: m.code, name: m.name, recorded: !!entry.record,
      completed: !!(entry.record && entry.follow),
      status: entry.follow?.status || (entry.record ? 'awaiting-followup' : 'unrecorded'),
      label: entry.follow?.label || (entry.record ? '等待复查' : '尚未记录'),
      pending: !!entry.record && entry.follow?.status !== 'resolved',
      validPhotos: entry.photos.filter(p => p.valid).length,
      photos: entry.photos.length
    };
  });
  return {
    total: MISSIONS.length, completed: items.filter(i => i.completed).length,
    recorded: items.filter(i => i.recorded).length, pending: items.filter(i => i.pending).length,
    resolved: items.filter(i => i.status === 'resolved').length,
    awaitingFollowup: items.filter(i => i.status === 'awaiting-followup').length,
    allComplete: items.every(i => i.completed), items
  };
}

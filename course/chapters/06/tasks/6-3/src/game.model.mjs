// Discrete teaching states, not material-removal or surface-quality predictions.
// The numbers below are normalized game progress, never millimetres or force limits.
const bound = value => Math.max(0, Math.min(1, value));
const abrasives = {
  '80': { removal: .55, scratch: .75 },
  '180': { removal: .32, reduce: .22, floor: .12 },
  '240': { removal: .18, reduce: .28, floor: .04 },
  worn: { removal: .01, reduce: 0, floor: .28 }
};

export function createPatch() {
  return { rough: 1, scratch: 0, damage: 0, passes: 0 };
}

export function abrade(patch, { grit, pressure = 'light', dwell = false }) {
  const tool = abrasives[grit];
  if (!tool) throw new TypeError('请选择有效的磨料状态。');
  if (!['light', 'heavy'].includes(pressure)) throw new TypeError('请选择轻压或重压。');
  const rough = bound(patch.rough - tool.removal);
  const scratch = grit === '80'
    ? Math.max(patch.scratch, tool.scratch)
    : Math.max(tool.floor, patch.scratch - tool.reduce);
  // Over-sanding cannot be repaired by another pass; a new putty layer is needed.
  const damage = bound(patch.damage + (pressure === 'heavy' ? .45 : 0) + (dwell ? .45 : 0));
  return { rough, scratch: bound(scratch), damage, passes: patch.passes + 1 };
}

export function surfaceStatus(patch) {
  if (patch.damage >= .2) return {
    key: 'damaged', title: '过磨损伤',
    description: '重压或同点驻留造成了局部损伤；继续打磨不能补回材料。需重新批补、干燥后再试磨。'
  };
  if (patch.scratch > .2) return {
    key: 'scratch', title: '明显划痕待处理',
    description: '侧光下仍有较深砂痕或旋纹。检查磨料与积屑，换合适细磨料轻压试磨，再复核表面。'
  };
  if (patch.rough > .15) return {
    key: 'raw', title: '表面仍有起伏',
    description: '局部凸起还未处理均匀；保持轻压、连续进给，打磨后用靠尺和侧光复核。'
  };
  return {
    key: 'ready', title: '试片达到本关目标',
    description: '本关示意起伏和划痕已减小，且未出现过磨。现场仍需靠尺、侧光和边角检查，不能用轨迹或力读数代替验收。'
  };
}

export function dustState({ power, connected, filterClean, bagReady, seal }) {
  if (!connected) return { key: 'hose', title: '吸尘管未接好', tip: '先停磨盘，检查接头与管路连接；接牢后再检查吸尘系统。', ready: false };
  if (!seal) return { key: 'seal', title: '集尘罩漏气', tip: '先停磨盘，检查集尘罩和密封裙边，恢复贴合后再试吸。', ready: false };
  if (!bagReady) return { key: 'bag', title: '集尘袋未就绪', tip: '停机断电后，按说明书检查集尘袋安装与容量，必要时更换并封好袋口。', ready: false };
  if (!filterClean) return { key: 'filter', title: '滤芯堵塞', tip: '先停磨盘，按设备规定清理或更换滤芯；不要用吹灰方式扬起粉尘。', ready: false };
  if (!power) return { key: 'power', title: '吸尘未开启', tip: '先启用匹配的吸尘设备并确认吸力，再启动打磨。', ready: false };
  return { key: 'ready', title: '控尘检查通过', tip: '磨盘处收集粉尘，经软管进入集尘袋与过滤系统；继续留意吸力与扬尘变化。', ready: true };
}

export function initialMaintenance() {
  return { running: true, extracted: false, isolated: false, done: [], completed: false };
}

export function maintenance(state, action) {
  const next = { ...state, done: [...state.done] };
  const result = (ok, message) => ({ state: next, ok, message });
  const checks = {
    abrasive: '已检查磨料磨损与粘接、背盘和护罩状态；损坏或堵塞的耗材按说明更换。',
    checkFilter: '已检查软管、集尘袋和滤芯；按说明清理或更换，收集的粉尘封袋处理。',
    cleanBody: '已用适合的吸尘和擦拭方式清洁机身、通风口与传感器外表；不向电气部件喷水，不吹灰。'
  };
  if (action === 'stop') {
    next.running = false;
    return result(true, '磨盘已停转。先保持吸尘，清走工具和管路中的余尘。');
  }
  if (action === 'extract') {
    if (state.running) return result(false, '先停止磨盘，再保持吸尘清走余尘。');
    if (state.isolated) return result(false, '已经断电，不能再运行吸尘；本次流程需重新开始并在断电前完成余尘清理。');
    next.extracted = true;
    return result(true, '余尘已清走。现在关闭吸尘与设备电源，再断开能源。');
  }
  if (action === 'isolate') {
    if (state.running) return result(false, '磨盘仍在运行；先停磨盘，再清走余尘。');
    if (!state.extracted) return result(false, '先保持吸尘清走余尘，再关闭电源并断电。');
    next.isolated = true;
    return result(true, '已关闭电源并断开能源。可以检查磨料、集尘系统并清洁机身。');
  }
  if (action in checks) {
    if (state.running || !state.isolated) return result(false, '先停磨、清余尘并断电，才能拆检或清洁。');
    if (!next.done.includes(action)) next.done.push(action);
    return result(true, checks[action]);
  }
  if (action === 'record') {
    if (state.running || !state.isolated || !state.extracted) return result(false, '停磨、清余尘和断电尚未完成，不能收纳记录。');
    if (Object.keys(checks).some(key => !state.done.includes(key))) return result(false, '请完成磨料检查、集尘系统检查和机身清洁，再填写维护记录并收纳。');
    next.completed = true;
    return result(true, '养护完成：记录耗材、滤芯及异常情况，确认设备干燥后妥善收纳。');
  }
  return result(false, '请选择页面中的养护操作。');
}

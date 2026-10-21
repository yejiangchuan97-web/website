import {fileURLToPath as __taskFileURL} from 'node:url';
const __taskFile=p=>__taskFileURL(new URL(p,import.meta.url));
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const { chromium } = createRequire(import.meta.url)(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const here = __taskFile(".");
const output = __taskFile("./annotation-results");
const target = process.argv.find(value => value.startsWith('--url='))?.slice(6) || new URL("../index.html",import.meta.url).href;
const only = process.argv.find(value => value.startsWith('--only='))?.slice(7)?.split(',');
await mkdir(output, { recursive: true });
await mkdir(__taskFile("./annotation-results/fixtures"), { recursive: true });
const report = { started: new Date().toISOString(), target, htmlSHA256: target.startsWith('file:') ? createHash('sha256').update(await readFile(fileURLToPath(target))).digest('hex') : null, checks: [], pages: [], screenshots: [] };
const assert = (condition, message) => { if (!condition) throw Error(message); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const close = (a, b, tolerance = .025) => Math.abs(a - b) <= tolerance;
const boxClose = (a, b) => a.length === b.length && a.every((value, index) => close(value, b[index]));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const truthBoxes = [
  { id: 'H01', cls: 0, bbox: [160, 80, 320, 240] },
  { id: 'H02', cls: 1, bbox: [54.971, 244.952, 110.709, 309.201] },
  { id: 'H03', cls: 0, bbox: [414, 220, 487.6, 293.6] },
  { id: 'H04', cls: 1, bbox: [524.687, 334.812, 577.77, 396] },
  { id: 'H05', cls: 0, bbox: [352, 365, 411.2, 424.2] }
];
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--do-not-de-elevate', '--allow-file-access-from-files'] });
let active;
async function open(label, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true, ...options });
  const page = await context.newPage();
  active = page; page.setDefaultTimeout(8000);
  const log = { label, pageErrors: [], consoleErrors: [], remoteRequests: [], failedRequests: [], downloads: [] };
  report.pages.push(log);
  page.on('pageerror', error => log.pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') log.consoleErrors.push(message.text()); });
  page.on('request', request => { if (/^https?:/.test(request.url())) log.remoteRequests.push(request.url()); });
  page.on('requestfailed', request => log.failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  page.on('download', download => log.downloads.push(download.suggestedFilename()));
  await page.goto(target, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.helmetAnnotationState === 'function');
  return { context, page, log };
}
const snapshot = page => page.evaluate(() => window.helmetAnnotationState());
async function shot(page, name) {
  const path = join(output, `${name}.png`);
  await page.screenshot({ path, fullPage: true }); report.screenshots.push(path);
}
async function check(name, fn) {
  if (only && !only.some(prefix => name.startsWith(prefix))) return;
  const start = Date.now();
  try { const detail = await fn(); report.checks.push({ name, pass: true, ms: Date.now() - start, detail }); console.log(`PASS ${name}`); }
  catch (error) { report.checks.push({ name, pass: false, ms: Date.now() - start, error: error.message }); console.log(`FAIL ${name}: ${error.message}`); if (active && !active.isClosed()) await shot(active, `failed-${name}`).catch(() => {}); }
}
async function point(page, [x, y]) {
  return page.locator('#annotationSvg').evaluate((svg, position) => { const p = new DOMPoint(...position).matrixTransform(svg.getScreenCTM()); return { x: p.x, y: p.y }; }, [x, y]);
}
async function gesture(page, from, to, touch = false) {
  await page.locator('#canvasWrap').scrollIntoViewIfNeeded();
  const a = await point(page, from), b = await point(page, to);
  assert(a.x >= 0 && a.y >= 0 && b.x >= 0 && b.y >= 0 && a.x < page.viewportSize().width && b.x < page.viewportSize().width && a.y < page.viewportSize().height && b.y < page.viewportSize().height, `Gesture would leave viewport: ${JSON.stringify({ a, b })}`);
  if (touch) {
    const client = await page.context().newCDPSession(page);
    const touchPoints = position => [{ x: position.x, y: position.y, id: 0, radiusX: 2, radiusY: 2, force: 1 }];
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touchPoints(a) });
    for (let step = 1; step <= 8; step++) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: touchPoints({ x: a.x + (b.x - a.x) * step / 8, y: a.y + (b.y - a.y) * step / 8 }) });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await client.detach();
    await page.waitForTimeout(100);
  } else {
    await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 8 }); await page.mouse.up();
  }
}
async function draw(page, bbox, cls, touch = false) {
  if(touch){await page.locator('#drawTool').tap();await page.locator(`[data-cls="${cls}"]`).tap();}
  else{await page.locator('#drawTool').click(); await page.locator(`[data-cls="${cls}"]`).click();}
  await gesture(page, bbox.slice(0, 2), bbox.slice(2), touch);
}
async function completeFive(page) {
  for (const truth of truthBoxes.slice(1)) await draw(page, truth.bbox, truth.cls);
  const state = await snapshot(page); assert(state.boxes.length === 5, 'Did not create all five boxes through UI');
  await page.locator('#checkBtn').click(); assert((await page.locator('#checkResult').textContent()).includes('教学参考检查通过'), 'Complete UI annotations did not pass reference check');
}
async function download(page, button, file) {
  const [result] = await Promise.all([page.waitForEvent('download'), page.locator(button).click()]);
  const path = join(output, file); await result.saveAs(path); return { path, suggested: result.suggestedFilename(), bytes: await readFile(path) };
}
function inspectZIP(bytes) {
  const bundled = join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe');
  const python = process.env.HELMET_PYTHON || (existsSync(bundled) ? bundled : 'python');
  const script = `import sys,base64,io,zipfile,json,hashlib,struct,zlib\nb=base64.b64decode(sys.stdin.buffer.read())\nz=zipfile.ZipFile(io.BytesIO(b))\nassert z.testzip() is None\nr={'names':z.namelist(),'files':{}}\nfor i in z.infolist():\n d=z.read(i.filename)\n assert (zlib.crc32(d)&0xffffffff)==i.CRC\n f={'bytes':len(d),'sha256':hashlib.sha256(d).hexdigest()}\n if i.filename.endswith(('.txt','.json')): f['text']=d.decode('utf-8')\n if d.startswith(b'\\x89PNG\\r\\n\\x1a\\n'): f['dimensions']=list(struct.unpack('>II',d[16:24]))\n if d.startswith(b'\\xff\\xd8'):\n  p=2\n  while p<len(d):\n   if d[p]!=255: p+=1;continue\n   m=d[p+1];p+=2\n   if m in (0xd8,0xd9) or 0xd0<=m<=0xd7: continue\n   n=int.from_bytes(d[p:p+2],'big')\n   if m in (0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf): f['dimensions']=[int.from_bytes(d[p+5:p+7],'big'),int.from_bytes(d[p+3:p+5],'big')];break\n   p+=n\n r['files'][i.filename]=f\nprint(json.dumps(r,ensure_ascii=False))`;
  const result = spawnSync(python, ['-c', script], { input: Buffer.from(bytes).toString('base64'), encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
  assert(result.status === 0, `Independent ZIP validation failed: ${result.stderr}`); return JSON.parse(result.stdout);
}
function trainingPackage(zip, { width, height, count, extension = 'png', imageSHA = null }) {
  const imageName = zip.names.find(name => name.startsWith('images/'));
  const labelName = zip.names.find(name => name.startsWith('labels/'));
  assert(imageName && labelName, 'Missing training image/label pair');
  assert(imageName.slice(7).replace(/\.[^.]+$/, '') === labelName.slice(7).replace(/\.[^.]+$/, ''), 'Image/label basenames differ');
  assert(imageName.endsWith(`.${extension}`), 'Original extension was not kept');
  assert(same(zip.files[imageName].dimensions, [width, height]), 'Exported image dimensions changed');
  if (imageSHA) assert(zip.files[imageName].sha256 === imageSHA, 'Original imported image bytes changed');
  const text = zip.files[labelName].text, rows = text.trim() ? text.trim().split('\n') : [];
  assert(rows.length === count, `Expected ${count} label rows, got ${rows.length}`);
  rows.forEach(row => { const columns = row.split(' '); assert(columns.length === 5 && /^[01]$/.test(columns[0]), 'Training label must have class + four coordinates'); assert(columns.slice(1).every(value => /^\d\.\d{6}$/.test(value) && Number(value) >= 0 && Number(value) <= 1), 'Bad normalized coordinate'); });
  assert(zip.files['classes.txt'].text === 'hardhat\nno-hardhat\n', 'Class order changed');
  const manifest = JSON.parse(zip.files['review.json'].text);
  assert(manifest.status === 'reviewed-sample' && manifest.studentReviewed === true && manifest.width === width && manifest.height === height, 'Review manifest missing confirmation or dimensions');
  return { imageName, labelName, rows, manifest, imageSHA: zip.files[imageName].sha256 };
}
function assertClean(log) {
  assert(!log.pageErrors.length, `Runtime errors: ${log.pageErrors.join('; ')}`);
  assert(!log.consoleErrors.length, `Console errors: ${log.consoleErrors.join('; ')}`);
  assert(!log.remoteRequests.length, `Offline page made remote requests: ${log.remoteRequests.join('; ')}`);
  assert(!log.failedRequests.length, `Failed requests: ${JSON.stringify(log.failedRequests)}`);
}
try {
  await check('01-ready-clear-artwork-label-and-layout', async () => {
    const { context, page, log } = await open('ready');
    try {
      const state = await snapshot(page); assert(state.key === 'clear' && state.width === 640 && state.height === 640, 'Default is not clear 640 image');
      assert(state.line === '0 0.375000 0.250000 0.250000 0.250000', 'Canonical label is wrong');
      const source = await page.locator('#annotationSvg image').getAttribute('href');
      const svg = decodeURIComponent(source.slice(source.indexOf(',') + 1));
      assert(!svg.includes('id="worker-H06"'), 'Visible clear SVG still contains occluded sixth worker');
      assert((svg.match(/id="worker-H0[1-5]"/g) || []).length === 5, 'Clear image does not contain exactly five worker groups');
      const layout = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth, surface: document.querySelector('#annotationSvg').getBoundingClientRect().toJSON() }));
      assert(layout.overflow <= 1, 'Desktop has horizontal overflow'); assertClean(log); await shot(page, '01-desktop');
      return { state, layout, drawnWorkers: 5 };
    } finally { await context.close(); }
  });
  await check('02-select-move-resize-undo-keyboard-draw', async () => {
    const { context, page, log } = await open('gestures');
    try {
      await page.locator('#selectTool').click(); await page.locator('#canvasWrap').scrollIntoViewIfNeeded();
      const empty = await point(page, [30, 30]); await page.mouse.click(empty.x, empty.y); assert((await snapshot(page)).boxes.length === 1 && (await snapshot(page)).selected === null, 'Select tool created box on blank click');
      await gesture(page, [240, 160], [260, 175]); let state = await snapshot(page); assert(boxClose(state.boxes[0].bbox, [180, 95, 340, 255]), 'Moving selected box failed');
      await gesture(page, [340, 255], [355, 265]); state = await snapshot(page); assert(boxClose(state.boxes[0].bbox, [180, 95, 355, 265]), 'Corner resize failed');
      await page.locator('#undoBtn').click(); assert(boxClose((await snapshot(page)).boxes[0].bbox, [180, 95, 340, 255]), 'Undo did not restore resized box');
      await page.locator('#annotationSvg').focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Shift+ArrowDown'); assert(boxClose((await snapshot(page)).boxes[0].bbox, [181, 105, 341, 265]), 'Arrow / Shift+Arrow movement failed');
      await page.keyboard.press('Control+z'); assert(boxClose((await snapshot(page)).boxes[0].bbox, [181, 95, 341, 255]), 'Keyboard undo failed');
      await draw(page, [20, 20, 70, 65], 1); state = await snapshot(page); assert(state.boxes.length === 2 && state.boxes[1].cls === 1 && boxClose(state.boxes[1].bbox, [20, 20, 70, 65]), 'Draw tool or class selection failed');
      await page.keyboard.press('Delete'); assert((await snapshot(page)).boxes.length === 1, 'Delete key failed'); assertClean(log); return state;
    } finally { await context.close(); }
  });
  await check('03-zoom-coordinate-validation-wide-and-draft-retention', async () => {
    const { context, page, log } = await open('coordinates');
    try {
      const before = await snapshot(page); await page.locator('#zoom').selectOption('2'); const zoomed = await snapshot(page);
      assert(same(before.boxes, zoomed.boxes) && before.line === zoomed.line && zoomed.zoom === 2, '200% changed original coordinates or labels');
      for (const value of ['', '-1', '700']) { await page.locator('#x1').fill(value); await page.locator('#x1').press('Tab'); assert((await snapshot(page)).boxes[0].bbox[0] === 160, `Invalid x1 ${JSON.stringify(value)} changed original coordinate`); }
      await page.locator('#imageSelect').selectOption('wide'); const wide = await snapshot(page); assert(wide.width === 960 && wide.height === 640 && wide.line === '0 0.250000 0.250000 0.166667 0.250000', 'Wide normalization uses wrong denominator');
      await page.locator('#imageSelect').selectOption('clear'); await page.locator('#x1').fill('170'); await page.locator('#x1').press('Tab'); const clearDraft = await snapshot(page);
      await page.locator('#imageSelect').selectOption('wide'); assert((await snapshot(page)).boxes[0].bbox[0] === 160, 'Changing clear draft leaked into wide image');
      await page.locator('#imageSelect').selectOption('clear'); assert(same((await snapshot(page)).boxes, clearDraft.boxes), 'Switching images lost annotations'); assertClean(log); return { zoom: zoomed.zoom, wideLine: wide.line, clearDraft: clearDraft.boxes };
    } finally { await context.close(); }
  });
  await check('04-complete-five-through-ui-and-independent-training-zip', async () => {
    const { context, page, log } = await open('complete');
    try {
      await completeFive(page); const count = log.downloads.length; await page.locator('#exportTraining').click(); await page.waitForTimeout(180); assert(log.downloads.length === count, 'Export bypassed manual review confirmation');
      await page.locator('#reviewed').check(); const file = await download(page, '#exportTraining', 'clear-five-training.zip');
      const zip = inspectZIP(file.bytes), verified = trainingPackage(zip, { width: 640, height: 640, count: 5 });
      assert(verified.rows[0] === '0 0.375000 0.250000 0.250000 0.250000', 'Canonical first row changed'); assert(verified.manifest.issues.length === 0, 'Training manifest has unresolved issues');
      await shot(page, '02-five-heads-completed'); assertClean(log); return { suggested: file.suggested, ...verified };
    } finally { await context.close(); }
  });
  await check('05-review-class-and-occlusion-block-training-draft-zip', async () => {
    const { context, page, log } = await open('pending-review');
    try {
      await page.locator('[data-cls="review"]').click(); await page.locator('#reviewed').check(); let count = log.downloads.length;
      await page.locator('#exportTraining').click(); await page.waitForTimeout(180); assert(log.downloads.length === count && (await page.locator('#checkResult').textContent()).includes('整张图'), 'Pending class incorrectly exported training sample');
      const draft = await download(page, '#exportDraft', 'pending-review-draft.zip'); const zip = inspectZIP(draft.bytes);
      assert(zip.names.some(name => name.startsWith('image/')) && zip.names.includes('review-draft.json'), 'Draft did not preserve image and review JSON');
      assert(!zip.names.some(name => name.startsWith('labels/')), 'Draft generated conventional training labels');
      const manifest = JSON.parse(zip.files['review-draft.json'].text); assert(manifest.status === 'review-draft' && manifest.boxes[0].cls === 'review', 'Draft lost pending status');
      await page.locator('#imageSelect').selectOption('occluded'); await completeFive(page).catch(async error => { if (!(await page.locator('#checkResult').textContent()).includes('整图待复核')) throw error; });
      const occluded = await snapshot(page); assert(occluded.boxes.length === 5 && occluded.issues.some(issue => issue.includes('整图待复核')), 'Hidden sixth target not keeping whole image pending');
      await page.locator('#reviewed').check(); count = log.downloads.length; await page.locator('#exportTraining').click(); await page.waitForTimeout(180); assert(log.downloads.length === count, 'Occluded image allowed training export after five known heads were boxed');
      assertClean(log); return { draftNames: zip.names, occludedIssues: occluded.issues };
    } finally { await context.close(); }
  });
  await check('06-import-original-png-jpeg-and-reviewed-negative', async () => {
    const { context, page, log } = await open('import');
    try {
      const fixturePage = await context.newPage();
      const fixtures = await fixturePage.evaluate(() => [ ['png',320,240], ['jpeg',176,128] ].map(([format,width,height]) => { const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#d9e8fa'; ctx.fillRect(0,0,width,height); ctx.fillStyle = '#367fbd'; ctx.fillRect(14,12,40,25); return { format,width,height,data:canvas.toDataURL(`image/${format}`).split(',')[1] }; }));
      await fixturePage.close();
      const details = [];
      for (const fixture of fixtures) {
        const extension = fixture.format === 'jpeg' ? 'jpg' : 'png'; const bytes = Buffer.from(fixture.data, 'base64'); const path = join(output, 'fixtures', `自带_${fixture.width}.${extension}`); await writeFile(path, bytes);
        await page.locator('#imageFile').setInputFiles(path); await page.waitForFunction(width => window.helmetAnnotationState().key === 'imported' && window.helmetAnnotationState().width === width, fixture.width);
        const initial = await snapshot(page); assert(initial.height === fixture.height && initial.boxes.length === 0 && initial.issues.length === 0 && !initial.reviewed, 'Imported image has wrong dimensions or fabricated reference annotations');
        if (extension === 'png') await draw(page, [60, 40, 120, 100], 0);
        const count = log.downloads.length; await page.locator('#exportTraining').click(); await page.waitForTimeout(180); assert(log.downloads.length === count, 'Imported image export did not require manual review');
        await page.locator('#checkBtn').click(); assert((await page.locator('#checkResult').textContent()).includes('仍需逐图人工复核'), 'Unknown image was incorrectly marked reference checked');
        await page.locator('#reviewed').check(); const file = await download(page, '#exportTraining', `imported-${extension}-${extension === 'jpg' ? 'negative' : 'one-box'}.zip`);
        const verified = trainingPackage(inspectZIP(file.bytes), { width: fixture.width, height: fixture.height, count: extension === 'png' ? 1 : 0, extension, imageSHA: sha(bytes) });
        assert(verified.manifest.referenceCheckAvailable === false && verified.manifest.source === 'user-import', 'Imported image got built-in reference claim'); details.push({ extension, ...verified });
      }
      assertClean(log); return details;
    } finally { await context.close(); }
  });
  await check('07-mobile-390-real-touch-drawing-and-no-overflow', async () => {
    const { context, page, log } = await open('mobile-touch', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    try {
      await page.evaluate(() => { window.__annotationQAEvents = []; for (const type of ['pointerdown','pointerup','touchstart','touchend','click']) document.addEventListener(type, event => window.__annotationQAEvents.push({ type, target: event.target.id || event.target.tagName, pointerType: event.pointerType, x: event.clientX, y: event.clientY }), true); });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); assert(overflow <= 1, `Mobile horizontal overflow ${overflow}px`);
      await shot(page, '03-mobile390-initial'); await draw(page, [24, 24, 124, 104], 1, true);
      const state = await snapshot(page); assert(state.boxes.length === 2 && state.boxes[1].cls === 1 && boxClose(state.boxes[1].bbox, [24, 24, 124, 104]), 'Actual touch did not draw accurate box');
      await page.locator('#selectTool').scrollIntoViewIfNeeded();
      await page.waitForTimeout(220);
      await page.locator('#selectTool').tap();
      await page.waitForTimeout(400);
      const afterSelect = await snapshot(page); assert(afterSelect.tool === 'select', 'Mobile select toolbar tap did not switch to selection tool: '+JSON.stringify({state:afterSelect,events:await page.evaluate(()=>window.__annotationQAEvents)}));
      await gesture(page, [74, 64], [94, 84], true);
      const moved = await snapshot(page); assert(boxClose(moved.boxes[1].bbox, [44, 44, 144, 124]), 'Actual touch did not move selected box: '+JSON.stringify(moved.boxes[1].bbox));
      assert(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 1, 'Mobile gesture produced body overflow'); await shot(page, '04-mobile390-touch-annotation'); assertClean(log); return { overflow, state: moved };
    } finally { await context.close(); }
  });
} finally {
  await browser.close(); report.finished = new Date().toISOString(); report.passed = report.checks.filter(check => check.pass).length; report.failed = report.checks.filter(check => !check.pass).length;
  await writeFile(__taskFile("./annotation-results/report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, failed: report.failed, report: __taskFile("./annotation-results/report.json") })); if (report.failed) process.exitCode = 1;
}

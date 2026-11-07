import {fileURLToPath as __taskFileURL} from 'node:url';
const __taskFile=p=>__taskFileURL(new URL(p,import.meta.url));
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as M from "../src/model.mjs";

const { chromium } = createRequire(import.meta.url)(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const here = __taskFile("."), output = __taskFile("./browser-results");
const target = process.argv.find(s => s.startsWith('--url='))?.slice(6) || new URL("../index.html",import.meta.url).href;
const only = process.argv.find(s => s.startsWith('--only='))?.slice(7)?.split(',');
await mkdir(output, { recursive: true });
const report = { started: new Date().toISOString(), target, htmlSHA256: target.startsWith('file:') ? createHash('sha256').update(await readFile(fileURLToPath(target))).digest('hex') : null, checks: [], sessions: [], screenshots: [] };
const assert = (yes, message) => { if (!yes) throw Error(message); };
const close = (a, b, epsilon = 1e-7) => Math.abs(a - b) < epsilon;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const pointsClose = (a,b) => a.length===b.length&&a.every((p,i)=>p.length===b[i].length&&p.every((v,j)=>close(v,b[i][j],1e-9)));
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--do-not-de-elevate', '--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let active;
async function open(label, options = {}) {
  const { fallback = false, ...contextOptions } = options;
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true, ...contextOptions });
  if (fallback) await context.addInitScript(() => { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type, ...args) { return /webgl/i.test(type) ? null : original.call(this, type, ...args); }; });
  const page = await context.newPage(); active = page; page.setDefaultTimeout(12000);
  const log = { label, pageErrors: [], consoleErrors: [], remoteRequests: [], failedRequests: [], downloads: [] }; report.sessions.push(log);
  page.on('pageerror', error => log.pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') log.consoleErrors.push(message.text()); });
  page.on('request', request => { if (/^https?:/.test(request.url())) log.remoteRequests.push(request.url()); });
  page.on('requestfailed', request => log.failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  page.on('download', download => log.downloads.push(download.suggestedFilename()));
  await page.goto(target, { waitUntil: 'load' }); await page.waitForFunction(() => typeof window.__REBAR__?.snapshot === 'function');
  await page.waitForTimeout(300); return { context, page, log };
}
const snap = page => page.evaluate(() => window.__REBAR__.snapshot());
const stateOf = s => s.state || s;
const sceneOf = s => s.scene || s.sceneSnapshot || s;
async function shot(page, name) { const path = join(output, `${name}.png`); await page.screenshot({ path, fullPage: true }); report.screenshots.push(path); }
async function check(name, fn) {
  if (only && !only.some(prefix => name.startsWith(prefix))) return;
  const t = Date.now(); try { const detail = await fn(); report.checks.push({ name, pass: true, ms: Date.now() - t, detail }); console.log(`PASS ${name}`); }
  catch (error) { report.checks.push({ name, pass: false, ms: Date.now() - t, error: error.message }); console.log(`FAIL ${name}: ${error.message}`); if (active && !active.isClosed()) await shot(active, `failed-${name}`).catch(() => {}); }
}
function clean(log, fallback = false) {
  assert(!log.pageErrors.length, `Runtime errors: ${log.pageErrors.join('; ')}`);
  const errors = fallback ? log.consoleErrors.filter(e => !/Error creating WebGL context|WebGL context creation failed/i.test(e)) : log.consoleErrors;
  assert(!errors.length, `Console errors: ${errors.join('; ')}`);
  assert(!log.remoteRequests.length, `Remote requests: ${log.remoteRequests.join('; ')}`);
  assert(!log.failedRequests.length, `Failed requests: ${JSON.stringify(log.failedRequests)}`);
}
async function mode(page, value) { await page.locator(`[data-mode="${value}"]`).click(); await page.waitForTimeout(80); assert(stateOf(await snap(page)).mode === value, `Did not enter ${value}`); }
async function range(page, id, value) { await page.locator(id).evaluate((node, v) => { node.value = String(v); node.dispatchEvent(new Event('input', { bubbles: true })); node.dispatchEvent(new Event('change', { bubbles: true })); }, value); }
async function visible(page, selector) { await page.locator(selector).scrollIntoViewIfNeeded(); assert(await page.locator(selector).isVisible(), `Not visible: ${selector}`); }
async function overflow(page) { return page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, overflow: document.documentElement.scrollWidth - innerWidth })); }
function independentPoints() { const points = []; for (let row = 0; row <= 21; row++) for (let col = 0; col <= 23; col++) { const x = -.9 + col * .4, y = -4.1 + row * .4; const inRect = r => x >= r[0] - 1e-8 && x <= r[2] + 1e-8 && y >= r[1] - 1e-8 && y <= r[3] + 1e-8; if (!inRect([5,1.2,7,3.4]) && !inRect([1.3,1.2,2.3,2.2])) points.push({ x, y }); } return points; }
function crossesInterior(a, b, r) { const low = Math.max(0, Math.min((r[0]-a[0])/(b[0]-a[0]),(r[2]-a[0])/(b[0]-a[0]))), high = Math.min(1,Math.max((r[0]-a[0])/(b[0]-a[0]),(r[2]-a[0])/(b[0]-a[0]))); if (close(a[0], b[0])) return a[0] > r[0]+1e-7 && a[0] < r[2]-1e-7 && Math.max(Math.min(a[1],b[1]),r[1]) < Math.min(Math.max(a[1],b[1]),r[3])-1e-7; return a[1] > r[1]+1e-7 && a[1] < r[3]-1e-7 && high > low+1e-7; }

try {
  await check('01-ready-real-webgl-large-scene-and-layout', async () => {
    const { context, page, log } = await open('desktop'); try {
      const snapshot = await snap(page), scene = sceneOf(snapshot); assert(scene.available === true, 'Real WebGL scene unavailable');
      assert(await page.locator('#viewport canvas').count() === 1, 'No WebGL canvas'); assert(scene.totalParts > 1000, `Scene lacks detailed parts: ${scene.totalParts}`);
      assert((await overflow(page)).overflow <= 1, '1440 desktop horizontal overflow'); assert(await page.locator('#loading').isHidden(), 'Loading message persists');
      assert(scene.gridPoints === independentPoints().length && scene.gridPoints === 497, 'Grid point count is not 497');
      clean(log); await shot(page, '01-desktop-overview'); return { scene: { totalParts: scene.totalParts, gridPoints: scene.gridPoints, drawCalls: scene.drawCalls, triangles: scene.triangles }, layout: await overflow(page) };
    } finally { await context.close(); }
  });
  await check('02-six-location-selection-visited-and-independent-modes', async () => {
    const { context, page, log } = await open('locations'); try {
      for (const id of ['slab','column','opening','joint','material','route']) { await page.locator(`[data-location="${id}"]`).click(); assert(await page.locator('#selectionCard').isVisible(), `${id} did not open explanation`); assert((await page.locator('#selectionDescription').textContent()).trim().length > 15, `${id} explanation missing`); }
      assert((await page.locator('#visitedCount').textContent()).includes('6 / 6'), 'Visited list not complete');
      for (const value of ['errors','surface','process','overview']) {await mode(page, value);const s=await snap(page);assert(stateOf(s).selectedId===''&&await page.locator('#selectionCard').isHidden(),'Switching topics kept an unrelated selection card');assert(stateOf(s).showGrid===(value==='surface')&&stateOf(s).showReach===(value==='surface'),'Switching topics kept unrelated junction classification');}
      assert((await page.locator('#visitedCount').textContent()).includes('6 / 6'), 'Switching topics lost visited locations');
      clean(log); return { visited: await page.locator('#visitedCount').textContent(), snapshot: await snap(page) };
    } finally { await context.close(); }
  });
  await check('03-actual-machine-geometry-progress-and-parameters', async () => {
    const { context, page, log } = await open('mechanisms'); try {
      await mode(page,'process'); const phases=[];
      for (const machine of ['straighten','cut','bend']) { await page.locator(`[data-machine="${machine}"]`).click(); for (const progress of [0,.35,.6,1]) { await range(page,'#progressRange',progress); const s=await snap(page), a=sceneOf(s).process, expected=M.processingState(machine,progress,{lengthMM:2400,angleDeg:90}); assert(a.machine===machine&&close(a.progress,progress), 'Wrong selected machine/progress in scene'); for (const key of ['feed','blade','bendAngleDeg','outputLengthMM']) assert(close(a[key],expected[key]), `${machine} ${progress} ${key} mismatch: ${a[key]} != ${expected[key]}`); assert((await page.locator('#progressValue').textContent()).includes(`${Math.round(progress*100)}%`),'Progress readout stale'); phases.push({machine,progress,phase:a.phase}); } }
      await page.locator('[data-machine="cut"]').click(); await range(page,'#lengthRange',3200); await range(page,'#progressRange',1); let a=sceneOf(await snap(page)).process; assert(a.outputLengthMM===3200&&close(a.geometry.actualLengthM,3.2),'Changing length did not change actual cutting geometry');
      await page.locator('[data-machine="bend"]').click(); await range(page,'#angleRange',135); await range(page,'#progressRange',1); a=sceneOf(await snap(page)).process; assert(close(a.bendAngleDeg,135),'Changing angle did not change actual bending geometry'); assert(close(a.geometry.totalLength,3.2),'Changed length not preserved by bend geometry');
      clean(log); await shot(page,'02-bend-mechanism'); return {phases,changed:a};
    } finally { await context.close(); }
  });
  await check('04-play-pause-step-reset-and-reduced-motion', async () => {
    const { context,page,log }=await open('motion'); try {
      await mode(page,'process'); const first=stateOf(await snap(page)).progress; await page.waitForTimeout(200); assert(close(stateOf(await snap(page)).progress,first),'Animation auto-started under reduced motion');
      await page.locator('#playBtn').click(); await page.waitForTimeout(450); await page.locator('#playBtn').click(); const paused=stateOf(await snap(page)).progress; assert(paused>first,'Explicit playback failed'); await page.waitForTimeout(220); assert(close(stateOf(await snap(page)).progress,paused),'Pause failed');
      await page.locator('#stepBtn').click(); const stepped=stateOf(await snap(page)).progress; assert(close(stepped,Math.min(1,paused+.1),.011),'Single step is not +10%');
      await page.locator('#resetProcess').click(); assert(close(stateOf(await snap(page)).progress,0),'Reset did not return to zero');
      await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);await page.locator('#playBtn').click();const reducedStep=stateOf(await snap(page)).progress;assert(close(reducedStep,.1),'Reduced-motion play control did not become a single step');await page.waitForTimeout(220);assert(close(stateOf(await snap(page)).progress,reducedStep),'Reduced-motion step continued automatically');clean(log); return {first,paused,stepped,reducedStep};
    } finally { await context.close(); }
  });
  await check('05-real-hole-layer-separation-centre-spacing-cover', async () => {
    const {context,page,log}=await open('geometry');try {
      const scene=sceneOf(await snap(page)); assert(scene.barSegments.length>40,'Missing bar geometry evidence');
      for(const segment of scene.barSegments){assert(!crossesInterior(segment.a,segment.b,scene.opening),'Steel rod crosses opening');assert(!crossesInterior(segment.a,segment.b,scene.column),'Steel rod crosses column footprint');assert(close(segment.a[2],segment.b[2]),'Floor rod is not horizontal');}
      assert(close(scene.lowerCentreZ,.65)&&close(scene.upperCentreZ,.666)&&close(scene.barDiameter,.016),'Layer elevations/diameter mismatch'); assert(scene.upperCentreZ-scene.lowerCentreZ>=scene.barDiameter-1e-8,'Top and bottom rods intersect');
      const horizontal=[...new Set(scene.barSegments.filter(s=>s.layer==='lower').map(s=>Number(s.a[1].toFixed(8))))].sort((a,b)=>a-b); for(let i=1;i<horizontal.length;i++)assert(close(horizontal[i]-horizontal[i-1],.4),'Steel centre spacing is not 400 mm');
      assert(close((scene.lowerCentreZ-scene.barDiameter/2-scene.slab.top)*1000,42),'Protection layer is not 42 mm to steel surface'); assert(close(scene.spacerHeight,.042),'Spacer height does not support bar surface');
      const triangles=scene.floorTopTriangles||scene.floorTriangles;assert(triangles?.length>4,'No rendered floor triangles exposed for independent audit');
      const area=triangles.reduce((sum,[a,b,c])=>sum+Math.abs((b[0]-a[0])*(c[1]-a[1])-(c[0]-a[0])*(b[1]-a[1]))/2,0),expectedArea=(scene.slab.maxX-scene.slab.minX)*(scene.slab.maxY-scene.slab.minY)-(scene.opening[2]-scene.opening[0])*(scene.opening[3]-scene.opening[1]);assert(close(area,expectedArea,.0001),'Rendered floor area does not equal slab minus actual opening');
      const contains=(p,t)=>{const[a,b,c]=t;const sign=(p,a,b)=>(p[0]-b[0])*(a[1]-b[1])-(a[0]-b[0])*(p[1]-b[1]);const d=[sign(p,a,b),sign(p,b,c),sign(p,c,a)];return !d.some(v=>v< -1e-9)||!d.some(v=>v>1e-9)};
      for(let x=scene.opening[0]+.05;x<scene.opening[2];x+=.1)for(let y=scene.opening[1]+.05;y<scene.opening[3];y+=.1)assert(!triangles.some(t=>contains([x,y],t)),'Rendered floor triangles cover the hole');
      await page.locator('[data-view="top"]').click(); await page.waitForTimeout(350); await shot(page,'03-top-real-hole'); await page.locator('[data-view="section"]').click();await page.waitForTimeout(350);await shot(page,'04-layer-section');clean(log);return {segments:scene.barSegments.length,horizontalLines:horizontal.length,geometryAudit:scene.geometryAudit,coverMM:42,renderedFloorArea:area,expectedFloorArea:expectedArea};
    }finally{await context.close();}
  });
  await check('06-same-point-base-comparison-camera-does-not-change-data',async()=>{
    const{context,page,log}=await open('surface');try{
      await mode(page,'surface');await page.locator('#comparePoint').click();await page.locator('[data-base=".6"]').click();let a=await snap(page);const textA=await page.locator('#pointDetail').textContent(),statusA=await page.locator('#pointStatus').textContent();await page.locator('#captureBtn').click();
      await page.locator('[data-base="3.2"]').click();let b=await snap(page);const textB=await page.locator('#pointDetail').textContent(),statusB=await page.locator('#pointStatus').textContent();await page.locator('#captureBtn').click();
      const selectedA=a.selectedPoint,selectedB=b.selectedPoint;assert(selectedA&&selectedB&&same(selectedA,selectedB),'Base comparison changed selected physical point');assert(statusA!==statusB,'A/B comparison point classification did not change');
      const countsBefore=sceneOf(b).junctionCounts;await page.locator('#viewport').scrollIntoViewIfNeeded();const rect=await page.locator('#viewport').boundingBox();await page.mouse.move(rect.x+rect.width*.55,rect.y+rect.height*.45);await page.mouse.down();await page.mouse.move(rect.x+rect.width*.64,rect.y+rect.height*.50,{steps:8});await page.mouse.up();await page.waitForTimeout(300);const rotated=await snap(page);assert(same(sceneOf(rotated).junctionCounts,countsBefore),'Camera rotation changed point classification');assert(!same(sceneOf(b).desiredView,sceneOf(rotated).desiredView),'Pointer drag did not rotate actual scene');
      clean(log);await shot(page,'05-surface-base-comparison');return {selectedA,statusA,statusB,textA,textB,countsBefore,records:(await snap(page)).records};
    }finally{await context.close();}
  });
  await check('07-three-error-kinds-zero-and-nonzero',async()=>{
    const{context,page,log}=await open('errors');try{await mode(page,'errors');const comparisons=[];
      for(const[kind,nonzero]of[['short',160],['angle',15],['curve',80]]){await page.locator(`[data-error="${kind}"]`).click();if(kind==='curve')assert(await page.locator('#errorRange').getAttribute('max')==='120','Curve slider lacks 120 mm teaching limit');for(const value of[0,nonzero]){await range(page,'#errorRange',value);const options={shortMM:kind==='short'?value:0,angleErrorDeg:kind==='angle'?value:0,residualMM:kind==='curve'?value:0},expected=M.errorGeometry(kind,options);const text=await page.locator('#deviationValue').textContent(),display=Number(text.replace(/[^0-9.\-]/g,''));assert(close(display,expected.deviationMM,.51),`${kind} value ${value} shown displacement is wrong`);if(!value)assert(expected.deviationMM===0,'Zero error is not zero');const s=await snap(page),actual=sceneOf(s).errorGeometry;assert(pointsClose(actual.design,expected.design)&&pointsClose(actual.actual,expected.actual),'Rendered error geometry does not share model XY coordinates');if(kind==='curve'){const length=actual.actual.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-actual.actual[i][0],p[1]-actual.actual[i][1]),0);assert(close(length*1000,stateOf(s).lengthMM,.00001),'Residual curve created or destroyed stock length');if(value)assert(actual.actual.at(-1)[0]<actual.design.at(-1)[0],'Curved stock projection did not shrink');}comparisons.push({kind,value,display,expected:expected.deviationMM,caption:await page.locator('#errorCaption').textContent()});}}
      assert((await page.locator('#errorControls').textContent()).includes('偏短不必然造成保护层不足'),'Shortage caveat missing');clean(log);await shot(page,'06-error-comparison');return comparisons;
    }finally{await context.close();}
  });
  await check('08-four-quality-methods-wrong-answer-retry',async()=>{
    const{context,page,log}=await open('quality');try{const answers=[];
      for(const issue of M.ISSUES){await page.locator(`[data-issue="${issue.id}"]`).click();if(issue.id==='spacing'){assert(await page.locator('#qualityDiagram').isVisible(),'Spacing illustration hidden');const labels=await page.locator('#qualityDiagram').textContent();assert(labels.includes('400')&&labels.includes('480'),'Independent spacing illustration lacks correct 400/480 values');assert((await page.locator('#qualityMeasure').textContent()).includes('独立量测示例'),'Spacing illustration is mixed with actual 400 mm scene grid');}const wrong=issue.options.find(o=>o.id!==issue.answer),correct=issue.options.find(o=>o.id===issue.answer);await page.locator('#qualityOptions').getByRole('button',{name:wrong.label,exact:true}).click();const bad=await page.locator('#qualityFeedback').textContent();assert(bad.trim().length>12,'Wrong answer gave no learning feedback');await page.locator('#qualityOptions').getByRole('button',{name:correct.label,exact:true}).click();const good=await page.locator('#qualityFeedback').textContent();assert(good!==bad,'Retry did not update feedback');if(issue.id==='loose')assert(/外观|人工接触/.test(good),'Loose tie was accepted by appearance');answers.push({issue:issue.id,bad,good});}
      assert((await page.locator('#qualityCompletion').textContent()).includes('4 / 4'),'All four quality questions not recorded');clean(log);await shot(page,'07-quality-methods');return answers;
    }finally{await context.close();}
  });
  await check('09-real-json-download-independent-parse',async()=>{
    const{context,page,log}=await open('download');try{await page.locator('[data-location="opening"]').click();await page.locator('#captureBtn').click();await mode(page,'surface');await page.locator('#comparePoint').click();for(const base of['.6','3.2']){await page.locator(`[data-base="${base}"]`).click();await page.locator('#captureBtn').click();}await page.locator('#recordBtn').click();const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#exportRecords').click()]);const path=__taskFile("./browser-results/downloaded-experiment.json");await download.saveAs(path);const parsed=JSON.parse(await readFile(path,'utf8'));assert(parsed&&typeof parsed==='object','Downloaded JSON is not an object');const records=parsed.records||parsed.observations;assert(Array.isArray(records)&&records.length===3,'JSON did not preserve exactly three actual records');assert(/教学|teaching|示意/i.test(JSON.stringify(parsed)),'JSON lacks teaching context');clean(log);return {suggestedFilename:download.suggestedFilename(),keys:Object.keys(parsed),records};}finally{await context.close();}
  });
  await check('10-phone-touch-controls-and-zero-overflow',async()=>{
    const{context,page,log}=await open('phone',{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});try{assert((await overflow(page)).overflow<=1,'390 phone horizontal overflow');await page.locator('[data-location="opening"]').tap();assert(await page.locator('#selectionCard').isVisible(),'Phone location selection failed');await mode(page,'process');await visible(page,'#miniProgress');await page.locator('#miniStep').tap();assert(stateOf(await snap(page)).progress>0,'Phone single-step failed');
      await page.locator('#viewport').scrollIntoViewIfNeeded();const b=await page.locator('#viewport').boundingBox(),client=await context.newCDPSession(page);const x=b.x+b.width*.6,y=Math.max(210,b.y+b.height*.47);const tp=(a,c)=>[{x:a,y:c,id:0,radiusX:2,radiusY:2,force:1}];const before=sceneOf(await snap(page)).desiredView;await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:tp(x,y)});await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:tp(x+25,y+15)});await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await client.detach();assert(!same(before,sceneOf(await snap(page)).desiredView),'Touch did not rotate scene');
      assert((await overflow(page)).overflow<=1,'Phone overflow after interactions');clean(log);await shot(page,'08-phone-process');return {layout:await overflow(page),snapshot:await snap(page)};
    }finally{await context.close();}
  });
  await check('11-no-webgl-readable-svg-fallback-and-model',async()=>{
    const{context,page,log}=await open('fallback',{fallback:true});try{assert(await page.locator('#fallback').isVisible(),'Fallback not shown');assert(await page.locator('#fallbackPlan').locator('*').count()>15,'Fallback SVG is empty');await page.locator('[data-location="opening"]').click();assert(await page.locator('#selectionCard').isVisible(),'Fallback location selector failed');await mode(page,'process');await page.locator('[data-machine="bend"]').click();await range(page,'#progressRange',1);assert((await page.locator('#progressValue').textContent()).includes('100%'),'Fallback model progress unavailable');clean(log,true);await shot(page,'09-no-webgl-fallback');return {fallbackChildren:await page.locator('#fallbackPlan').locator('*').count(),snapshot:await snap(page)};}finally{await context.close();}
  });
  await check('12-offscreen-and-hidden-pause-playback',async()=>{
    const{context,page,log}=await open('visibility',{viewport:{width:1440,height:650}});try{await mode(page,'process');await page.locator('#playBtn').click();await page.waitForTimeout(200);await page.locator('footer').scrollIntoViewIfNeeded();await page.waitForFunction(()=>window.__REBAR__.snapshot().visible===false);const offscreen=stateOf(await snap(page)).progress;await page.waitForTimeout(300);assert(close(stateOf(await snap(page)).progress,offscreen),'Offscreen scene continued playback');
      await page.locator('#viewport').scrollIntoViewIfNeeded();await page.waitForTimeout(100);const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setPageVisibilityOverride',{visibilityState:'hidden'}).catch(()=>{});await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(100);const hidden=stateOf(await snap(page)).progress;await page.waitForTimeout(250);assert(close(stateOf(await snap(page)).progress,hidden),'Hidden page continued playback');await cdp.detach();clean(log);return {offscreen,hidden};}finally{await context.close();}
  });
  await check('13-real-robot-pick-does-not-mark-steel-intersection',async()=>{
    const{context,page,log}=await open('robot-picking');try{
      await page.locator('#viewport').scrollIntoViewIfNeeded();await page.waitForTimeout(300);const before=await snap(page);assert(!before.visited.includes('joint'),'Fresh page already visited a steel intersection');
      const local=await page.evaluate(()=>{const s=window.__REBAR__.snapshot();return window.__REBAR__.projectPoint([s.state.base[0],s.state.base[1],.86])}),bounds=await page.locator('#viewport').boundingBox();assert(local?.visible&&bounds,'Robot target cannot be projected');const point={x:bounds.x+local.x,y:bounds.y+local.y};assert(point.x>=0&&point.y>=0&&point.x<page.viewportSize().width&&point.y<page.viewportSize().height,'Robot pick target outside viewport');
      await page.mouse.click(point.x,point.y);const picked=await snap(page);assert(picked.state.selectedId==='robot',`Actual robot click selected ${picked.state.selectedId}`);assert(!picked.visited.includes('joint'),'Clicking robot falsely marked steel intersection as visited');assert(/机器人/.test(await page.locator('#selectionName').textContent()),'Robot click explanation is incorrect');
      await page.locator('#focusSelection').click();await page.waitForTimeout(250);const focused=await snap(page);assert(close(focused.scene.desiredView.tx,focused.state.base[0])&&close(focused.scene.desiredView.ty,focused.state.base[1]),'Robot focus does not follow current base');clean(log);await shot(page,'12-real-robot-selection');return {point,selected:picked.state.selectedId,visited:picked.visited,selectionName:await page.locator('#selectionName').textContent(),focus:focused.scene.desiredView};
    }finally{await context.close();}
  });
} finally { report.finished=new Date().toISOString();report.passed=report.checks.filter(x=>x.pass).length;report.failed=report.checks.filter(x=>!x.pass).length;await writeFile(__taskFile("./browser-results/report.json"),JSON.stringify(report,null,2));await browser.close();console.log(`${report.passed}/${report.checks.length} checks passed. ${__taskFile("./browser-results/report.json")}`);if(report.failed)process.exitCode=1; }

import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {homedir, tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {mkdirSync, mkdtempSync, copyFileSync, writeFileSync, unlinkSync, rmdirSync} from 'node:fs';

const require = createRequire(import.meta.url);
const {chromium} = require(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const taskDir = fileURLToPath(new URL('../',import.meta.url));
const output = join(taskDir,'qa/unified-2026-10-22');
mkdirSync(output,{recursive:true});
const standaloneDir = mkdtempSync(join(tmpdir(),'helmet-unified-'));
const standalone = join(standaloneDir,'课堂.html');
copyFileSync(join(taskDir,'index.html'),standalone);
const report = {tests:[], errors:[], requests:[], dimensions:[]};
const browser = await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--do-not-de-elevate']});
const context = await browser.newContext({viewport:{width:1440,height:810},deviceScaleFactor:1});
const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.message));
page.on('request', request => {if(!/^(file:|data:|about:)/.test(request.url())) report.requests.push(request.url());});
const url = (name='index.html', suffix='') => pathToFileURL(join(taskDir,name)).href + suffix;
const frame = key => page.frameLocator('#frame-'+key);
const state = key => page.evaluate(key => {
  const win=document.getElementById('frame-'+key).contentWindow;
  return key==='annotation'?win.helmetAnnotationState():key==='predict'?win.helmetPredictionState():win.helmetEvaluationState();
}, key);
async function select(key) {
  await page.locator('#tab-'+key).click();
  await page.waitForFunction(key => document.getElementById('frame-'+key).dataset.ready==='true',key);
}
async function check(name, action) {
  try {await action();report.tests.push({name,pass:true});console.log('PASS '+name);}
  catch(error) {report.tests.push({name,pass:false,error:error.stack});console.log('FAIL '+name+' '+error.message);}
}
async function sizeCheck(key,width,height) {
  await page.setViewportSize({width,height});
  await select(key);
  const size=await page.evaluate(key => {
    const shell=document.getElementById('lesson-shell').getBoundingClientRect();
    const f=document.getElementById('frame-'+key),d=f.contentDocument;
    return {key,viewport:[innerWidth,innerHeight],shell:{x:shell.x,y:shell.y,w:shell.width,h:shell.height},inner:[d.documentElement.clientWidth,d.documentElement.clientHeight,d.documentElement.scrollWidth,d.documentElement.scrollHeight],outer:[document.documentElement.scrollWidth,document.documentElement.scrollHeight]};
  },key);
  report.dimensions.push(size);
  assert.ok(Math.abs(size.shell.w/size.shell.h-16/9)<.001);
  assert.ok(size.shell.x>=-.1 && size.shell.y>=-.1 && size.shell.x+size.shell.w<=width+.1 && size.shell.y+size.shell.h<=height+.1);
  assert.deepEqual(size.inner,[1440,712,1440,712]);
  assert.deepEqual(size.outer,[width,height]);
}
try {
  await page.goto(pathToFileURL(standalone).href);
  await check('单文件副本无需同目录素材，三个实验都能离线加载',async()=>{
    for(const key of ['annotation','predict','evaluate']) {await select(key);assert.ok(await state(key));}
    assert.equal(report.requests.length,0);
  });
  for(const key of ['annotation','predict','evaluate']) await check(key+' 桌面16:9与无溢出',async()=>{
    await sizeCheck(key,1440,810);
    await page.screenshot({path:join(output,key+'-1440.png')});
  });
  await check('标注缩放后的鼠标绘框、撤销、跨实验状态保留',async()=>{
    await page.setViewportSize({width:1280,height:720});
    await select('annotation');
    const before=await state('annotation');
    await frame('annotation').locator('#drawTool').click();
    const rect=await frame('annotation').locator('#annotationSvg').boundingBox();
    await page.mouse.move(rect.x+rect.width*.08,rect.y+rect.height*.38);
    await page.mouse.down();
    await page.mouse.move(rect.x+rect.width*.18,rect.y+rect.height*.49,{steps:8});
    await page.mouse.up();
    const after=await state('annotation');
    assert.equal(after.boxes.length,before.boxes.length+1);
    assert.ok(Math.abs(after.boxes.at(-1).bbox[0]-51.2)<2);
    await select('predict');await select('annotation');
    assert.deepEqual((await state('annotation')).boxes,after.boxes);
    await frame('annotation').locator('#undoBtn').click();
    assert.deepEqual((await state('annotation')).boxes,before.boxes);
  });
  await check('知识抽屉不会触发背景标注快捷键，Escape正常返回',async()=>{
    const before=await state('annotation');
    await frame('annotation').locator('.ws-knowledge-open').click();
    await page.keyboard.press('Delete');await page.keyboard.press('ArrowRight');await page.keyboard.press('r');
    assert.deepEqual((await state('annotation')).boxes,before.boxes);
    assert.equal((await state('annotation')).tool,before.tool);
    await page.keyboard.press('Escape');
    assert.equal(await frame('annotation').locator('.ws-knowledge-overlay').isVisible(),false);
  });
  await check('标注放大标签不变、宽幅样本可切换、草稿可下载',async()=>{
    const before=await state('annotation');
    await frame('annotation').locator('#zoom').selectOption('2');
    assert.equal((await state('annotation')).line,before.line);
    await frame('annotation').locator('#zoom').selectOption('1');
    await frame('annotation').locator('#imageSelect').selectOption('wide');
    assert.equal((await state('annotation')).width,960);
    await frame('annotation').locator('#imageSelect').selectOption('clear');
    await frame('annotation').locator('.ws-export-shortcut').click();
    const downloadPromise=page.waitForEvent('download');
    await frame('annotation').locator('#exportDraft').click();
    const download=await downloadPromise;
    await download.saveAs(join(output,'annotation-draft.zip'));
    assert.equal(await download.failure(),null);
  });
  await check('预测0.50保留3个，抽屉下一步携带阈值进入评估',async()=>{
    await select('predict');
    await frame('predict').locator('[data-prediction-threshold="0.50"]').click();
    assert.equal((await state('predict')).kept,3);
    await frame('predict').locator('.ws-knowledge-open').click();
    await frame('predict').locator('#prediction-next-evaluation').click();
    await page.waitForFunction(()=>document.getElementById('tab-evaluate').getAttribute('aria-selected')==='true');
    await page.waitForFunction(()=>document.getElementById('frame-evaluate').contentWindow.helmetEvaluationState().threshold===.5);
    const s=await state('evaluate');
    assert.deepEqual([s.tp,s.fp,s.fn],[3,0,2]);
    assert.match(page.url(),/#evaluate\?threshold=0.50$/);
  });
  await check('评估独立核验、指标隐藏和IoU练习可达',async()=>{
    await frame('evaluate').locator('.ws-knowledge-open').click();
    await frame('evaluate').locator('#evaluation-start-challenge').click();
    assert.equal((await state('evaluate')).blind,true);
    await frame('evaluate').locator('#challenge-tp').fill('3');
    await frame('evaluate').locator('#challenge-fp').fill('0');
    await frame('evaluate').locator('#challenge-fn').fill('2');
    await frame('evaluate').locator('#evaluation-challenge-form button[type=submit]').click();
    assert.equal((await state('evaluate')).blind,false);
    assert.match(await frame('evaluate').locator('#evaluation-challenge-feedback').textContent(),/核验通过/);
    await frame('evaluate').locator('#iou-offset').fill('100');
    assert.equal((await state('evaluate')).iouDemo.iou,0);
    await frame('evaluate').locator('.ws-knowledge-close').click();
  });
  for(const [width,height] of [[1366,768],[1920,1080],[390,844],[844,390]]) await check(`${width}×${height} 三个实验均保持16:9且完整可见`,async()=>{
    for(const key of ['annotation','predict','evaluate']) await sizeCheck(key,width,height);
    if(width===390 || width===844) await page.screenshot({path:join(output,`evaluate-${width}.png`)});
  });
  await check('旧入口和深链接仍可进入全部实验并传递初始阈值',async()=>{
    await page.setViewportSize({width:1440,height:810});
    for(const [name,key,suffix] of [['predict.html','predict','?threshold=0.50'],['evaluate.html','evaluate','?threshold=1'],['index.html','evaluate','#evaluate?threshold=0.50']]) {
      await page.goto(url(name,suffix));
      await page.waitForFunction(key=>document.getElementById('frame-'+key).dataset.ready==='true',key);
      await page.waitForFunction(({key,value})=>{const w=document.getElementById('frame-'+key).contentWindow;return (key==='predict'?w.helmetPredictionState():w.helmetEvaluationState()).threshold===value;},{key,value:suffix.includes('=1')?1:.5});
      await select('annotation');assert.equal((await state('annotation')).width,640);
    }
  });
  await check('全屏进入与退出',async()=>{
    await page.locator('#fullscreen-button').click();
    await page.waitForFunction(()=>Boolean(document.fullscreenElement));
    await page.locator('#fullscreen-button').click();
    await page.waitForFunction(()=>!document.fullscreenElement);
  });
  await check('页面无运行异常和外部请求',async()=>{assert.deepEqual(report.errors,[]);assert.deepEqual(report.requests,[]);});
} finally {
  await browser.close();
  writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2));
  unlinkSync(standalone);rmdirSync(standaloneDir);
}
if(report.tests.some(test=>!test.pass)) process.exitCode=1;
console.log(JSON.stringify({passed:report.tests.filter(test=>test.pass).length,total:report.tests.length,errors:report.errors}));

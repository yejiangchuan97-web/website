/** Reproducible Three.js geometry, deterministic-motion and 4x visual checks.
 * Run: node 任务5-2_钢筋绑扎机器人操作与人工复核/qa/hero-scene.mjs
 * Uses source modules directly; no generated index or .local fixture is required.
 * This is a mesh/kinematic audit, not an Anatomy native SVG-order audit.
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import * as HG from '../src/hero/model.mjs';

const task=resolve(dirname(fileURLToPath(import.meta.url)),'..'),repo=resolve(task,'..'),output=join(task,'qa','hero-shots');
await mkdir(output,{recursive:true});
const require=createRequire(import.meta.url);
let playwright;try{playwright=require('playwright');}catch{playwright=require(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const executablePath=process.env.CHROME_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser=await playwright.chromium.launch({executablePath,headless:true,args:['--do-not-de-elevate','--allow-file-access-from-files']});
const page=await browser.newPage({viewport:{width:1100,height:760},deviceScaleFactor:1});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
try{
  await page.setContent('<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:100%;height:100%;background:#f3f0e8}#scene{width:100vw;height:100vh}</style><div id="scene"></div>');
  await page.addScriptTag({path:join(repo,'公共资源','vendor','three-r160.min.js')});
  const source=await readFile(join(task,'src','hero','model.mjs'),'utf8');
  await page.addScriptTag({content:source.replace(/\bexport\s+/g,'')+`\nwindow.HG={${Object.keys(HG).join(',')}};`});
  await page.addScriptTag({path:join(task,'src','hero','scene.js')});
  await page.evaluate(()=>{window.hero=TyingHeroScene.create(document.getElementById('scene'));window.testPoints=HG.POINTS.map(p=>({...p,tied:false,quality:'missing'}));hero.update({points:testPoints,aim:testPoints[0],selected:'A',reduced:true});hero.render(1/60);});
  const result=await page.evaluate(()=>{
    const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);let endpointError=0,lengthError=0,minWireClearance=Infinity,poseCount=0;
    const phases=[0,.1,.2,.3,.4,.45,.5,.6,.66,.705,.76,.8,.9,1];
    for(const p of testPoints)for(const cycle of phases){
      hero.update({stage:'study',aim:p,busy:{kind:'study',id:p.id},selected:p.id,cycle,reduced:true});hero.render(1/60);const s=hero.getState();poseCount++;
      endpointError=Math.max(endpointError,distance(s.positions.head,{x:p.x,y:s.actual.y,z:p.z}));
      lengthError=Math.max(lengthError,Math.abs(distance(s.positions.shoulder,s.positions.elbow)-1.25),Math.abs(distance(s.positions.elbow,s.positions.wrist)-1.2));
      if(s.diagnostics.wireBarClearance!==null)minWireClearance=Math.min(minWireClearance,s.diagnostics.wireBarClearance);
    }
    hero.update({stage:'study',aim:testPoints[0],selected:'A',busy:{kind:'study',id:'A'},cycle:.51,jammed:true,reduced:true});hero.setCamera('tool');hero.setCutaway(true);for(let i=0;i<10;i++)hero.render(1/60);
    const before=hero.getState();for(let i=0;i<120;i++)hero.render(1/60);const after=hero.getState();
    const invalidationStart=after.diagnostics.renderedFrames;hero.setTheme(true);hero.render(1/60);hero.resize();hero.render(1/60);hero.setTheme(false);hero.render(1/60);hero.invalidate();hero.render(1/60);const invalidationDraws=hero.getDiagnostics().renderedFrames-invalidationStart;
    hero.update({stage:'review',aim:{x:0,z:0},selected:'C',busy:{kind:'pull',id:'C'},inspection:.5,cycle:0,jammed:false,reduced:true,points:testPoints.map(p=>({...p,tied:p.id!=='B',quality:p.id==='C'?'loose':p.id==='B'?'missing':'normal'}))});hero.setCamera('tool');hero.render(1/60);
    return{poseCount,endpointError,lengthError,minWireClearance,paused:{before:before.mechanism,after:after.mechanism,draws:after.diagnostics.renderedFrames-before.diagnostics.renderedFrames,skipped:after.diagnostics.skippedFrames-before.diagnostics.skippedFrames},invalidationDraws,review:hero.getState(),partCount:after.diagnostics.partCount,threeRevision:THREE.REVISION};
  });
  // Independently reconstruct the specified diagonal centreline. The renderer's
  // diagnostic is not used as the source of the intended bar/loop dimensions.
  let analyticWireClearance=Infinity;
  for(let i=0;i<20000;i++){const a=i/20000*Math.PI*2,x=Math.cos(a)*.052/Math.SQRT2,y=.698+Math.sin(a)*.041;analyticWireClearance=Math.min(analyticWireClearance,Math.hypot(x,y-.680)-.018-.0025,Math.hypot(x,y-.716)-.018-.0025);}
  const independent={barContactGap:.716-.680-2*.018,analyticWireClearance,conservativeRibClearance:analyticWireClearance-(.0183+.0016-.018)};
  assert.equal(errors.length,0);assert.equal(result.poseCount,56);assert.ok(result.endpointError<1e-12);assert.ok(result.lengthError<1e-12);
  assert.ok(Math.abs(independent.barContactGap)<1e-12);assert.ok(independent.analyticWireClearance>.00249);assert.ok(independent.conservativeRibClearance>0);assert.ok(result.minWireClearance>=independent.analyticWireClearance-.0002);
  assert.deepEqual(result.paused.before,result.paused.after);assert.equal(result.paused.draws,0);assert.equal(result.paused.skipped,120);assert.equal(result.invalidationDraws,4);
  assert.ok(Math.abs(result.paused.before.phase.feed-HG.cycleAt(.51,true).feed)<1e-12);assert.equal(result.review.diagnostics.parkedSettled,true);assert.equal(result.review.camera.look.x,-.5);assert.equal(result.review.camera.look.z,.5);assert.ok(result.partCount>=100&&result.partCount<=150);
  await page.screenshot({path:join(output,'scene-review.png')});
  // Fourfold CSS viewport, DPR 1: these are re-rendered at 4400x3040, not enlarged
  // screenshots. The 1.5 device-pixel-ratio cap remains intact in the product.
  await page.setViewportSize({width:4400,height:3040});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>{hero.resize();hero.update({stage:'tying',aim:testPoints[0],points:testPoints,selected:'A',busy:null,inspection:0,cycle:0,reduced:true});hero.setCamera('overview');hero.setCutaway(false);hero.render(1/60);resolve();})));
  await page.screenshot({path:join(output,'scene-hero-4x.png')});
  await page.evaluate(()=>{hero.update({stage:'study',aim:testPoints[0],busy:{kind:'study',id:'A'},cycle:.79,reduced:true});hero.setCamera('tool');hero.setCutaway(true);hero.render(1/60);});
  await page.screenshot({path:join(output,'scene-tool-4x.png')});
  const report={pass:true,checkedAt:new Date().toISOString(),errors,independent,...result,scope:'56 actual hierarchical poses; independent bar/loop clearance; deterministic pause; idle draw suppression; invalidation; review target. No native Anatomy SVG audit or full arbitrary mesh collision proof is claimed.',screenshots:['scene-review.png','scene-hero-4x.png','scene-tool-4x.png']};
  await writeFile(join(output,'scene-report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({pass:true,poseCount:result.poseCount,partCount:result.partCount,endpointError:result.endpointError,lengthError:result.lengthError,analyticWireClearance,meshWireClearance:result.minWireClearance,pausedDraws:result.paused.draws,output},null,2));
  await page.evaluate(()=>hero.dispose());
}finally{await browser.close();}

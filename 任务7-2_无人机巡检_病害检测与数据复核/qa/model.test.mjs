import test from 'node:test';
import assert from 'node:assert/strict';
import {CELLS,CAMERA,CLASSROOM_LIMITS,computeCapture,makeCapture,captureCell,assessDecision,assessManualAnnotation,evaluateMission,assessMeasurement} from '../src/model.mjs';

const good = {distance:6,angle:0,speed:1,shutter:500};
const passMission = () => {
  const captures = CELLS.map((cell,index) => makeCapture(cell.id,good,index+1));
  const reviews = Object.fromEntries(CELLS.map((cell,index) => [cell.id,{decision:cell.correctDecision,reason:'逐区观察并核对构造资料',photoId:captures[index].id}]));
  reviews.B3.manualAnnotation = {x:300,y:180};
  return {captures,reviews,manualMarks:['B3']};
};

test('six distinct facade regions include two false positives and one missed candidate',()=>{
  assert.equal(new Set(CELLS.map(c=>c.id)).size,6);
  assert.equal(CELLS.filter(c=>c.correctDecision==='exclude').length,2);
  assert.equal(CELLS.find(c=>c.id==='B3').aiLabel,null);
  assert.equal(CAMERA.imageWidth / CAMERA.imageHeight,1.5);
});
test('distance, sampling and footprint share one pinhole model',()=>{
  const a=computeCapture(good),b=computeCapture({...good,distance:12});
  assert.ok(Math.abs(a.gsd-1.644736842105263)<1e-10);
  assert.equal(b.gsd,a.gsd*2);
  assert.equal(a.footprintW,9);
  assert.equal(a.footprintH,6);
  assert.equal(a.quality,'good');
  assert.ok(b.issueCodes.includes('detail'));
});
test('nearer is not automatically better: fixed speed increases pixel smear',()=>{
  const near=computeCapture({...good,distance:3});
  assert.equal(near.quality,'poor');
  assert.ok(near.issueCodes.includes('motion'));
  assert.equal(computeCapture({...good,distance:3,shutter:1000}).quality,'good');
  assert.equal(computeCapture({...good,distance:3,speed:0}).blurPx,0);
});
test('oblique capture reports actual wall-normal clearance and coarser worst axis',()=>{
  const a=computeCapture({...good,angle:30});
  assert.ok(Math.abs(a.normalDistance-6*Math.cos(Math.PI/6))<1e-10);
  assert.ok(a.gsd>a.baseGsd);
  assert.ok(a.issueCodes.includes('angle'));
  assert.equal(a.blurPx,computeCapture(good).blurPx);
});
test('classroom quality thresholds include their exact boundary',()=>{
  const boundaryDistance=CLASSROOM_LIMITS.maxGsd*CAMERA.focal*CAMERA.imageWidth/(1000*CAMERA.sensorWidth);
  assert.equal(computeCapture({...good,distance:boundaryDistance,speed:0}).quality,'good');
  assert.equal(computeCapture({...good,distance:boundaryDistance+0.001,speed:0}).quality,'poor');
  assert.equal(computeCapture({...good,angle:25,speed:0}).quality,'good');
  assert.equal(computeCapture({...good,angle:25.01,speed:0}).quality,'poor');
  const speed=CLASSROOM_LIMITS.maxBlurPx*computeCapture(good).baseGsd*good.shutter/1000;
  assert.equal(computeCapture({...good,speed}).quality,'good');
  assert.equal(computeCapture({...good,speed:speed+0.001}).quality,'poor');
});
test('invalid physical inputs never create plausible numeric outputs',()=>{
  for(const params of [{distance:0},{distance:NaN},{angle:90},{speed:-1},{shutter:0}])assert.throws(()=>computeCapture(params),RangeError);
  assert.throws(()=>makeCapture('X1',good,1),RangeError);
  assert.throws(()=>makeCapture('A1',good,0),RangeError);
});
test('capture history appends new independent settings and unique photo identifiers',()=>{
  const params={...good};
  const first=captureCell([],'A1',params,{now:'2026-10-22T10:00:00Z'});
  const original=JSON.stringify(first);
  params.distance=12;
  const second=captureCell(first,'A1',params);
  assert.equal(JSON.stringify(first),original);
  assert.equal(first.length,1);assert.equal(second.length,2);
  assert.equal(second[0].params.distance,6);assert.equal(second[1].params.distance,12);
  assert.equal(second[1].id,'IMG-002');
  assert.equal(first[0].capturedAt,'2026-10-22T10:00:00.000Z');
  assert.throws(()=>captureCell(first,'A2',good,{sequence:1}),RangeError);
});
test('poor image must be recaptured and cannot support dismissal or a final defect label',()=>{
  assert.equal(assessDecision('A3','exclude','poor').correct,false);
  assert.equal(assessDecision('A1','retain','poor').correct,false);
  const recapture=assessDecision('A1','recapture','poor');
  assert.equal(recapture.correct,true);assert.equal(recapture.needsRecapture,true);
  assert.equal(assessDecision('A1','retain',undefined).correct,false);
});
test('high score false positive still requires human exclusion and missed case needs a manual mark',()=>{
  assert.equal(assessDecision('A3','retain','good').correct,false);
  assert.equal(assessDecision('A3','exclude','good').correct,true);
  assert.equal(assessDecision('B3','retain','good',false).correct,false);
  assert.equal(assessDecision('B3','retain','good',true).correct,true);
});
test('empty or merely captured mission cannot be complete',()=>{
  assert.equal(evaluateMission().complete,false);
  assert.equal(evaluateMission().score,0);
  const full=passMission();
  const state=evaluateMission({...full,reviews:{}});
  assert.equal(state.capturedCount,6);assert.equal(state.qualityCount,6);
  assert.equal(state.correctCount,0);assert.equal(state.complete,false);
});
test('all six evidence-based decisions, with manual discovery, finish the exercise',()=>{
  const result=evaluateMission(passMission());
  assert.equal(result.complete,true);assert.equal(result.correctCount,6);
  assert.equal(result.reviewedCount,6);assert.equal(result.missedFound,true);assert.equal(result.score,100);
});
test('reacquisition invalidates review of an older photo instead of silently transferring its verdict',()=>{
  const state=passMission();
  state.captures=captureCell(state.captures,'A1',{...good,distance:5,speed:0.5});
  const result=evaluateMission(state);
  assert.equal(result.complete,false);assert.equal(result.correctCount,5);
  assert.equal(result.results[0].photoLinked,false);
  state.reviews.A1={...state.reviews.A1,photoId:state.captures.at(-1).id};
  assert.equal(evaluateMission(state).complete,true);
});
test('poor new photo, vague rationale, or missing manual discovery prevents a perfect result',()=>{
  const state=passMission();
  state.captures=captureCell(state.captures,'A1',{...good,distance:12});
  state.reviews.A1={decision:'recapture',reason:'画面细节太少需要补拍',photoId:state.captures.at(-1).id};
  let result=evaluateMission(state);
  assert.equal(result.qualityCount,5);assert.equal(result.correctCount,5);assert.equal(result.complete,false);
  const vague=passMission();vague.reviews.A1.reason='看到了';
  assert.equal(evaluateMission(vague).correctCount,5);
  assert.equal(evaluateMission({...passMission(),manualMarks:[]}).complete,false);
});
test('calibrated measurement refuses blurry, subpixel and non-coplanar evidence',()=>{
  const data={referenceMm:100,referencePx:1000,widthPx:4,samePlane:true,sharp:true};
  assert.equal(assessMeasurement(data).value,0.4);
  assert.equal(assessMeasurement({...data,samePlane:false}).value,null);
  assert.equal(assessMeasurement({...data,sharp:false}).value,null);
  assert.equal(assessMeasurement({...data,widthPx:2.99}).value,null);
  assert.equal(assessMeasurement({...data,referencePx:0}).value,null);
  assert.equal(assessMeasurement({...data,widthPx:3}).valid,true);
});

test('manual annotation follows the synthetic crack at different capture distances and angles',()=>{
  for(const params of [{...good},{...good,distance:3,angle:25},{...good,distance:12,angle:50}]){
    const factor=Math.min(1.75,6/params.distance),x=296,y=162;
    const point={x:300+(x-300)*factor*Math.cos(params.angle*Math.PI/180),y:180+(y-180)*factor+(x-300)*params.angle/600};
    const result=assessManualAnnotation('B3',params,point);
    assert.equal(result.valid,true);
    assert.ok(result.distancePx<1e-8);
  }
  assert.equal(assessManualAnnotation('B3',good,{x:300,y:180}).valid,true);
  assert.equal(assessManualAnnotation('B3',good,{x:550,y:70}).valid,false);
});

test('manual annotation rejects missing, nonfinite and out-of-image points',()=>{
  for(const point of [null,{}, {x:NaN,y:180},{x:300,y:Infinity},{x:-1,y:180},{x:300,y:361},{x:null,y:0}]){
    assert.equal(assessManualAnnotation('B3',good,point).valid,false);
  }
  assert.equal(assessManualAnnotation('A1',good,{x:50,y:50}).valid,true);
  assert.equal(assessManualAnnotation('A1',good,{x:601,y:50}).valid,false);
  assert.equal(assessManualAnnotation('X1',good,{x:300,y:180}).valid,false);
});

test('checking the missed-candidate box cannot finish a task without a valid spatial annotation',()=>{
  const missing=passMission();delete missing.reviews.B3.manualAnnotation;
  let result=evaluateMission(missing);
  assert.equal(result.complete,false);assert.equal(result.missedFound,false);
  assert.equal(result.results.find(r=>r.cellId==='B3').annotationValid,false);
  const wrong=passMission();wrong.reviews.B3.manualAnnotation={x:550,y:70};
  result=evaluateMission(wrong);
  assert.equal(result.complete,false);assert.equal(result.correctCount,5);
  assert.equal(evaluateMission(passMission()).complete,true);
});

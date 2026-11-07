import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/hero/model.mjs';
function bound(){const g=M.createGame();for(const p of M.POINTS){M.moveAim(g,p);assert.ok(M.startTie(g,p));M.finishAction(g)}return g}
test('actual pose and settling gate tying; busy tool cannot move',()=>{
 const g=M.createGame();M.moveAim(g,M.POINTS[0]);assert.equal(M.startTie(g,{x:0,z:0}),false);assert.equal(M.startTie(g,M.POINTS[0],false),false);
 assert.ok(M.startTie(g,M.POINTS[0]));assert.equal(M.moveAim(g,M.POINTS[1]),false);M.finishAction(g);assert.equal(M.startTie(g,M.POINTS[0]),false);assert.equal(M.tiedCount(g),1);
});
test('review has explicit separate sample and requires isolation',()=>{
 const g=M.createGame();assert.equal(M.startReview(g),false);const r=bound();assert.ok(M.startReview(r));assert.equal(r.points[1].quality,'missing');assert.equal(M.startPull(r),false);assert.ok(M.isolate(r));assert.ok(M.startPull(r));M.finishAction(r);assert.equal(M.checkedCount(r),1);
});
test('old scene diagnostics cannot bind a different point after a new aim',()=>{
 const g=M.createGame();M.moveAim(g,M.POINTS[1]);assert.equal(M.startTie(g,M.POINTS[0],true),false);assert.equal(g.selected,'B');assert.equal(g.busy,null);
});
test('loose wire needs observation; repair needs another isolation and recheck',()=>{
 const g=bound();M.startReview(g);M.isolate(g);M.selectPoint(g,'C');assert.equal(M.markRepair(g),false);M.startPull(g);M.finishAction(g);assert.ok(M.markRepair(g));assert.ok(M.startRepair(g));assert.equal(M.startPull(g),false);M.finishAction(g);assert.equal(M.checkedCount(g),0);assert.equal(g.isolated,false);M.isolate(g);M.startPull(g);M.finishAction(g);assert.equal(M.checkedCount(g),1);
});
test('all repaired and inspected points finish the challenge',()=>{
 const g=bound();M.startReview(g);M.isolate(g);for(const p of M.POINTS){M.selectPoint(g,p.id);M.startPull(g);M.finishAction(g);if(p.id==='B'||p.id==='C'){M.markRepair(g);M.startRepair(g);M.finishAction(g);M.isolate(g);M.startPull(g);M.finishAction(g)}}assert.equal(g.stage,'done');assert.equal(M.checkedCount(g),4);
});
test('jam cannot reach twist or completion at any requested position',()=>{
 for(let p=0;p<=1.001;p+=.01){const s=M.cycleAt(p,true);assert.ok(s.p<=.51);assert.equal(s.twist,0)}assert.equal(M.cycleAt(1,true).jammed,true);assert.equal(M.cycleAt(1,false).leave,1);
});

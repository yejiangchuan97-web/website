import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as M from '../src/model.mjs';

// Logic-only harness: execute the shipped application and its real event handlers.
// Rendering methods are inert; these tests do not launch or connect to a browser.
const appSource=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
function createLab(){
 const elements=new Map(),listeners=new Map(),frames=new Map();
 const rangeIds=new Set(['errorX','errorY','errorAngle','vacuum','mass','spread','offsetY','targetForce','compression','base']);
 const checkboxIds=new Set(['feedback','isolated','leak','missing']);
 const selectIds=new Set(['visibility','layout','surface','stiffness','mode']);
 let now=1000,nextFrame=1;
 class Element{
  constructor(id='',dataset={}){
   this.id=id;this.dataset=dataset;this.style={};this.attributes={};this.children=[];this.value='';this.checked=false;
   this.type=rangeIds.has(id)?'range':checkboxIds.has(id)?'checkbox':selectIds.has(id)?'select-one':'button';
   this.tagName=rangeIds.has(id)||checkboxIds.has(id)?'INPUT':selectIds.has(id)?'SELECT':'DIV';
   const classes=new Set();this.classList={toggle:(name,force)=>{const active=force??!classes.has(name);active?classes.add(name):classes.delete(name);return active},remove:name=>classes.delete(name),add:name=>classes.add(name)};
  }
  setAttribute(name,value){this.attributes[name]=String(value)}
  toggleAttribute(name,force){if(force??!(name in this.attributes))this.attributes[name]='';else delete this.attributes[name]}
  append(...nodes){this.children.push(...nodes)}
  replaceChildren(...nodes){this.children=nodes}
  addEventListener(){}
  scrollIntoView(){}
 }
 const get=id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id)};
 const tabs=['vision','vacuum','height'].map(tab=>new Element('',{tab}));
 const panels=tabs.map(({dataset})=>new Element('',{panel:dataset.tab}));
 const answers=[0,1].map(answer=>new Element('',{answer:String(answer)}));
 const document={
  hidden:false,body:new Element('body'),documentElement:{requestFullscreen:async()=>{}},
  getElementById:get,createElementNS:()=>new Element(),
  querySelector:selector=>selector==='dialog[open]'?null:selector==='.controls'?get('controlPanel'):null,
  querySelectorAll:selector=>({'[data-tab]':tabs,'[data-panel]':panels,'[data-answer]':answers,'[data-phase]':[],'[data-close]':[]})[selector]||[],
  addEventListener:(name,fn)=>{if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn)}
 };
 const window={setRigPose:()=>{}};
 const context=vm.createContext({M,window,document,matchMedia:()=>({matches:false,addEventListener(){}}),
  requestAnimationFrame:callback=>{const id=nextFrame++;frames.set(id,callback);return id},
  IntersectionObserver:class{observe(){}},console});
 vm.runInContext(appSource,context,{filename:'src/app.js'});
 const emit=(name,event={})=>listeners.get(name)?.forEach(fn=>fn(event));
 const click=id=>{emit('pointerdown');assert.equal(typeof get(id).onclick,'function',`${id} click handler exists`);get(id).onclick()};
 const change=(id,value)=>{const el=get(id);if(el.type==='checkbox')el.checked=value;else el.value=value;const handler=el.type==='range'?el.oninput:el.onchange;assert.equal(typeof handler,'function',`${id} change handler exists`);handler()};
 const advance=milliseconds=>{for(let elapsed=0;elapsed<milliseconds;elapsed+=1000/60){now+=1000/60;const batch=[...frames.values()];frames.clear();for(const callback of batch)callback(now)}};
 return {click,change,advance,snapshot:()=>window.tilingLab.snapshot(),
  tab:name=>{emit('pointerdown');tabs.find(button=>button.dataset.tab===name).onclick()},
  key:key=>emit('keydown',{key,target:{tagName:'DIV'},preventDefault(){}})};
}
function prepareGrip(lab){lab.tab('vacuum');lab.change('layout','quad');assert(lab.snapshot().grip.ready)}
function certify(lab){lab.click('lowLift');lab.advance(2700);assert(!lab.snapshot().lifting);assert(lab.snapshot().trialSignature);assert.equal(lab.snapshot().t,1)}

test('repeated low lift revokes prior certificate and excludes concurrent transfer controls',()=>{
 const lab=createLab();prepareGrip(lab);certify(lab);
 lab.click('lowLift');assert(lab.snapshot().lifting);assert.equal(lab.snapshot().trialSignature,'');
 const before=lab.snapshot().t;lab.click('cyclePlay');assert.equal(lab.snapshot().playing,false);assert(lab.snapshot().lifting);
 lab.click('cycleStep');assert.equal(lab.snapshot().playing,false);assert.equal(lab.snapshot().t,before);
 lab.advance(500);assert(lab.snapshot().lifting);assert.equal(lab.snapshot().playing,false);assert.equal(lab.snapshot().trialSignature,'');
 lab.advance(2300);assert(!lab.snapshot().lifting);assert(lab.snapshot().trialSignature);
});

test('ArrowRight pauses continuous vision, force and transfer before taking one step',async t=>{
 await t.test('vision',()=>{
  const lab=createLab();lab.click('correct');lab.advance(100);assert(lab.snapshot().correcting);
  const before=lab.snapshot().ex;lab.key('ArrowRight');assert(!lab.snapshot().correcting);assert(lab.snapshot().ex<before);
  const stopped=lab.snapshot().ex;lab.advance(200);assert.equal(lab.snapshot().ex,stopped);
 });
 await t.test('force',()=>{
  const lab=createLab();lab.tab('height');lab.click('forcePlay');lab.advance(100);assert(lab.snapshot().pressing);
  const before=lab.snapshot().press.compression;lab.key('ArrowRight');assert(!lab.snapshot().pressing);assert(lab.snapshot().press.compression>before);
  const stopped=lab.snapshot().press.compression;lab.advance(200);assert.equal(lab.snapshot().press.compression,stopped);
 });
 await t.test('transfer',()=>{
  const lab=createLab();prepareGrip(lab);certify(lab);lab.click('cyclePlay');lab.advance(200);assert(lab.snapshot().playing);
  const before=lab.snapshot().t;lab.key('ArrowRight');assert(!lab.snapshot().playing);assert(lab.snapshot().t>before);
  const stopped=lab.snapshot().t;lab.advance(200);assert.equal(lab.snapshot().t,stopped);
 });
});

test('midair leakage requires return, fault repair and a new low lift before transfer',()=>{
 const lab=createLab();prepareGrip(lab);certify(lab);lab.click('cycleStep');lab.click('cyclePlay');lab.advance(200);
 assert(lab.snapshot().t>2&&lab.snapshot().t<4);const inAir=lab.snapshot().t;
 lab.change('leak',true);assert(lab.snapshot().needsReturn);assert(!lab.snapshot().playing);assert(!lab.snapshot().lifting);assert.equal(lab.snapshot().trialSignature,'');
 const locked=lab.snapshot();
 for(const [id,value]of Object.entries({layout:'single',spread:.4,mass:15,offsetY:0,surface:'rough'})){
  lab.change(id,value);const after=lab.snapshot();assert.equal(after.t,locked.t);assert.equal(after.needsReturn,true);
  for(const field of ['layout','spread','mass','offsetY','surface'])assert.equal(after[field],locked[field],`${id} cannot change ${field} while return is required`);
 }
 for(const action of ['lowLift','cyclePlay','cycleStep']){lab.click(action);assert.equal(lab.snapshot().t,inAir);assert(!lab.snapshot().playing);assert(!lab.snapshot().lifting)}
 lab.change('leak',false);assert(lab.snapshot().grip.ready);assert(lab.snapshot().needsReturn);lab.click('lowLift');assert(!lab.snapshot().lifting);
 lab.click('cycleReset');assert.equal(lab.snapshot().t,0);assert(!lab.snapshot().needsReturn);assert.equal(lab.snapshot().trialSignature,'');
 lab.click('cyclePlay');assert(!lab.snapshot().playing);certify(lab);lab.click('cyclePlay');assert(lab.snapshot().playing);
});

const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../../shared/theme.js'), 'utf8');

function boot(storage = new Map(), blocked = false) {
  const events = {}, windowEvents = {}, children = [];
  const element = () => ({dataset:{}, style:{}, closest(){return null;}, classList:{toggle(){},add(){}}, setAttribute(k,v){this[k]=v;}, addEventListener(){}, append(node){children.push(node);}});
  const root=element(), body=element(), host=element();
  const document = {documentElement:root,body,createElement:element,querySelectorAll:()=>[],querySelector:selector=>selector==='header'?host:null,addEventListener:(name,fn)=>{events[name]=fn;}};
  const window = {addEventListener:(name,fn)=>{windowEvents[name]=fn;},dispatchEvent(){}};
  const localStorage={getItem(k){if(blocked)throw Error('storage unavailable');return storage.get(k);},setItem(k,v){if(blocked)throw Error('storage unavailable');storage.set(k,v);}};
  vm.runInNewContext(source,{document,window,localStorage,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}}});
  return {api:window.CourseTheme,ready:events.DOMContentLoaded,external:windowEvents.storage,root,body,children};
}
test('theme persists across pages, updates registered renderers and keyboard button state',()=>{
  const storage=new Map(),a=boot(storage),seen=[];
  a.api.register(theme=>seen.push(theme));
  assert.equal(a.api.get(),'light');assert.deepEqual(seen,[]);
  a.ready();a.api.toggle();assert.deepEqual(seen,['light','dark']);
  assert.equal(a.root.dataset.theme,'dark');assert.equal(a.body.dataset.theme,'dark');assert.equal(a.children[0]['aria-pressed'],'true');
  const b=boot(storage);b.ready();assert.equal(b.api.get(),'dark');
  b.api.set('invalid');assert.equal(b.api.get(),'dark');
  a.external({key:'course-theme',newValue:'light'});assert.equal(a.api.get(),'light');
});
test('blocked storage and late renderer registration still allow reversible switching',()=>{
  const a=boot(new Map(),true);a.ready();a.api.toggle();
  const seen=[],unsubscribe=a.api.register(theme=>seen.push(theme));
  a.api.toggle();unsubscribe();a.api.toggle();
  assert.deepEqual(seen,['dark','light']);assert.equal(a.api.get(),'dark');
});
test('active entries include shared theme assets and no duplicate dark entry is generated',()=>{
  const root=path.resolve(__dirname,'../..');
  const {tasks}=JSON.parse(fs.readFileSync(path.join(root,'course/catalog.json'),'utf8'));
  const entries=['course/home/index.html',...Array.from({length:8},(_,i)=>`course/chapters/${String(i+1).padStart(2,'0')}/overview/index.html`),...tasks.map(task=>task.demo)];
  for(const entry of entries){
    const html=fs.readFileSync(path.join(root,entry),'utf8');
    assert.match(html,/shared\/theme\.js/,entry);assert.match(html,/shared\/styles\/theme\.css/,entry);
    assert(!fs.existsSync(path.join(root,path.dirname(entry),'dark.html')),entry);
  }
});

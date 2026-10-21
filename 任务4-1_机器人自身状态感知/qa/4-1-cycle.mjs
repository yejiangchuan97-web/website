import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';
const {chromium}=createRequire(import.meta.url)(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--do-not-de-elevate','--allow-file-access-from-files']});
const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
try{
 await page.goto(new URL("../index.html",import.meta.url).href);
 const result=await page.evaluate(()=>{
  const source=sortMoving.toString().replace('const available=', 'globalThis.qaEdges=edges.map((e,i)=>({name:info[i].p.name,to:[...e].map(j=>info[j].p.name)}));const available=');
  eval('('+source+')')(liveScene,machineSVG);
  const names=qaEdges.map(e=>e.name),nodes=new Map(qaEdges.map(e=>[e.name,e.to])),cycles=[];
  const stack=[],visited=new Set();
  function visit(name){const at=stack.indexOf(name);if(at>=0){cycles.push([...stack.slice(at),name]);return}if(visited.has(name))return;visited.add(name);stack.push(name);for(const n of nodes.get(name))visit(n);stack.pop()}
  for(const n of names)visit(n);
  return {angle:lessonState().angle,cycles};
 });
 console.log(JSON.stringify(result,null,2));
}finally{await browser.close()}

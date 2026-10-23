import {scene} from "../src/geometry.mjs";
import {cycle} from "../src/model.mjs";
import * as A from "../../公共资源/anatomy/audit.mjs";
import * as k from "../../公共资源/anatomy/iso-kit.mjs";
import {writeFileSync,readFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const layouts=['single','dual','quad'];
const requested=process.argv.find(arg=>arg.startsWith('--layout='))?.split('=')[1];
if(requested&&!layouts.includes(requested))throw Error('Unknown layout '+requested);
const poses=[0,1,1.5,2,2.5,3,3.5,4,5].map(t=>({...cycle(t),label:'cycle '+t}));
poses.push({x:19,y:24,top:40,label:'vision negative'},{x:31,y:36,top:40,label:'vision positive'},{x:25,y:30,top:12.8,label:'raised finish'});
const cacheDir=new URL('./geometry-cache/',import.meta.url);mkdirSync(cacheDir,{recursive:true});
const signature=createHash('sha256').update(readFileSync(new URL('../src/geometry.mjs',import.meta.url))).update(JSON.stringify(poses)).digest('hex');
const allKeys={},allScenes={};
for(const layout of requested?[requested]:layouts){
if(process.argv.includes('--assemble')){
 const prior=JSON.parse(readFileSync(new URL(layout+'.json',cacheDir),'utf8'));
 if(prior.signature!==signature||!prior.audited)throw Error('Audit cache is stale: '+layout);
 allScenes[layout]=prior.scene;allKeys[layout]=prior.keys;continue;
}
console.log('LAYOUT '+layout);
const base=scene({layout}),items=base.R.settled.items,names=new Map(items.map((it,i)=>[it.name,i]));
const pairs=[...base.R.settled.overlaps.pairs],scenes=[base];
for(const p of poses){console.log('Measuring '+layout+' '+p.label);const s=scene({...p,layout});scenes.push(s);for(const pair of s.R.settled.overlaps.pairs)pairs.push({...pair,a:names.get(s.R.settled.items[pair.a].name),b:names.get(s.R.settled.items[pair.b].name)});}
const solved=A.orderKeys(items,{...base.R.settled.overlaps,pairs});
console.log('Combined order: '+solved.cycles.length+' interlocks, '+solved.dropped.length+' dropped rules');
if(solved.cycles.length||solved.dropped.length)throw Error('Motion needs separate depth slots');
const keys=new Map(items.map((it,i)=>[it.name,solved.keys[i]]));
for(let i=0;i<scenes.length;i++){const s=scenes[i];for(const it of s.R.items)it.key=keys.get(it.name);console.log('AUDIT '+(i===0?'initial':poses[i-1].label));A.auditOrExit(s.R,s.P,{argv:['--audit']});}
if(process.exitCode)throw Error('Pose audit failed');
base.R.items.sort((a,b)=>a.key-b.key);
const halo=base.body.slice(0,base.body.indexOf('<g data-part'));
const body=halo+base.R.items.map(it=>`<g data-part="${it.name}" data-group="${it.group}">${it.svg}</g>`).join('');
const svg=k.figureSvg({width:1000,height:580,label:`地砖铺贴机器人教学台：${{single:'单',dual:'双',quad:'四'}[layout]}吸盘末端、相机、力传感器和升降执行器`,body});
allScenes[layout]={P:base.P,svg,count:items.length};allKeys[layout]=Object.fromEntries(keys);
writeFileSync(new URL(layout+'.json',cacheDir),JSON.stringify({signature,audited:true,poses:scenes.length,scene:allScenes[layout],keys:allKeys[layout]}));
console.log(layout+' motion audit passed');
}
if(!requested){
writeFileSync(new URL("../src/scene-cache.json",import.meta.url),JSON.stringify({version:2,scenes:allScenes}));
writeFileSync(new URL("./motion-order.json",import.meta.url),JSON.stringify(allKeys,null,2));
console.log('motion audit passed');
}

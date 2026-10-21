import {scene} from '../../src/tiling/geometry.mjs';
import {cycle} from '../../src/tiling/model.mjs';
import * as A from '../../assets/tiling-anatomy/audit.mjs';
import * as k from '../../assets/tiling-anatomy/iso-kit.mjs';
import {writeFileSync} from 'node:fs';
const base=scene(),items=base.R.settled.items,names=new Map(items.map((it,i)=>[it.name,i]));
const pairs=[...base.R.settled.overlaps.pairs],scenes=[base];
const poses=[0,1,1.5,2,2.5,3,3.5,4,5].map(t=>({...cycle(t),label:'cycle '+t}));
poses.push({x:19,y:24,top:40,label:'vision negative'},{x:31,y:36,top:40,label:'vision positive'},{x:25,y:30,top:12.8,label:'raised finish'});
for(const p of poses){console.log('Measuring '+p.label);const s=scene(p);scenes.push(s);for(const pair of s.R.settled.overlaps.pairs)pairs.push({...pair,a:names.get(s.R.settled.items[pair.a].name),b:names.get(s.R.settled.items[pair.b].name)});}
const solved=A.orderKeys(items,{...base.R.settled.overlaps,pairs});
console.log('Combined order: '+solved.cycles.length+' interlocks, '+solved.dropped.length+' dropped rules');
if(solved.cycles.length||solved.dropped.length)throw Error('Motion needs separate depth slots');
const keys=new Map(items.map((it,i)=>[it.name,solved.keys[i]]));
for(let i=0;i<scenes.length;i++){const s=scenes[i];for(const it of s.R.items)it.key=keys.get(it.name);console.log('AUDIT '+(i===0?'initial':poses[i-1].label));A.auditOrExit(s.R,s.P,{argv:['--audit']});}
if(process.exitCode)throw Error('Pose audit failed');
base.R.items.sort((a,b)=>a.key-b.key);
const halo=base.body.slice(0,base.body.indexOf('<g data-part'));
const body=halo+base.R.items.map(it=>`<g data-part="${it.name}" data-group="${it.group}">${it.svg}</g>`).join('');
const svg=k.figureSvg({width:1000,height:580,label:'地砖铺贴机器人教学台：相机、四吸盘末端、力传感器和升降执行器',body});
writeFileSync(new URL('../../src/tiling/scene-cache.json',import.meta.url),JSON.stringify({P:base.P,svg,count:items.length}));
writeFileSync(new URL('motion-order.json',import.meta.url),JSON.stringify(Object.fromEntries(keys),null,2));
console.log('motion audit passed');

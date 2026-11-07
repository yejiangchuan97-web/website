// Anatomy visual verification. Uses the skill's line checker and capture driver.
import {spawnSync} from 'node:child_process';
import {writeFileSync,mkdirSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {cycle} from '../src/model.mjs';
const here=fileURLToPath(new URL('.',import.meta.url));
const driver=join(homedir(),'.codex/skills/anatomy/scripts/drive.mjs');
const shots=join(here,'geometry');mkdirSync(shots,{recursive:true});
for(const theme of ['light','dark']){
 const actions=[['until','typeof window.setRigPose === "function"'],['wait',250],['eval',`document.body.dataset.theme=${JSON.stringify(theme)}`]];
 for(const layout of ['single','dual','quad']){
  for(const t of [0,1,1.5,2,2.5,3,3.5,4,5]){
   const pose={...cycle(t),layout,y:30,tileY:30};
   actions.push(['eval',`window.setRigPose(${JSON.stringify(pose)}); ${JSON.stringify(theme+' '+layout+' t='+t)}`],['lines',null,'#stage']);
  }
  for(const top of [6,12.8])actions.push(['eval',`window.setRigPose(${JSON.stringify({layout,top,bed:top-4})})`],['lines',null,'#stage']);
  actions.push(['eval',`window.setRigPose(${JSON.stringify({layout,x:25,y:30,top:40})})`],['lines',null,'#stage']);
  actions.push(['shot',join(shots,`${layout}-${theme}-4x.png`),'#stage',4]);
 }
 const path=join(shots,`${theme}-actions.json`);writeFileSync(path,JSON.stringify(actions,null,2));
 const result=spawnSync(process.execPath,[driver,fileURLToPath(new URL('../index.html',import.meta.url)),'--actions',path,'--width','1440','--height','1100','--reduced','--no-webgl'],{stdio:'inherit'});
 if(result.status!==0)process.exit(result.status||1);
}
console.log('geometry line checks passed: 3 layouts × 2 themes × 12 poses');

import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const builds={
  "1-entry": "course/chapters/01/overview/src/build.mjs",
  "1-2": "course/chapters/01/tasks/1-2/src/build.mjs",
  "1-3": "course/chapters/01/tasks/1-3/src/build.mjs",
  "2-entry": "course/chapters/02/overview/src/build.mjs",
  "2-1": "course/chapters/02/tasks/2-1/src/build.mjs",
  "2-2": "course/chapters/02/tasks/2-2/src/build.mjs",
  "2-3": "course/chapters/02/tasks/2-3/src/build.mjs",
  "3-entry": "course/chapters/03/overview/src/build.mjs",
  "3-1": "course/chapters/03/tasks/3-1/src/build.mjs",
  "3-2": "course/chapters/03/tasks/3-2/src/build.mjs",
  "3-3": "course/chapters/03/tasks/3-3/src/rebuild/build.mjs",
  "3-4": "course/chapters/03/tasks/3-4/src/tools.build.mjs",
  "3-5": "course/chapters/03/tasks/3-5/src/mobile.build.mjs",
  "4-entry": "course/chapters/04/overview/src/build.mjs",
  "4-1": "course/chapters/04/tasks/4-1/src/build.mjs",
  "4-2": "course/chapters/04/tasks/4-2/src/build.mjs",
  "4-3": "course/chapters/04/tasks/4-3/src/build.mjs",
  "5-entry": "course/chapters/05/overview/src/build.mjs",
  "5-1": "course/chapters/05/tasks/5-1/src/build.mjs",
  "5-2": "course/chapters/05/tasks/5-2/src/build.mjs",
  "5-3": "course/chapters/05/tasks/5-3/src/build.mjs",
  "6-entry": "course/chapters/06/overview/src/build.mjs",
  "6-1": "course/chapters/06/tasks/6-1/src/build.mjs",
  "6-2": "course/chapters/06/tasks/6-2/src/build.mjs",
  "6-3": "course/chapters/06/tasks/6-3/src/build.mjs",
  "6-4": "course/chapters/06/tasks/6-4/src/build.mjs",
  "7-entry": "course/chapters/07/overview/src/build.mjs",
  "7-1": "course/chapters/07/tasks/7-1/src/build.mjs",
  "7-2": "course/chapters/07/tasks/7-2/src/build.mjs",
  "8-entry": "course/chapters/08/overview/src/build.mjs",
  "8-1": "course/chapters/08/tasks/8-1/src/build.mjs",
  "8-2": "course/chapters/08/tasks/8-2/src/build.mjs",
};
const task=process.argv[2];
if(!task || (task!=='all'&&!/^[1-8]$/.test(task)&&!builds[task])){console.log('用法: node scripts/build.mjs <任务编号|1—8|all>');process.exit(task?1:0)}
for(const id of task==='all'?Object.keys(builds):/^[1-8]$/.test(task)?Object.keys(builds).filter(id=>id.startsWith(task+'-')):[task]){console.log('Building '+id);const result=spawnSync(process.execPath,[fileURLToPath(new URL('../'+builds[id],import.meta.url)),...process.argv.slice(3)],{cwd:root,stdio:'inherit'});if(result.status!==0)process.exit(result.status||1)}
for(const script of ['build-course-cover.py','finalize-pages.py']) {
 const result=spawnSync('python',[fileURLToPath(new URL('./'+script,import.meta.url))],{cwd:root,stdio:'inherit'});
 if(result.status!==0)process.exit(result.status||1);
}

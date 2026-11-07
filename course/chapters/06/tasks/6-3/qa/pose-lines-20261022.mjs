import {writeFileSync} from 'node:fs';
const actions=[];
const poses=[[-6,-4],[-6,4],[6,-4],[6,4],[2,0],[2,2],[0,0]];
for(const theme of ['light','dark']){
  actions.push(['eval',`document.body.dataset.theme='${theme}';document.documentElement.dataset.theme='${theme}'`]);
  for(const [bump,retreat] of poses){
    actions.push(['eval',`Object.assign(sandingLab.state,{bump:${bump},retreat:${retreat},feedback:false});sandingLab.render();'POSE ${bump}/${retreat} ${theme}'`]);
    actions.push(['lines',null,'.rig-art']);
    if((bump===-6&&retreat===4)||(bump===6&&retreat===-4)){
      actions.push(['shot',`qa/pose-closeup-${bump<0?'gap':'compressed'}-${theme}.png`,'.rig-art',4,[390,45,250,220]]);
    }
  }
}
writeFileSync(new URL('pose-lines-20261022.json',import.meta.url),JSON.stringify(actions,null,2));

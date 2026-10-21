// Edge's compatibility relaunch detaches stderr from Anatomy's CDP launcher.
// Keep the documented capture/drive/line checks on the same Edge process.
const cp=require('node:child_process');
const spawn=cp.spawn;
cp.spawn=function(file,args=[],options){
 if(/msedge\.exe$/i.test(file)&&!args.includes('--edge-skip-compat-layer-relaunch'))args=[...args,'--edge-skip-compat-layer-relaunch'];
 return spawn(file,args,options);
};
require('node:module').syncBuiltinESMExports();

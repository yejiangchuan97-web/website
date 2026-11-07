async page=>{
 await page.setViewportSize({width:1414,height:964});
 const report=await page.evaluate(async()=>{
  const get=async name=>new Promise(async(resolve,reject)=>{try{const b=await(await fetch('/artifacts/reports/model-candidates/cet200/'+name)).arrayBuffer();new CourseGLTFLoader().parse(b,'',resolve,reject);}catch(e){reject(e);}});
  const main=await get('cet200.glb'),track=await get('crawler_belt.glb'),T=THREE,box=o=>{o.updateMatrixWorld(true);const b=new T.Box3().setFromObject(o);return{min:b.min.toArray(),max:b.max.toArray()};};
  const report={main:box(main.scene),track:box(track.scene),nodes:[]};
  main.scene.traverse(o=>{if(['TrackFrame','UpperStructure','Wheels_L','Wheels_R'].includes(o.name))report.nodes.push({name:o.name,bounds:box(o),position:o.getWorldPosition(new T.Vector3()).toArray()});if(o.name==='Hidden_Colliders'||o.name==='Hidden')o.visible=false;});
  const wrapper=new T.Group();wrapper.add(main.scene);const b=new T.Box3().setFromObject(main.scene),sz=b.getSize(new T.Vector3()),sc=5/Math.max(sz.x,sz.y,sz.z);wrapper.scale.setScalar(sc);
  Workshop.stage.set({id:'candidate',root:wrapper,parts:[],pose(){},dispose(){}});Workshop.stage.running=false;Workshop.stage.onFrame=()=>{};window.cetCandidate={main,track,wrapper};return report;
 });
 await page.screenshot({path:'artifacts/screenshots/cet200-candidate.png'});return report;
}

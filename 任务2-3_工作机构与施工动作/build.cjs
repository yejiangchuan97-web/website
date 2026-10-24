const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,file),'utf8');
const template=read('src/index.template.html')
 .replace('/*__WORKSHOP_CSS__*/',()=>read('src/workshop.css'))
 .replace('<!--__WORKSHOP_HTML__-->',()=>read('src/workshop.html'))
 .replace('<!--__PHYSICS_HTML__-->',()=>read('src/physics.html'));
const three=read('vendor/three.min.js').replace(/<\/script/gi,'<\\/script');
const app=read('src/app.js')
 .replace('/*__PARTS__*/',()=>read('src/parts.js'))
 .replace('/*__WORKSHOP__*/',()=>read('src/workshop.js'))
 .replace('/*__PHYSICS__*/',()=>read('src/physics.js'));
const html=template.replace('/*__THREE__*/',()=>three).replace('/*__APP__*/',()=>app);
const directory=path.join(__dirname,'dist');
fs.mkdirSync(directory,{recursive:true});
const destination=path.join(directory,'mechanism-classroom.html');
fs.writeFileSync(destination,html,'utf8');
console.log('Built '+destination+' ('+Buffer.byteLength(html)+' bytes)');
const fourbar=read('src/fourbar.template.html')
 .replace('/*__FOURBAR_CSS__*/',()=>read('src/fourbar.css'))
 .replace('/*__THREE__*/',()=>three)
 .replace('/*__KINEMATICS__*/',()=>read('src/fourbar-kinematics.js'))
 .replace('/*__FOURBAR_APP__*/',()=>read('src/fourbar-app.js').replace('/*__TEACHING__*/',()=>read('src/fourbar-teaching.js')));
fs.writeFileSync(path.join(directory,'fourbar-linkage.html'),fourbar,'utf8');
console.log('Built fourbar-linkage.html ('+Buffer.byteLength(fourbar)+' bytes)');

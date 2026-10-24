const fs=require('node:fs'),path=require('node:path');
const integrate=require('../公共资源/动力与工作机构/integrate.cjs');
const read=file=>fs.readFileSync(path.join(__dirname,'diesel-source',file),'utf8');
const safe=code=>code.replace(/<\/script/gi,'<\\/script');
let html=read('index.html')
  .replace('<link rel="stylesheet" href="src/style.css">',()=>'<style>'+read('src/style.css')+'</style>')
  .replace('<script src="src/three.js"></script>',()=>'<script>'+safe(read('src/three.js'))+'</script>')
  .replace('<script src="src/engine-lab.js"></script>',()=>'<script>'+safe(read('src/engine-lab.js'))+'</script>');
fs.writeFileSync(path.join(__dirname,'diesel.html'),integrate(html,'diesel','../'),'utf8');
console.log('Built diesel.html (offline standalone + Chapter 2 navigation)');

import {readFileSync,writeFileSync} from 'node:fs';
for(const name of ['page.html','app.js','state-model.mjs','状态与数据教学规划.md']){const url=new URL('../../src/'+name,import.meta.url);writeFileSync(url,readFileSync(url,'utf8').replaceAll('放大4倍','放大8倍'));}
const file=new URL('browser-03.mjs',import.meta.url);
writeFileSync(file,readFileSync(new URL('browser-02.mjs',import.meta.url),'utf8').replaceAll("page.click('#gravityToggle')","page.click('.gravity-control label')").replaceAll("page.click('#compareToggle')","page.click('.compare-label')"));

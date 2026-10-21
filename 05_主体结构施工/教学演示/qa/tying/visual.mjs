import{createRequire}from'node:module';import{homedir}from'node:os';import{join,dirname}from'node:path';import{fileURLToPath,pathToFileURL}from'node:url';import{mkdirSync,writeFileSync,readFileSync}from'node:fs';import assert from'node:assert/strict';
const here=dirname(fileURLToPath(import.meta.url)),out=join(here,'shots');mkdirSync(out,{recursive:true});
const{LINE_ENDS}=await import(pathToFileURL(join(homedir(),'.agents/skills/anatomy/scripts/line-ends.mjs')));
const{chromium}=createRequire(import.meta.url)(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--do-not-de-elevate','--allow-file-access-from-files']});const lines=[],errors=[];
try{
 const p=await browser.newPage({viewport:{width:1440,height:810},deviceScaleFactor:4,reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));await p.goto(new URL('../../5-2.html',import.meta.url).href);await p.locator('[data-view="structure"]').click();
 for(const theme of['light','dark']){
  await p.evaluate(t=>document.body.dataset.theme=t,theme);
  const result=await p.evaluate(`(${LINE_ENDS})({select:'#structure-view',show:true})`);lines.push({theme,...result});console.log(theme+' line ends: '+result.problems.length+' / '+result.ends);assert.equal(result.problems.length,0,JSON.stringify(result.problems));
  const clip=await p.locator('#iso-model svg').evaluate(el=>{const b=el.getBBox(),m=el.getScreenCTM(),p=new DOMPoint(b.x,b.y).matrixTransform(m),q=new DOMPoint(b.x+b.width,b.y+b.height).matrixTransform(m);return{x:p.x-10,y:p.y-10,width:q.x-p.x+20,height:q.y-p.y+20}});
  await p.screenshot({path:join(out,'structure-4x-'+theme+'.png'),clip});await p.evaluate(()=>document.querySelector('[data-line-ends]')?.remove());
  await p.locator('[data-view="action"]').click();await p.locator('[data-phase="3"]').click();await p.locator('.detail-window').screenshot({path:join(out,'knot-4x-'+theme+'.png')});await p.locator('[data-view="structure"]').click();
 }
 await p.close();
 const page=await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'});await page.goto(new URL('../../5-2.html',import.meta.url).href);await page.locator('[data-phase="3"]').click();await page.screenshot({path:join(out,'desktop-capture.png')});await page.setViewportSize({width:1440,height:810});
 const shots=[];for(const v of[0,.2,.4,.5,.6,.68,.76,1]){await page.evaluate(v=>__TYING__.seek(v),v);const image=await page.locator('#action-view').screenshot();shots.push({v,image:image.toString('base64')});}
 const sheet=await browser.newPage({viewport:{width:1440,height:900}});await sheet.setContent('<html><style>body{margin:0;background:#e7ece5;font:13px Arial;color:#294436;display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:10px}figure{margin:0}figcaption{height:23px}img{display:block;width:100%;height:190px;object-fit:contain;background:#f8faf6}</style>'+shots.map(s=>`<figure><figcaption>教学周期 ${Math.round(s.v*100)}%</figcaption><img src="data:image/png;base64,${s.image}"></figure>`).join('')+'</html>');await sheet.screenshot({path:join(out,'cycle-contact-sheet.png'),fullPage:true});await sheet.close();await page.close();
 writeFileSync(join(here,'visual-report.json'),JSON.stringify({lines,errors,note:'Stock capture/drive browser launcher failed on this host; Playwright executes the unchanged Anatomy LINE_ENDS checker and screenshots instead.'},null,2));assert.equal(errors.length,0);
}finally{await browser.close();}

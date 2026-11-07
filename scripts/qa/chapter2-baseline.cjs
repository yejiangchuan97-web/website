async page => {
  const pages = ['2-1/index.html','2-1/diesel.html','2-2/index.html','2-3/index.html','2-3/fourbar.html'];
  const result = [];
  await page.setViewportSize({width:1600,height:900});
  for (const path of pages) {
    await page.goto('http://127.0.0.1:8765/course/chapters/02/tasks/'+path);
    await page.waitForTimeout(1200);
    await page.screenshot({path:'artifacts/screenshots/chapter2-before-'+path.replaceAll('/','-')+'.png'});
    result.push({path,layout:await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,headings:[...document.querySelectorAll('h1')].map(e=>e.textContent),canvases:[...document.querySelectorAll('canvas')].map(e=>({id:e.id,w:e.clientWidth,h:e.clientHeight}))}))});
  }
  return result;
}

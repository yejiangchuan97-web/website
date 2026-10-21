const task=await taskSpace(7),page=task.page('p1');
console.log(await page.evaluate(()=>{const el=document.querySelector('[data-tilt="-12"]'),r=el.getBoundingClientRect();return{rect:r.toJSON(),hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.outerHTML,dpr:devicePixelRatio};}));
await page.click('@39');
console.log(await page.evaluate(()=>window.__STATE_LAB__.snapshot().state));

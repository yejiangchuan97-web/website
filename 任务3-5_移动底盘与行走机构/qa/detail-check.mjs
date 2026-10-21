import {browser,sleep} from '../../公共资源/机器人构型与运动/src/browser.mjs';
import {fileURLToPath} from 'node:url';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const path=p=>fileURLToPath(new URL(p,import.meta.url)),b=await browser(),checks=[];
try{
 await b.size(1440,900);await b.navigate(path('../index.html'),'!!window.mobileLab');await b.click('[data-type="mecanum"]');await b.click('#wheelCloseup');await b.until('Math.abs(mobileLab.view.view.az-mobileLab.view.goal.az)<.01');await sleep(150);
 const clip=await b.evaluate('(()=>{const v=mobileLab.view,p=v.project(v.model.wheels[1].pivot.getWorldPosition(new THREE.Vector3()).toArray()),r=document.getElementById("viewport").getBoundingClientRect();return{x:r.x+p[0]-125,y:r.y+p[1]-115,width:250,height:230,scale:4}})()');
 await b.shot(path('./shots/course/wheel-4x-light.png'),clip);await b.click('[data-theme-button="dark"]');await sleep(220);await b.shot(path('./shots/course/wheel-4x-dark.png'),clip);checks.push('4x wheel/roller/axle details in both themes');
 await b.click('[data-theme-button="light"]');await b.click('[data-tab="game"]');await b.click('[data-level="0"]');await b.click('#startGame');const point=await b.evaluate('(()=>{const r=document.querySelector("#gamePanel [data-drive=forward]").getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()'),before=await b.evaluate('mobileLab.getState().p.x');
 await b.call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',buttons:1,clickCount:1,...point});await b.until('mobileLab.getState().p.x>'+String(before+.06));await b.call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',buttons:0,clickCount:1,...point});assert.equal(await b.evaluate('mobileLab.getState().command.left'),0);checks.push('actual held pointer drives the vehicle; releasing stops it');
 await b.click('[data-level="2"]');await b.click('#startGame');const turn=await b.evaluate('(()=>{const r=document.querySelector("#gamePanel [data-drive=left]").getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()');await b.call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',buttons:1,clickCount:1,...turn});await b.until('mobileLab.getState().command.steering>=20');await b.call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',buttons:0,clickCount:1,...turn});assert.equal(await b.evaluate('mobileLab.getState().p.yaw'),0);checks.push('holding steering changes front-wheel angle without moving chassis');
 assert.equal(b.errors.length,0);writeFileSync(path('./detail-verification.json'),JSON.stringify({checks,errors:b.errors},null,2));console.log(checks);
}finally{await b.close();}

import assert from 'node:assert/strict';import {scene} from "../src/geometry.mjs";import {orderOf} from "../src/order.mjs";import * as k from "../../公共资源/主体结构施工/assets/anatomy/iso-kit.mjs";import * as A from "../../公共资源/主体结构施工/assets/anatomy/audit.mjs";
for(const t of [0,1.5,2,2.5,3,3.25,3.5,3.75,4,4.5,5,5.5,6,6.999]){
 const s=scene(t,true),order=orderOf(s.bounds,p=>k.iso(p,s.P));for(const item of s.R.settled.items)item.key=order.indexOf(item.name);
 const depth=A.depthOrder(s.R.settled.items,s.P,{overlaps:s.R.settled.overlaps});assert.equal(depth.problems.length,0,JSON.stringify(depth));console.log('runtime separating-plane order passed at '+t);
}


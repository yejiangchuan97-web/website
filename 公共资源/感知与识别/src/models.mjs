export function rotateAt(t,mode='slow'){const duration=mode==='fast'?1:mode==='hold'?2:4,start=1,limit=mode==='hold'?35:90,u=Math.max(0,Math.min(1,(t-start)/duration));return {angle:limit*(u*u*(3-2*u)),omega:t<=start||t>=start+duration?0:limit*6*u*(1-u)/duration,seconds:duration}}
export function gravityAt(angle,include=true){const t=angle*Math.PI/180;return include?[0,9.8*Math.sin(t),9.8*Math.cos(t)]:[0,0,0]}
export const driftAt=(bias,time)=>.5*bias*time*time;
export const yolo=(box,W,H)=>[box.cls,((box.x1+box.x2)/2/W).toFixed(6),((box.y1+box.y2)/2/H).toFixed(6),((box.x2-box.x1)/W).toFixed(6),((box.y2-box.y1)/H).toFixed(6)].join(' ');
export function metrics(truth,pred,correct){return{precision:pred?correct/pred:null,recall:truth?correct/truth:null,fp:pred-correct,fn:truth-correct}}
export const LIGHT_SPEED=299792458;
export const SCAN_POS={A:[-.9,0],B:[.35,-.06]};
export function scanObjects(width=.9){return[
 {id:'北墙',x:-1.4,y:-width/2-.06,w:2.8,d:.06,z0:0,z1:1.2},
 {id:'南墙',x:-1.4,y:width/2,w:2.8,d:.06,z0:0,z1:1.2},
 {id:'端墙',x:1.4,y:-width/2,w:.06,d:width,z0:0,z1:1.2},
 {id:'后墙',x:-1.46,y:-width/2,w:.06,d:width,z0:0,z1:1.2},
 {id:'低垫块',x:-.12,y:-.22,w:.28,d:.24,z0:0,z1:.18},
 {id:'遮挡箱',x:-.45,y:.14,w:.34,d:.16,z0:0,z1:.50},
 {id:'高位横梁',x:.55,y:-width/2,w:.15,d:width,z0:.65,z1:.90},
 {id:'细柱',cx:.82,cy:.18,r:.018,z0:0,z1:1.15}
]}
export function raycast(angle,height=.4,position='A',width=.9){const o=SCAN_POS[position],a=angle*Math.PI/180,dx=Math.cos(a),dy=Math.sin(a);let best=null;for(const obj of scanObjects(width)){if(height<obj.z0-1e-9||height>obj.z1+1e-9)continue;let t=Infinity;if(obj.r){const ox=o[0]-obj.cx,oy=o[1]-obj.cy,b=ox*dx+oy*dy,c=ox*ox+oy*oy-obj.r*obj.r,disc=b*b-c;if(disc>=0){const t0=-b-Math.sqrt(disc),t1=-b+Math.sqrt(disc);t=t0>=0?t0:t1>=0?t1:Infinity}}else{let near=-Infinity,far=Infinity;for(const [origin,dir,from,to] of [[o[0],dx,obj.x,obj.x+obj.w],[o[1],dy,obj.y,obj.y+obj.d]]){if(Math.abs(dir)<1e-10){if(origin<from||origin>to){far=-Infinity;break}}else{const a=(from-origin)/dir,b=(to-origin)/dir;near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b))}}if(far>=Math.max(0,near))t=near>=0?near:far}if(t>=0&&t<20&&(!best||t<best.distance))best={distance:t,point:[o[0]+dx*t,o[1]+dy*t,height],object:obj.id,angle,position,height}}return best}
export function scanAt(step=1,height=.4,position='A',width=.9){return Array.from({length:Math.round(360/step)},(_,i)=>raycast(i*step,height,position,width)).filter(Boolean)}

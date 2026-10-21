/* Static software depth buffer for browsers without WebGL. Draw the same meshes,
   including instanced track pads. No approximate painter's-order triangle sorting. */
(function(root){'use strict';
root.mobileStaticProjection=function(view){
 const T=THREE,w=Math.min(840,view.container.clientWidth),h=Math.max(1,Math.round(w*view.container.clientHeight/view.container.clientWidth));
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.setAttribute('aria-label','当前机构的三维实体投影');
 const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(w,h),depth=new Float32Array(w*h).fill(Infinity),light=new T.Vector3(-.3,-.5,1).normalize();
 const background=new T.Color(view.dark?0x203149:0xf6f8fc);for(let i=0;i<w*h;i++){pixels.data[i*4]=background.r*255;pixels.data[i*4+1]=background.g*255;pixels.data[i*4+2]=background.b*255;pixels.data[i*4+3]=255;}
 const clip=(poly,z,less)=>{const result=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],insideA=less?a.z<=z:a.z>=z,insideB=less?b.z<=z:b.z>=z;if(insideA)result.push(a);if(insideA!==insideB)result.push(a.clone().lerp(b,(z-a.z)/(b.z-a.z)));}return result;};
 function triangle(a,b,c,color){const D=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(D)<1e-9)return;const x0=Math.max(0,Math.floor(Math.min(a.x,b.x,c.x))),x1=Math.min(w-1,Math.ceil(Math.max(a.x,b.x,c.x))),y0=Math.max(0,Math.floor(Math.min(a.y,b.y,c.y))),y1=Math.min(h-1,Math.ceil(Math.max(a.y,b.y,c.y)));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const px=x+.5,py=y+.5,u=((b.y-c.y)*(px-c.x)+(c.x-b.x)*(py-c.y))/D,v=((c.y-a.y)*(px-c.x)+(a.x-c.x)*(py-c.y))/D,q=1-u-v;if(u<0||v<0||q<0)continue;const z=u*a.z+v*b.z+q*c.z,k=y*w+x;if(z>=depth[k])continue;depth[k]=z;pixels.data[k*4]=color[0];pixels.data[k*4+1]=color[1];pixels.data[k*4+2]=color[2];}
 }
 view.scene.traverse(mesh=>{if(!mesh.isMesh||!mesh.geometry?.attributes.position||mesh.material.isShadowMaterial||(mesh.material.transparent&&mesh.material.opacity<.4))return;for(let p=mesh;p;p=p.parent)if(!p.visible)return;const pos=mesh.geometry.attributes.position,index=mesh.geometry.index,count=index?index.count:pos.count,instances=mesh.isInstancedMesh?mesh.count:1;
  for(let n=0;n<instances;n++){let matrix=mesh.matrixWorld;if(mesh.isInstancedMesh){const instance=new T.Matrix4();mesh.getMatrixAt(n,instance);matrix=mesh.matrixWorld.clone().multiply(instance);}for(let i=0;i<count;i+=3){const world=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(pos,index?index.getX(i+j):i+j).applyMatrix4(matrix)),normal=world[1].clone().sub(world[0]).cross(world[2].clone().sub(world[0])).normalize();if(normal.dot(view.camera.position.clone().sub(world[0]))<=0)continue;
   const color=(mesh.material.color||new T.Color(0x94adc7)).clone().multiplyScalar(.38+.62*Math.max(0,normal.dot(light))).convertLinearToSRGB(),rgb=[color.r*255,color.g*255,color.b*255];let poly=world.map(p=>p.applyMatrix4(view.camera.matrixWorldInverse));poly=clip(poly,-view.camera.near,true);poly=clip(poly,-view.camera.far,false);const projected=poly.map(p=>{p.applyMatrix4(view.camera.projectionMatrix);return{x:(p.x+1)*w/2,y:(1-p.y)*h/2,z:p.z};});for(let j=1;j<projected.length-1;j++)triangle(projected[0],projected[j],projected[j+1],rgb);
  }}
 });
 ctx.putImageData(pixels,0,0);const el=document.getElementById('mobileFallback');el.hidden=false;el.replaceChildren(canvas);const note=document.createElement('div');note.className='fallback-info';note.textContent='三维加速不可用 · 保留实体投影，可切换构型与视角。';el.append(note);
};
})(window);

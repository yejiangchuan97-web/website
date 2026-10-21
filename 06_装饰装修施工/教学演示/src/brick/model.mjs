export const PHASES=['接近取砖','夹紧确认','垂直抬升','越墙平移','垂直落砖','支承后松夹','向上退出'];
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
export function cycle(t){
 t=clamp(t,0,6.999);const i=Math.floor(t),u=ease(t-i);
 let x=-190,z=12,open=5,held=false,placed=false;
 if(i===1)open=5*(1-u);
 if(i===2){open=0;z=12+83*u;held=true;}
 if(i===3){open=0;z=95;x=-190+315*u;held=true;}
 if(i===4){open=0;z=95-63*u;x=125;held=true;}
 if(i===5){open=5*u;z=32;x=125;placed=true;}
 if(i===6){open=5;z=32+63*u;x=125;placed=true;}
 return {t,i,x,z,open,held,placed,brickX:held?x:placed?125:-190,brickZ:held?z:placed?32:12,phase:PHASES[i]};
}
export function bond(offset){
 const pitch=250,width=1240,bricks=[];
 for(let i=-1;i<6;i++){const a=Math.max(0,i*pitch+offset),b=Math.min(width,i*pitch+offset+240);if(b>a)bricks.push({x:a,w:b-a,cut:b-a<239.99});}
 const shift=((offset%pitch)+pitch)%pitch;
 return {bricks,offset,overlap:Math.min(shift,pitch-shift),aligned:shift===0,cuts:bricks.filter(b=>b.cut).length};
}
export function contact(m,h,soft){
 const interference=Math.max(0,m-h),retreat=soft?Math.min(4,20*interference/30):0;
 const gap=h+retreat,force=20*Math.max(0,m-gap),air=Math.max(0,gap-m);
 return {m,h,soft,interference,retreat,gap,force,air,limited:soft&&retreat>=4};
}

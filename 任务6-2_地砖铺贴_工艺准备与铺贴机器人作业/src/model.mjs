export const SETTINGS={cups:4,diameter:.08,mass:12,gravity:9.81,acceleration:1,safety:2,targetHeight:14,tileThickness:10,initialGlue:6,stiffness:80,visionTolerance:.5};
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
export function suction(vacuum=60,mass=12,leak=false){
 const cups=leak?3:4,area=cups*Math.PI*(SETTINGS.diameter/2)**2;
 const holding=vacuum*1000*area,required=SETTINGS.safety*mass*(SETTINGS.gravity+SETTINGS.acceleration);
 return {cups,area,holding,required,ratio:holding/required,ready:holding>=required};
}
export function visionStep(ex,ey,enabled,visible,dt){const f=enabled&&visible?Math.exp(-1.3*dt):1;return {ex:ex*f,ey:ey*f}}
export function level(base=0,compression=2){const glue=SETTINGS.initialGlue-compression,force=SETTINGS.stiffness*compression,finish=base+glue+SETTINGS.tileThickness;return {base,glue,force,finish,error:finish-SETTINGS.targetHeight}}
export function cycle(t){
 t=clamp(t,0,5);let x=-90,top=16,tileTop=16,phase=Math.min(4,Math.floor(t));
 if(t<1)top=42-26*smooth(t);
 else if(t<2)top=16+34*smooth(t-1);
 else if(t<3){x=-90+115*smooth(t-2);top=50}
 else if(t<4){x=25;top=50-42*smooth(t-3)}
 else {x=25;top=8+34*smooth(t-4)}
 if(t>=1&&t<4)tileTop=top;else if(t>=4)tileTop=8;
 return {x,top,tileX:t<1?-90:t>=4?25:x,tileTop,phase,attached:t>=1&&t<4};
}

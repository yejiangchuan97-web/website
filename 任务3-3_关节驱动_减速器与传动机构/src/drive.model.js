/* Kinematic teaching models; radians and seconds. No motor tuning or efficiency claim. */
(function(root){'use strict';const TAU=Math.PI*2;
function planetary(input){const carrier=input/4;return {sun:input,carrier,ring:0,planets:Array.from({length:4},(_,i)=>({orbit:carrier+i*Math.PI/2,spin:-input/2+i*Math.PI/2+Math.PI/20})),ratio:4};}
function harmonic(input){return {wave:input,output:-input/100,ratio:-100,circularTeeth:202,flexTeeth:200};}
function screw(input,lead=8){return input/TAU*lead;}
function servoStep(s,target,load,closed,dt){const error=target-s.actual,u=closed?Math.max(-130,Math.min(130,9*error-4*s.velocity)):0,acc=u-2*s.velocity-load;const v=s.velocity+acc*dt;return {actual:s.actual+v*dt,velocity:v,effort:u,error};}
root.DriveModel={TAU,planetary,harmonic,screw,servoStep};if(typeof module!=='undefined')module.exports=root.DriveModel;
})(typeof window==='undefined'?globalThis:window);

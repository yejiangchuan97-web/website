/* Pure observation state. A view or an exhibition visit is never a score. */
(function(g){
 'use strict';const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a));
 function initial(id='',duration=8){return{selected:id,duration,time:0,playing:false,speed:1,explode:0,part:null,manual:{},clip:0,view:'solid',tour:false};}
 function reduce(s,a){switch(a.type){
  case'item':return initial(a.id,a.duration);
  case'play':return s.explode>0?s:{...s,playing:!s.playing,manual:{},tour:false};
  case'time':return s.explode>0?s:{...s,time:clamp(a.value,0,s.duration),playing:false,manual:{},tour:false};
  case'step':return s.explode>0?s:{...s,time:Math.min(s.duration,s.time+.2),playing:false,manual:{},tour:false};
  case'tick':return s.playing?{...s,time:(s.time+clamp(a.dt,0,.1)*s.speed)%s.duration}:s;
  case'manual':return s.explode>0?s:{...s,manual:{...s.manual,...a.values},playing:false,tour:false};
  case'explode':return{...s,explode:clamp(a.value,0,1),playing:false,tour:false};
  case'clip':return{...s,clip:a.index,duration:a.duration,time:0,playing:false,manual:{},tour:false};
  case'part':return{...s,part:a.id,tour:false};
  case'speed':return{...s,speed:clamp(a.value,.25,1)};
  case'view':return{...s,view:a.value};
  case'tour':return{...s,tour:!s.tour};
  case'reset':return initial(s.selected,s.duration);
  default:return s;
 }}
 const api={initial,reduce};g.HeroObservation=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);

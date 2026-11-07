(function(g){
 'use strict';
 const initial=()=>({station:'pump',cell:0,pumped:Array(9).fill(0),vibration:Array(9).fill(0),level:Array(9).fill(null),surface:[18,-12,24,-20,15,-8,27,-16,12],datum:0,feedback:true,inserted:false,strokes:0,scenario:'连续作业案例',message:'选择楼面分区，单步或连续泵送。',error:false});
 function reduce(state,event){const s=JSON.parse(JSON.stringify(state));s.error=false;const fail=message=>({...s,error:true,message});const i=s.cell;
  if(event.type==='reset')return initial();
  if(event.type==='station'){s.station=event.value;s.inserted=false;s.message='当前工位：'+({pump:'泵送与布料',vibrate:'人工振捣协同',level:'激光整平反馈'}[s.station]);}
  if(event.type==='cell'){s.cell=event.value;s.inserted=false;s.message='已选择分区 '+label(s.cell)+'。';}
  if(event.type==='pump'){s.strokes++;s.pumped[i]=Math.min(1,s.pumped[i]+1/3);s.message=s.pumped[i]>=.999?'该分区设定布料已完成，可继续其他分区或观察振捣。':'物料从输送管进入该分区，继续观察分布变化。';}
  if(event.type==='insert'){if(s.pumped[i]<.999)return fail('该分区尚未完成设定布料。先泵送，或载入振捣观察示例。');s.inserted=true;s.message='振捣棒已在选定位置插入；可短步观察，再提棒换点。';}
  if(event.type==='vibrate'){if(!s.inserted)return fail('先把振捣棒放到选定分区。');s.vibration[i]++;s.message=s.vibration[i]>2?'此位置已重复操作。比较遗漏区与重复区，不能靠延长停留代替工艺判断。':'观察棒周围的示意影响范围与气泡变化；这不是实际密实度计算。';}
  if(event.type==='withdraw'){s.inserted=false;s.message='已提棒，可移动到未覆盖分区。';}
  if(event.type==='datum'){s.datum=Number(event.value);s.message='激光基准偏移 '+s.datum+' mm；基准设错，闭环也可能稳定地做错标高。';}
  if(event.type==='feedback'){s.feedback=!!event.value;s.message=s.feedback?'已启用标高反馈。':'已关闭反馈，对照固定刮板留下的起伏。';}
  if(event.type==='level'){if(s.pumped[i]<.999||s.vibration[i]<2)return fail('先完成该分区的布料与振捣观察，或载入整平示例。');s.level[i]=s.feedback?s.datum:s.surface[i];s.message=s.feedback&&s.datum===0?'该分区刮板跟随正确案例基准；复核其他分区。':s.feedback?'表面跟随了偏移基准：可能平，却不是设计标高。':'反馈关闭，预置起伏仍保留。比较开启前后的结果。';}
  if(event.type==='example'){s.scenario='预置工位观察示例';s.pumped.fill(1);if(s.station==='level')s.vibration.fill(2);s.message='已载入预置示例，可独立观察该工位；这不代表前道工序已现场验收。';}
  return s;
 }
 const label=i=>String.fromCharCode(65+Math.floor(i/3))+(i%3+1);
 const summary=s=>({pumped:s.pumped.filter(x=>x>=.999).length,vibrated:s.vibration.filter(x=>x>=2).length,leveled:s.level.filter(x=>x!==null).length,correct:s.level.filter(x=>x===0).length});
 const api={initial,reduce,label,summary};g.ConcreteModel=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);

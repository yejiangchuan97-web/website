/* First-chapter observation evidence and a deliberately limited feedback model.
 * All distances, times and travel are classroom model values, not field data. */
(function(g){
 'use strict';
 const copy=x=>JSON.parse(JSON.stringify(x));
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a));
 const machine={
  initial(caseId){return{caseId,device:null,part:null,baseline:{},motion:null,acted:false,records:{}};},
  changeCase(s,id){return{...this.initial(id),records:s.records};},
  select(s,device,readings=[]){return{...s,device,part:null,baseline:Object.fromEntries(readings.map(r=>[r.id,r.value])),motion:null,acted:false};},
  observe(s,task,observation){
   const next={...s,part:observation.part,acted:s.acted||!!observation.acted};
   if(next.device!==task.device)return next;
   const r=observation.readings?.find(r=>r.id===task.control),before=s.baseline[task.control];
   if(next.acted&&r&&Number.isFinite(before)&&Math.abs(r.value-before)>=task.delta){next.motion={control:r.id,label:r.label,before,after:r.value,unit:r.unit};}
   return next;
  },
  ready(s,task){return s.device===task.device&&s.part===task.part&&!!s.motion;},
  save(s,task,draft){
   if(!this.ready(s,task))return{state:s,error:'先找到对应工作装置，并实际改变作业动作，形成观察证据。'};
   if(String(draft.reason||'').trim().length<12)return{state:s,error:'请用自己的话说明工作装置怎样完成这项作业。'};
   if(String(draft.limit||'').trim().length<8)return{state:s,error:'补上仍需核对的使用条件，不能凭三维示意确定实机可用。'};
   const record={caseId:task.id,task:task.title,object:task.object,device:s.device,part:s.part,partLabel:task.partLabel,family:task.family,motion:copy(s.motion),reason:draft.reason.trim(),limit:draft.limit.trim(),review:'说明待师生复核',nature:'教学模型内的用途观察'};
   return{state:{...s,records:{...s.records,[task.id]:record}},error:null};
  }
 };
 const experiment={
  target:1,tolerance:.1,disturbance:1.35,
  initial(mode='manual',records={}){return{mode,position:0,distance:1,running:false,latched:false,armed:false,status:'ready',trial:null,records:copy(records),manualMoves:0};},
  inRange(s){return Math.abs(s.distance-this.target)<=this.tolerance+1e-8;},
  reduce(s,a){
   let n={...s,records:copy(s.records),trial:s.trial?{...s.trial}:null};
   switch(a.type){
    case'mode':return this.initial(a.mode,s.records);
    case'reset-trial':return this.initial(s.mode,s.records);
    case'reset-all':return this.initial();
    case'start':
     if(n.latched||(n.mode==='feedback'&&!this.inRange(n))){n.status='needs-recovery';return n;}
     if(n.position>=1)n.position=0;
     if(n.armed&&n.records.feedback)n.records.feedback.restarted=true;
     n.armed=false;n.running=true;n.status=n.mode==='manual'?'manual-control':'running';return n;
    case'jog':
     if(n.mode!=='manual'||!n.running)return n;
     n.position=clamp(n.position+.08,0,1);n.manualMoves++;n.status='manual-control';return n;
    case'stop':
     if(n.mode==='manual'&&n.running&&n.trial&&n.manualMoves>0)n.records.manual={mode:'manual',disturbance:n.trial.distance,before:n.trial.before,after:n.position,response:'由人下达停止',automatic:false};
     n.running=false;n.status='human-paused';return n;
    case'disturb':
     n.distance=this.disturbance;
     if(!n.running){n.status='disturbance-before-start';return n;}
     n.trial={distance:n.distance,before:n.position};
     if(n.mode==='feedback'){
      n.running=false;n.latched=true;n.status='feedback-paused';
      n.records.feedback={mode:'feedback',disturbance:n.distance,before:n.position,after:n.position,response:'距离反馈触发程序暂停',automatic:true,restored:false,acknowledged:false,restarted:false};
     }else n.status=n.mode==='program'?'uncompared-input':'human-observes';
     return n;
    case'restore':
     n.distance=this.target;
     if(n.latched){n.status='waiting-human-confirmation';if(n.records.feedback)n.records.feedback.restored=true;}
     else n.status=n.running?'running':'ready';
     return n;
    case'acknowledge':
     if(!n.latched||!this.inRange(n)){n.status='needs-recovery';return n;}
     n.latched=false;n.armed=true;n.running=false;n.status='ready-to-restart';
     if(n.records.feedback)n.records.feedback.acknowledged=true;
     return n;
    case'advance':{
     if(!n.running||n.mode==='manual')return n;
     if(n.mode==='feedback'&&!this.inRange(n))return this.reduce(n,{type:'disturb'});
     n.position=clamp(n.position+clamp(a.dt,0,.5)*.16,0,1);
     if(n.mode==='program'&&n.trial&&n.position-n.trial.before>=.035)n.records.program={mode:'program',disturbance:n.trial.distance,before:n.trial.before,after:n.position,response:'距离变化未进入动作判断，程序继续',automatic:false};
     if(n.position>=1){n.running=false;n.status='path-ended';}
     return n;
    }
    default:return n;
   }
  },
  complete(s){return!!(s.records.manual&&s.records.program&&s.records.feedback?.restored&&s.records.feedback?.acknowledged&&s.records.feedback?.restarted);},
  save(s,draft){
   if(!this.complete(s))return{record:null,error:'先完成三种控制方式的对照，并亲手完成反馈暂停后的恢复与重新启动。'};
   if(String(draft.reason||'').trim().length<18||String(draft.human||'').trim().length<12)return{record:null,error:'请依据刚才的变化说明反馈进入了谁的判断，并写清人要确认和处理什么。'};
   return{record:{experiment:copy(s.records),reason:draft.reason.trim(),human:draft.human.trim(),review:'解释与迁移判断待师生复核',nature:'同一扰动下的课堂控制逻辑对照'},error:null};
  }
 };
 const api={machine,experiment};g.ChapterLearning=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);

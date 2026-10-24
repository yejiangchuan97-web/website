(()=>{'use strict';
const processes=[
 ['泵送','把混凝土经输送管送至作业位置。','混凝土泵、输送管路。','观察供料与输送关系；设备架设、管路与现场条件需另行核实。','送到作业位置以后，还需要按区域布料。'],
 ['布料','在作业区域内分配材料，关注覆盖与铺料分布。','布料设备与现场配合人员。','比较分区、边角与钢筋密集位置的布料需求。','均匀铺开并不等于已经振捣密实。'],
 ['振捣','围绕材料状态与可进入位置，组织密实作业。','振捣设备与人工判断。','观察位置、阻挡、材料状态与作业过程，保留需人工判断区域。','密实与表面平整是不同的观察任务。'],
 ['粗平','初步整理表面与材料分布，为后续整平接续。','相应整平设备与人工配合。','对照材料分布、边角和后续设备的工作条件。','初步平整以后，还要核对参照和标高。'],
 ['精平','依据高度参照与偏差反馈，调整整平执行机构。','激光基准、接收器、控制与液压调平机构。','分别核对表面平整与设计标高，理解基准误设的影响。','达到表面形态不代表已经完成抹光或养护。'],
 ['抹光','结合材料状态与工艺时机进行表面处理。','抹光设备与边角人工处理。','比较过早、适宜、偏晚等情境，关注边角及覆盖。','设备走过一遍不能自动代表质量合格或养护完成。']
];
const $=id=>document.getElementById(id);let selected=0;
$('process-list').innerHTML=processes.map((p,i)=>`<button type="button" data-process="${i}" aria-pressed="false"><span>0${i+1}</span>${p[0]}</button>`).join('');
function select(i){if(!processes[i])return;selected=i;const p=processes[i];$('process-number').textContent=`STEP 0${i+1} / 06`;$('process-title').textContent=p[0];$('process-purpose').textContent=p[1];$('process-role').textContent=p[2];$('process-check').textContent=p[3];$('process-handoff').textContent=p[4];document.querySelectorAll('[data-process]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.process===i)));}
$('process-list').onclick=e=>{const b=e.target.closest('[data-process]');if(b)select(+b.dataset.process);};select(0);window.ConcreteGuide={select,state:()=>({selected,mode:'reading'})};
})();

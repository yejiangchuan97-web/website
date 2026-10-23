export const ISSUES={
 joints:{title:'上下皮的竖缝连在一起',text:'只顾一块一块放齐，容易忽略相邻皮的搭接。连续竖缝削弱组砌联系；墙厚方向还需要丁砖拉结。',slider:'上皮错开',min:0,max:62.5,step:0.5,start:0,fix:62.5,hint:'本例一顺一丁，以四分之一模数62.5 mm错开接缝。窗口边缘的截断不是完整墙端做法。',robot:'先排砖，再生成目标',help:'把砖的尺寸、墙厚、上下皮组砌和墙端处理一起编入排布，再给每块砖一个目标位置和朝向。',human:'仍需人工：审核转角、洞口、拉结与收口方案。',unit:'mm'},
 mortar:{title:'每一皮的小差异会积累',text:'铺灰厚薄不一，砖底支承高度就会不同。仅盯末端坐标，不能判断砂浆是否铺满，也不能替代标高检查。',slider:'每层示例厚度偏差',min:0,max:6,step:1,start:4,fix:0,hint:'左段按10 mm水平灰缝示例，右段每层增加所设偏差；四皮之间三道灰缝累积高度差。',robot:'材料协同 + 标高反馈',help:'稳定制备和供料，协调铺灰与放砖，再测量实际砌筑标高。必要时停下调整工艺。',human:'仍需人工：判断材料状态、砂浆饱满度及灰缝质量。',unit:'mm'},
 datum:{title:'动作重复，错误也可能重复',text:'基准有偏差时，机器人可以非常稳定地把每块砖都放偏。施工时必须把墙体目标和设备位置对到同一基准。',slider:'整段墙的示例偏移',min:0,max:30,step:1,start:18,fix:0,hint:'底座上的基准带保持不动；墙体随所设偏差整体偏移。',robot:'测量基准 → 修正目标 → 再复核',help:'固定工位安装后要标定；移动工位换站后要重新定位。用实际测量更新目标，形成反馈。',human:'仍需人工：确认控制线、工作区和重新定位结果。',unit:'mm'}
};
export function issueScene(type,amount){
 const info=ISSUES[type]||ISSUES.joints;amount=Math.max(info.min,Math.min(info.max,Number(amount)||0));
 const bricks=[];const width=240;const length=990;
 if(type==='joints'){
  for(let course=0;course<4;course++){
   const header=course%2===0;const pitch=header?125:250;const w=header?115:240;const shift=header?0:amount;
   for(let y of header?[0]:[0,125])for(let j=-2;j<10;j++){
    const l=Math.max(0,j*pitch+shift),r=Math.min(length,j*pitch+shift+w);
    if(r>l)bricks.push({id:`${course}-${y}-${j}`,x:l,y,z:course*63,w:r-l,d:header?240:115,h:53,kind:course===3?'selected':'brick',selected:course===3});
   }
  }
 }else{
  for(let course=0;course<4;course++)for(let side=0;side<2;side++){
   const header=course%2===0;const partStart=side*500;const span=490;
   for(let y of header?[0]:[0,125])for(let j=-1;j<5;j++){
    const pitch=header?125:250;const raw=j*pitch+(header?0:62.5);const l=Math.max(0,raw),r=Math.min(span,raw+(header?115:240));
    if(r>l)bricks.push({id:`${course}-${side}-${y}-${j}`,x:partStart+l+(type==='datum'?amount:0),y,z:course*(63+(type==='mortar'&&side?amount:0)),w:r-l,d:header?240:115,h:53,mortar:10+(type==='mortar'&&side?amount:0),selected:side===1});
   }
  }
 }
 return {bricks,width,length,issue:type,amount,course:4,baseLength:length,metric:type==='mortar'?amount*3:amount,aligned:amount===0};
}

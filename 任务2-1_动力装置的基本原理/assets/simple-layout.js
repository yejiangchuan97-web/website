(() => {
  'use strict';
  const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
  document.body.classList.add('motor-simple');
  const title=$('.intro h1');title.querySelector('small')?.remove();
  const brand=$('.topbar .brand');brand.replaceChildren(title);
  const subtitle=document.createElement('p');subtitle.textContent='看结构，调参数，理解电机怎样产生转动。';brand.append(subtitle);
  const nav=$('.page-nav'),advanced=document.createElement('label');advanced.className='simple-advanced';
  advanced.innerHTML='<span>进阶学习</span><select id="motor-more" aria-label="进阶学习"><option value="">选择练习或说明</option><option value="assembly">组装与接线</option><option value="fault">故障排查</option><option value="reference">模型说明</option></select>';
  const bank=document.createElement('div');bank.hidden=true;bank.className='simple-tab-bank';
  for(const name of ['assembly','fault','reference'])bank.append($('[data-screen="'+name+'"]'));
  nav.append(advanced,bank);
  const labels={explore:'01 观察电机',principle:'02 理解原理',robot:'03 机器人应用'};
  for(const [name,label] of Object.entries(labels))$('[data-screen="'+name+'"]').textContent=label;
  const select=$('#motor-more');select.onchange=()=>{if(select.value)bank.querySelector('[data-screen="'+select.value+'"]').click();};
  function screen(){const id=$('.page-nav [aria-selected="true"]')?.dataset.screen||'explore';document.body.dataset.motorScreen=id;select.value=['assembly','fault','reference'].includes(id)?id:'';}
  new MutationObserver(screen).observe(nav,{subtree:true,attributes:true,attributeFilter:['aria-selected']});screen();
  const aside=$('.main-grid>aside'),body=aside.querySelector('.control-body');
  const metrics=$('.metrics');metrics.classList.add('simple-readouts');aside.querySelector('.panel-head').after(metrics);
  const more=document.createElement('details');more.className='simple-options';more.innerHTML='<summary>更多设置与详细数据</summary><div class="simple-options-content"></div>';
  const content=more.lastElementChild,cut=$('#cutaway').closest('.field'),bottom=body.querySelector('.control-bottom');
  const actions=bottom.querySelector('.control-actions'),condition=$('#condition');
  body.insertBefore(actions,cut);body.insertBefore(condition,cut);
  content.append(cut,$('.supply-strip'),bottom);aside.append(more);
  const annotations=$('.annotation-controls');content.append(annotations);annotations.classList.add('simple-annotation-settings');
  const help=document.createElement('div');help.className='simple-model-options';
  help.innerHTML='<label><input id="simple-names" type="checkbox">部件名称</label><button id="simple-vectors" type="button" aria-pressed="true" aria-controls="motorParticleLayer motorEMLayer">隐藏电流与受力</button><span class="simple-flow-key"><span class="current-key">● 电流 I</span><span class="force-key">● 受力 F</span></span>';
  $('#motorPanel .panel-head').after(help);
  // Show the requested current and force directions without adding field/torque clutter.
  const vectorKeys=['particles','polarity','current','force'];
  all('[data-annotation]').forEach(input=>{input.checked=input.dataset.annotation==='poles'||vectorKeys.includes(input.dataset.annotation);input.dispatchEvent(new Event('change',{bubbles:true}));});
  document.body.classList.add('simple-show-vectors');
  // Keep angle presets and the full explanation available in the existing disclosure.
  content.append($('#motorPanel>.em-legend'));
  $('#simple-names').onchange=e=>{const input=$('[data-annotation="names"]');input.checked=e.target.checked;input.dispatchEvent(new Event('change',{bubbles:true}));};
  function syncVectorButton(){const enabled=vectorKeys.some(key=>$('[data-annotation="'+key+'"]').checked);$('#simple-names').checked=$('[data-annotation="names"]').checked;$('#simple-vectors').setAttribute('aria-pressed',String(enabled));$('#simple-vectors').textContent=enabled?'隐藏电流与受力':'显示电流与受力';document.body.classList.toggle('simple-show-vectors',enabled);}
  $('#simple-vectors').onclick=()=>{const enabled=$('#simple-vectors').getAttribute('aria-pressed')!=='true';for(const key of vectorKeys){const input=$('[data-annotation="'+key+'"]');input.checked=enabled;input.dispatchEvent(new Event('change',{bubbles:true}));}syncVectorButton();};
  all('[data-annotation]').forEach(input=>input.addEventListener('change',syncVectorButton));
  for(const id of ['annotationsBtn','annotationsShowAll'])$('#'+id).addEventListener('click',syncVectorButton);
  $('#lessonText').textContent='青色粒子沿电流方向流动，橙色箭头与光点表示受力；反接电源，对照方向变化。';
  // Let each renderer measure the larger model area after reparenting the controls.
  dispatchEvent(new Event('resize'));
})();

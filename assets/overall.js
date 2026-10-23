(() => {
/* A source-backed visual overview; no project IDs or product percentages are inferred. */
const O=D.overview;
const taskFacts=Object.fromEntries(D.tasks.map(t=>[t.id,t]));
const percent=(done,total)=>total?+(done/total*100).toFixed(1):null;
const percentText=value=>value===null?'暂无清单':value+'%';
const taskButton=id=>[...document.querySelectorAll('[data-task]')].find(b=>b.dataset.task===id);
const sourceLinks=refs=>(refs||[]).map(r=>`<p><a href="${E(r.url)}" target="_blank" rel="noopener">${E(r.path)} · 第 ${r.line} 行</a></p><div class="excerpt">${E(r.excerpt)}</div>`).join('');
const stateNames={open:'未完成','in-progress':'实施中',done:'已关闭'};
const executionNames={stopped:'批次停止',investigating:'接续核实中',blocked:'受阻'};
const stageNames={planned:'尚未启动',active:'当前阶段',stopped:'批次停止',blocked:'受阻',done:'已完成'};
let ganttCellWidth=56,ganttStatus='all';
const overview=document.getElementById('overall-view');
const ganttView=document.createElement('section');ganttView.id='gantt-view';ganttView.setAttribute('aria-label','任务甘特图');document.getElementById('timeline-view').prepend(ganttView);
const recordsHeading=document.createElement('h2');recordsHeading.id='timeline-records';recordsHeading.className='g-records-heading';recordsHeading.textContent='按天开发记录';ganttView.after(recordsHeading);

const jump=id=>`data-overall-task="${E(id)}"`;
const groupTitle=(n,title,note='')=>`<div class="v-section-head"><h2><span>${n}</span>${E(title)}</h2><small>${E(note)}</small></div>`;
const metric=m=>{
 const v=percent(m.done,m.total),ids=m.task_ids||[],criteria=m.basis==='criteria';
 const marks=criteria?taskFacts[m.task_id].criteria.items.map((c,i)=>({done:c.checked,label:`第${i+1}项：${c.text}`,id:m.task_id})):ids.map(id=>({done:taskFacts[id].state==='done',label:id+' '+stateNames[taskFacts[id].state],id}));
 const graph=marks.length&&marks.length<=30?`<div class="v-segments">${marks.map(x=>`<button ${jump(x.id)} class="${x.done?'complete':''}" aria-label="${E(x.label)}" title="${E(x.label)}"></button>`).join('')}</div>`:`<div class="overall-bar" role="progressbar" aria-label="${E(m.label)}" aria-valuemin="0" aria-valuemax="100" ${v===null?'':`aria-valuenow="${v}"`} aria-valuetext="${m.done}/${m.total}"><i style="width:${v||0}%"></i></div>`;
 return `<section class="overall-metric"><h3>${E(m.label)}</h3><div class="overall-value-row"><b>${m.total?m.done:'—'}<small>${m.total?' / '+m.total:''}</small></b><span>${criteria?'清单勾选':'已列任务关闭数'}</span></div>${graph}<details><summary>统计口径${m.total?' · '+percentText(v):''}</summary><p>${E(m.note||'仅计算本组已列任务；不是整个产品完成率。')}</p></details></section>`;
};
const phases=O.stages.map((s,i)=>`<button class="v-phase ${s.status}" data-phase="${E(s.id)}" aria-pressed="false"><span class="v-phase-point">${s.status==='done'?'✓':i+1}</span><b>${E(s.id)}</b><strong>${E(s.title)}</strong><small>${stageNames[s.status]}</small></button>`).join('');
const checklist=t=>t.criteria.total?`<span class="v-check-count">${t.criteria.checked}/${t.criteria.total}</span><span class="v-mini-checks" aria-label="清单勾选 ${t.criteria.checked}/${t.criteria.total}">${t.criteria.items.slice(0,30).map(c=>`<i class="${c.checked?'checked':''}" title="${E(c.text)}"></i>`).join('')}${t.criteria.total>30?'<small>…</small>':''}</span>`:'<span class="v-unknown">未提供复选清单</span>';
const lanes=[...new Set(D.tasks.map(t=>t.lane))];
const maps=lanes.map(lane=>`<section class="v-task-group"><h3>${E(laneNames[lane]||lane)}</h3>${D.tasks.filter(t=>t.lane===lane).map(t=>`<button class="v-task-row" ${jump(t.id)}><b>${E(t.id)}</b><span>${E(t.title)}</span><span class="v-state ${t.state}">${E(executionNames[t.execution]||stateNames[t.state])}</span><span class="v-check-cell">${checklist(t)}</span></button>`).join('')}</section>`).join('');
const days={};for(const ev of D.events){if(ev.at){const day=ev.at.slice(0,10);days[day]??={};days[day][ev.result]=(days[day][ev.result]||0)+1;}}
const dayKeys=Object.keys(days).sort(),peak=Math.max(1,...Object.values(days).map(x=>Object.values(x).reduce((a,b)=>a+b,0))),kinds=['passed','failed','blocked','deferred','recorded'];
const bars=dayKeys.map(day=>{const val=days[day],sum=Object.values(val).reduce((a,b)=>a+b,0);return `<button class="v-history-bar" data-date="${day}" aria-label="${day} 共${sum}条记录，查看当天记录"><span class="v-bar-count">${sum}</span><span class="v-stack" style="height:${Math.max(4,sum/peak*100)}%">${kinds.map(k=>val[k]?`<i class="${k}" style="flex:${val[k]}" title="${results[k]} ${val[k]}条"></i>`:'').join('')}</span><small>${day.slice(5).replace('-','/')}</small></button>`}).join('');
const recent=[...D.events].filter(e=>e.at).sort((a,b)=>b.at.localeCompare(a.at)).slice(0,5);
const activity=recent.map(e=>`<button class="v-recent" data-recent="${E(e.id)}"><span class="v-recent-dot ${e.result}"></span><time>${E(e.at.slice(5,10).replace('-','.'))}<small>${e.precision==='day'?'仅日期':'记录日期'}</small></time><div><small>${E(e.task)} · ${results[e.result]}</small><b>${E(e.title)}</b></div><span>↗</span></button>`).join('');
overview.innerHTML=(O.report?renderLeadershipReport(O.report):'')+`<div class="v-intro"><span class="v-eyebrow">项目总览 · ${E(O.as_of.slice(0,10))}</span><h1>${E(O.headline)}</h1><p class="v-execution">${E(O.execution_label)}</p></div>
${O.stages.length?`<section class="v-section">${groupTitle('01',O.stages_title,'点选阶段查看范围')}<div class="v-roadmap">${phases}</div><div class="v-phase-detail" id="v-phase-detail" aria-live="polite"></div></section>`:''}
<div class="v-next"><b>下一步</b><span>${E(O.next)}</span></div>
${O.blockers.length?`<section class="v-blockers"><h2>当前阻断</h2>${O.blockers.map(b=>`<details><summary>${E(b.title)}</summary><p>${E(b.detail)}</p>${sourceLinks(b.refs)}</details>`).join('')}</section>`:''}
<section class="v-section">${groupTitle('02','已交付多少','一格对应一张任务或一条清单')}<div class="overall-metrics">${O.metrics.map(metric).join('')}</div><p class="v-caption">按已列范围计数，不代表整套产品完成率。任务关闭与清单勾选分别展示。</p></section>
<div class="v-two-col"><section class="v-section">${groupTitle('03','开发记录分布','条 / 记录日期')}<div class="v-legend">${kinds.map(k=>`<span><i class="${k}"></i>${results[k]}</span>`).join('')}</div>${dayKeys.length?`<div class="v-history">${bars}</div>`:'<p>暂无有日期的记录</p>'}<p class="v-caption">柱高表示记录数量，点击筛选日期；不代表进度、工时或代码量。${D.events.filter(e=>!e.at).length}条日期未明记录保留在完整时间轴。</p></section>
<section class="v-section">${groupTitle('04','最近记录','点选查看详情与证据')}<div class="v-recent-list">${activity||'暂无记录'}</div></section></div>
<section class="v-section">${groupTitle('05','任务与验收地图','点任务打开完整时间轴')}<div class="v-map-legend"><span>■ 已勾选</span><span>□ 待勾选</span><span>— 无复选清单</span></div><div class="v-task-map">${maps}</div></section>
<details class="v-details"><summary>完整状态、边界与原始依据</summary><p>${E(O.summary)}</p><p>${E(O.scope_note)}</p><p>${E(O.stages_note)}</p>${sourceLinks(O.refs)}${O.related_sections.map(s=>`<h3>${E(s.title)}</h3><p>${E(s.note||'')}</p>${s.task_ids.map(id=>`<button class="plain" ${jump(id)}>${E(id)} ${E(taskFacts[id].title)}</button>`).join('')}`).join('')}</details>
${O.gates.length?`<div class="v-gates"><b>${E(O.gates_title)} ${O.gates_done}/${O.gates.length}</b>${O.gates.map(id=>`<button ${jump(id)}>${taskFacts[id].state==='done'?'✓':'○'} ${E(id)}</button>`).join('')}</div>`:''}
<footer class="v-footer">生成于 ${E(D.generated_at.slice(0,16).replace('T',' '))} · 状态截至 ${E(O.as_of)} · 按需快照</footer>`;
function renderLeadershipReport(r){
 document.body.dataset.report='present';
 const statuses={done:'已验收',active:'进行中',open:'待完成',blocked:'有阻断'};
 const proof=(refs,label='查看依据')=>`<details class="r-proof"><summary>${E(label)}</summary>${sourceLinks(refs)}</details>`;
 const requestKinds={coordination:'需要协调',decision:'需要决策',information:'供知悉'};
 const heading=(n,title,note='')=>`<div class="r-heading"><h2><span class="r-section-number">${n}</span>${title}</h2><span>${note}</span></div>`;
 return `<section class="report-preface" aria-label="项目结论与下一步">
 <section class="r-conclusion" data-report-section="1"><div class="r-masthead"><h2><span>01</span>结论</h2><span>${E(r.label)} · 截至 ${E(r.as_of)}</span></div><span class="r-kicker">${E(r.title)}</span><h1>${E(r.headline)}</h1><p>${E(r.conclusion)}</p><div class="r-period">${E(r.period_note)}</div>${proof(r.refs,'结论依据')}</section>
 <section class="r-section" data-report-section="2">${heading('02','已交付结果','按验收结果展示')}<div class="r-outcomes">${r.outcomes.map(x=>`<article><span class="r-status ${x.status}">${E(statuses[x.status])}</span><h3>${E(x.title)}</h3><p>${E(x.result)}</p>${proof(x.refs,'验收依据')}</article>`).join('')||'<p class="r-empty">暂无已核验交付结果</p>'}</div></section>
 <section class="r-section" data-report-section="3">${heading('03','里程碑与偏差','缺少计划基线时不判断是否按期')}<div class="r-milestones">${r.milestones.map((x,i)=>`<div><span class="r-step ${x.status}">${x.status==='done'?'✓':i+1}</span><b>${E(x.title)}</b><small>${E(statuses[x.status])}</small><p>${E(x.detail)}</p>${proof(x.refs)}</div>`).join('')}</div><div class="r-assessments">${r.assessments.map(x=>`<div><span>${E(x.label)}</span><b>${E(x.value)}</b><small>${E(x.detail)}</small>${proof(x.refs)}</div>`).join('')}</div></section>
 <section class="r-section" data-report-section="4">${heading('04','风险与所需决策','保留当前限制与责任边界')}<div class="r-two-col"><div><h3 class="r-column-title">关键风险与影响</h3>${r.risks.map(x=>`<article class="r-risk"><h3>${E(x.title)}</h3><p><b>影响</b>${E(x.impact)}</p><p><b>处理</b>${E(x.response)}</p><div class="r-facts"><span>责任人：${E(x.owner)}</span><span>检查点：${E(x.checkpoint)}</span></div>${proof(x.refs)}</article>`).join('')||'<p class="r-empty">暂无已登记风险；不据此推断无风险</p>'}</div><div id="report-requests"><h3 class="r-column-title">需要协调或决策的事项</h3>${r.requests.map(x=>`<article class="r-request"><span class="r-request-kind">${E(requestKinds[x.kind])}</span><h3>${E(x.title)}</h3><p>${E(x.recommendation)}</p><div class="r-facts"><span>责任人：${E(x.owner)}</span><span>下一检查：${E(x.checkpoint)}</span></div>${proof(x.refs,'事项依据')}</article>`).join('')||'<p class="r-empty">暂无已登记的协调或决策事项</p>'}</div></div></section>
 <section class="r-section" data-report-section="5">${heading('05','下一步与检查点','未确认日期不作交付承诺')}<ol class="r-next">${r.next_steps.map((x,i)=>`<li><span class="r-next-number">0${i+1}</span><div><h3>${E(x.result)}</h3><p>验收：${E(x.acceptance)}</p><div class="r-facts"><span>责任人：${E(x.owner)}</span><span>时间 / 条件：${E(x.when)}</span></div>${proof(x.refs)}</div></li>`).join('')||'<li class="r-empty">下一步尚待确认</li>'}</ol></section>
 </section><div class="r-progress-divider" id="project-progress"><h2>项目进度</h2><span>阶段、完成情况与完整执行记录</span></div>`;
}

/* A compact right outline follows the visible view without changing task filters. */
let outlineNav,outlineEntries=[],outlineFrame=0;
function refreshOutline(view){
 if(!outlineNav){outlineNav=document.createElement('nav');outlineNav.className='page-outline';outlineNav.setAttribute('aria-label','页面大纲');document.body.append(outlineNav);window.addEventListener('scroll',scheduleOutline,{passive:true});window.addEventListener('resize',scheduleOutline);}
 const sections=view==='overall'?[...overview.querySelectorAll('[data-report-section],.v-section')]:[ganttView,recordsHeading];
 outlineEntries=sections.map((el,i)=>{
  const number=String(i+1).padStart(2,'0');
  const heading=el.querySelector('.r-heading h2,.r-masthead h2,.v-section-head h2');
  const title=view==='timeline'?(i?'按天开发记录':'任务甘特图'):(heading?.querySelector('.section-title')?.textContent||heading?.textContent||'').replace(/^\s*\d+\s*/,'').trim();
  el.id=el.id||'outline-'+view+'-'+number;
  if(heading){
   const paths=['M9 12l2 2 4-4 M12 3l8 4v5c0 5-8 9-8 9s-8-4-8-9V7z','M4 7h16v14H4z M8 7V3h8v4 M8 13l3 3 5-5','M5 21V3 M5 4h13l-3 4 3 4H5','M12 3L2 21h20z M12 9v5 M12 17h.01','M4 12h15 M13 6l6 6-6 6','M4 6h6v6H4z M14 12h6v6h-6z M10 9h7v3','M4 19V9 M10 19V5 M16 19v-7 M3 21h18','M3 20l5-7 5 3 7-11 M15 5h5v5','M12 8v5l3 2 M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9','M5 4h14v17H5z M8 9l1 1 2-2 M13 9h3 M8 15l1 1 2-2 M13 15h3'];
   heading.classList.add('section-heading');heading.innerHTML=`<svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[i%paths.length]}"/></svg><span class="section-number">${number}</span><span class="section-title">${E(title)}</span>`;
  }
  return {el,number,title};
 });
 outlineNav.innerHTML=outlineEntries.map(x=>`<a href="#${E(x.el.id)}" aria-label="${x.number} ${E(x.title)}"><i aria-hidden="true"></i><b>${x.number}</b><span>${E(x.title)}</span></a>`).join('');
 outlineNav.onclick=e=>{const a=e.target.closest('a');if(!a)return;e.preventDefault();const entry=outlineEntries.find(x=>'#'+x.el.id===a.getAttribute('href'));entry?.el.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});};
 scheduleOutline();
}
function scheduleOutline(){if(!outlineFrame)outlineFrame=requestAnimationFrame(()=>{outlineFrame=0;const edge=document.querySelector('main').getBoundingClientRect().right;outlineNav.style.left=Math.min(edge+12,innerWidth-outlineNav.offsetWidth-7)+'px';outlineNav.style.right='auto';let active=0;const bottom=scrollY+innerHeight>=document.documentElement.scrollHeight-3;outlineEntries.forEach((x,i)=>{if(x.el.getBoundingClientRect().top<=innerHeight*.25)active=i;});if(bottom)active=outlineEntries.length-1;[...outlineNav.children].forEach((a,i)=>{if(i===active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});});}

function phaseDetail(id){const s=O.stages.find(x=>x.id===id);if(!s||!document.getElementById('v-phase-detail'))return;overview.querySelectorAll('[data-phase]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.phase===id));document.getElementById('v-phase-detail').innerHTML=`<b>${E(s.id)} · ${E(s.title)}</b><span>${E(s.detail||'暂无范围说明')}</span><details><summary>依据</summary>${sourceLinks(s.refs)}</details>`;}
phaseDetail(O.stages.find(s=>s.status==='active')?.id||O.stages[0]?.id);
function showProgressView(view){const normalized=view==='gantt'?'timeline':view;document.body.dataset.view=normalized;overview.hidden=normalized!=='overall';document.getElementById('timeline-view').hidden=normalized!=='timeline';for(const key of ['overall','timeline'])document.getElementById('show-'+key).setAttribute('aria-pressed',normalized===key);if(normalized==='timeline')updateThemeNavigation();refreshOutline(normalized);}
function jumpTask(id){const target=taskButton(id);if(target){document.getElementById('reset').click();target.click();showProgressView('timeline');document.getElementById('timeline-records').scrollIntoView({block:'start',behavior:'instant'});}}
document.getElementById('show-overall').onclick=()=>showProgressView('overall');document.getElementById('show-timeline').onclick=()=>showProgressView('timeline');
overview.addEventListener('click',e=>{if(e.target.closest('#r-show-development')){showProgressView('timeline');window.scrollTo({top:0,behavior:'instant'});return;}const t=e.target.closest('[data-overall-task]');if(t)jumpTask(t.dataset.overallTask);const phase=e.target.closest('[data-phase]');if(phase)phaseDetail(phase.dataset.phase);const date=e.target.closest('[data-date]');if(date){document.getElementById('reset').click();document.getElementById('search').value=date.dataset.date;render();showProgressView('timeline');document.getElementById('timeline-records').scrollIntoView({block:'start',behavior:'instant'});}const r=e.target.closest('[data-recent]');if(r){const event=D.events.find(x=>x.id===r.dataset.recent);jumpTask(event.task);document.querySelector(`[data-event="${CSS.escape(event.id)}"]`)?.closest('details.day')?.setAttribute('open','');document.querySelector(`[data-event="${CSS.escape(event.id)}"] details`)?.setAttribute('open','');document.querySelector(`[data-event="${CSS.escape(event.id)}"]`)?.scrollIntoView({block:'center',behavior:'instant'});}});
document.getElementById('tasks').addEventListener('click',e=>{if(e.target.closest('[data-task]'))showProgressView('timeline');});document.getElementById('allTasks').addEventListener('click',()=>showProgressView('timeline'));
renderGantt();
const initialView=new URLSearchParams(location.search).get('view');showProgressView(['gantt','timeline'].includes(initialView)?initialView:'overall');
function sidebarProgress(button,done,total,label){const v=percent(done,total),a=v===null?'未提供复选清单':`${label} ${done}/${total}`;const block=document.createElement('span');block.className='sidebar-progress';block.title=a;block.innerHTML=`<span class="sidebar-progress-caption"><span>${E(label)}</span><strong class="sidebar-percent ${v===100?'complete':''}">${total?done+'/'+total:'—'}</strong></span><span class="sidebar-progress-bar" role="progressbar" aria-label="${E(a)}" aria-valuemin="0" aria-valuemax="100" ${v===null?'':`aria-valuenow="${v}"`} aria-valuetext="${E(a)}"><i class="${v===100?'complete':''}" style="width:${v||0}%"></i></span>`;button.append(block);}
for(const t of D.tasks){const b=taskButton(t.id);if(b&&t.criteria.total)sidebarProgress(b,t.criteria.checked,t.criteria.total,'清单勾选');}
updateThemeNavigation();document.title=D.project+' · 开发进度';


function renderGantt(){
 const toDay=key=>Date.parse(key+'T00:00:00Z')/86400000;
 const fromDay=n=>new Date(n*86400000).toISOString().slice(0,10);
 const dated=D.events.filter(e=>e.at).map(e=>({...e,day:e.at.slice(0,10)}));
 const allDays=dated.map(e=>toDay(e.day)),first=allDays.length?Math.min(...allDays):null,last=allDays.length?Math.max(...allDays):null;
 const span=first===null?0:last-first+1;
 // Bound the column count for long histories while retaining exact dates in labels/details.
 const bucket=span>120?7:1,columns=span?Math.ceil(span/bucket):0,width=ganttCellWidth;
 const ticks=Array.from({length:columns},(_,i)=>fromDay(first+i*bucket));
 const label=day=>day.slice(5).replace('-','/');
 const axis=`<div class="g-axis-label"><b>任务 / 当前状态</b><small>下方日期为首末记录日</small></div><div class="g-axis-days" style="grid-template-columns:repeat(${columns},${width}px)">${ticks.map(key=>`<time datetime="${key}" class="${key===ticks[ticks.length-1]?'latest':''}"><small>${key.slice(0,4)}.${key.slice(5,7)}</small><b>${key.slice(8)}</b></time>`).join('')}</div>`;
 const used=new Set(),ordered=[];
 for(const m of O.metrics){const ids=m.task_ids||[m.task_id];const tasks=ids.filter(id=>taskFacts[id]&&!used.has(id)).map(id=>{used.add(id);return taskFacts[id]});if(tasks.length)ordered.push({title:m.label,tasks})}
 for(const lane of [...new Set(D.tasks.map(t=>t.lane))]){const tasks=D.tasks.filter(t=>t.lane===lane&&!used.has(t.id));if(tasks.length)ordered.push({title:laneNames[lane]||lane,tasks})}
 const rows=ordered.map(group=>{const visible=group.tasks.filter(t=>ganttStatus==='all'||(ganttStatus==='done'?t.state==='done':t.state!=='done'));if(!visible.length)return '';return `<div class="g-group"><b>${E(group.title)}</b><span>${visible.length}项任务</span></div>`+visible.map(t=>{
  const events=dated.filter(e=>e.task===t.id),values=events.map(e=>toDay(e.day)),min=values.length?Math.min(...values):null,max=values.length?Math.max(...values):null;
  const groups={};events.forEach(e=>{const n=Math.floor((toDay(e.day)-first)/bucket);(groups[n]??=[]).push(e)});
  const ticksHTML=Object.entries(groups).map(([col,es])=>{
   const hasIssue=es.some(e=>e.result==='failed'||e.result==='blocked');const day=es[0].day,colNum=Number(col),endKey=fromDay(Math.min(last,first+(colNum+1)*bucket-1));
   const labelText=bucket===1?day:fromDay(first+colNum*bucket)+'至'+endKey;
   return `<button class="g-event-dot ${hasIssue?'has-issue':''}" data-g-task="${E(t.id)}" data-g-column="${colNum}" style="left:${colNum*width+width/2}px" aria-label="${E(t.id)} ${labelText} ${es.length}条记录，查看证据" title="${labelText} · ${es.length}条记录${hasIssue?' · 含历史失败/受阻':''}">${es.length}</button>`;
  }).join('');
  const coverage=min===null?'':`<span class="g-coverage ${t.state}" style="left:${((min-first)/bucket)*width+width/2}px;width:${Math.max(2,((max-min)/bucket)*width)}px" aria-hidden="true"></span>`;
  return `<div class="g-row"><button class="g-task-label" data-g-task="${E(t.id)}"><b>${E(t.id)} <small class="v-state ${t.state}">${stateNames[t.state]}</small></b><span>${E(t.title)}</span><em>${min===null?'日期未知':label(fromDay(min))+(min===max?' · 单日记录':' — '+label(fromDay(max)))} · ${events.length}条</em></button><div class="g-track" style="width:${Math.max(columns*width,240)}px;background-size:${width}px 100%">${coverage}${ticksHTML}${min===null?'<span class="g-no-date">暂无有日期记录</span>':''}</div></div>`;
 }).join('')}).join('');
 ganttView.innerHTML=`<div class="g-intro"><div><h2>任务甘特图</h2><p>先看任务分布，再向下查看按天记录。</p></div><a class="g-to-records" href="#timeline-records">查看按天记录 ↓</a></div><div class="g-notice"><b>当前显示：记录覆盖区间</b><span>横条连接已聚合记录的最早日与最晚日，圆点为实际记录；空白不表示停工。不是实际开工/完工日期、连续执行时长或未来排期。</span></div><div class="g-legend"><span><i class="g-legend-bar"></i>首末记录范围</span><span><i class="g-legend-dot"></i>有记录（数字为条数）</span><span><i class="g-legend-issue"></i>含历史失败 / 受阻（非当前状态）</span></div><div class="g-controls"><label>任务 <select id="g-status"><option value="all">全部</option><option value="done">已关闭</option><option value="open">未关闭</option></select></label><label>时间刻度 <select id="g-zoom"><option value="38">紧凑</option><option value="56">标准</option><option value="76">放大</option></select></label><span>最新记录日 ${last===null?'未知':fromDay(last)}</span></div>${span?`<p class="v-caption">${fromDay(first)} — ${fromDay(last)} · ${bucket===1?'按日':'按7日分组'} · 横向滚动查看，点任务或记录查看证据</p><div class="g-scroll" tabindex="0" role="region" aria-label="可横向滚动的任务甘特图"><div class="g-chart" style="min-width:${280+columns*width}px"><div class="g-axis">${axis}</div>${rows}</div></div>`:'<div class="empty">暂无有日期记录，无法绘制时间区间。任务状态与未知日期记录仍可在开发时间轴查看。</div>'}<p class="v-caption">${D.events.length-dated.length}条日期未知记录保留在列表中；未拆分的后续范围与无日期任务不编造横条。所有日期按原始记录精度展示。</p>`;
 document.getElementById('g-status').value=ganttStatus;document.getElementById('g-zoom').value=String(ganttCellWidth);
 ganttView.onchange=e=>{if(e.target.id==='g-status'){ganttStatus=e.target.value;renderGantt()}if(e.target.id==='g-zoom'){ganttCellWidth=Number(e.target.value);renderGantt()}};
 ganttView.onclick=e=>{const b=e.target.closest('[data-g-task]');if(!b)return;jumpTask(b.dataset.gTask);if(b.hasAttribute('data-g-column')){const col=Number(b.dataset.gColumn);const matching=dated.filter(ev=>ev.task===b.dataset.gTask&&Math.floor((toDay(ev.day)-first)/bucket)===col);eventSubset=new Set(matching.map(x=>x.id));render();document.querySelectorAll('#timeline details.day').forEach(d=>d.open=true);const banner=document.createElement('div');banner.className='g-filter-note';banner.textContent='已按甘特图区间定位；使用重置筛选返回完整记录。';document.querySelector('.g-filter-note')?.remove();document.getElementById('timeline').before(banner);const firstVisible=document.querySelector('#timeline .event:not([hidden]) details');firstVisible?.closest('details.day')?.setAttribute('open','');firstVisible?.setAttribute('open','');document.getElementById('timeline-records').scrollIntoView({block:'start',behavior:'instant'});}};
 if(!ganttView.dataset.cleanupBound){ganttView.dataset.cleanupBound='true';for(const id of ['reset','search','sort','result','tasks','stages','allTasks'])document.getElementById(id).addEventListener(id==='search'?'input':['sort','result'].includes(id)?'change':'click',()=>document.querySelector('.g-filter-note')?.remove());}
}

})();

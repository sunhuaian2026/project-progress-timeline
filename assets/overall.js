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
overview.innerHTML=`<div class="v-intro"><span class="v-eyebrow">项目总览 · ${E(O.as_of.slice(0,10))}</span><h1>${E(O.headline)}</h1><p class="v-execution">${E(O.execution_label)}</p></div>
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
function phaseDetail(id){const s=O.stages.find(x=>x.id===id);if(!s)return;overview.querySelectorAll('[data-phase]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.phase===id));document.getElementById('v-phase-detail').innerHTML=`<b>${E(s.id)} · ${E(s.title)}</b><span>${E(s.detail||'暂无范围说明')}</span><details><summary>依据</summary>${sourceLinks(s.refs)}</details>`;}
phaseDetail(O.stages.find(s=>s.status==='active')?.id||O.stages[0]?.id);
function showProgressView(view){const normalized=view==='gantt'?'timeline':view;overview.hidden=normalized!=='overall';document.getElementById('timeline-view').hidden=normalized!=='timeline';for(const key of ['overall','timeline'])document.getElementById('show-'+key).setAttribute('aria-pressed',normalized===key);if(normalized==='timeline')updateThemeNavigation();}
function jumpTask(id){const target=taskButton(id);if(target){document.getElementById('reset').click();target.click();showProgressView('timeline');document.getElementById('timeline-records').scrollIntoView({block:'start',behavior:'instant'});}}
document.getElementById('show-overall').onclick=()=>showProgressView('overall');document.getElementById('show-timeline').onclick=()=>showProgressView('timeline');
overview.addEventListener('click',e=>{const t=e.target.closest('[data-overall-task]');if(t)jumpTask(t.dataset.overallTask);const phase=e.target.closest('[data-phase]');if(phase)phaseDetail(phase.dataset.phase);const date=e.target.closest('[data-date]');if(date){document.getElementById('reset').click();document.getElementById('search').value=date.dataset.date;render();showProgressView('timeline');document.getElementById('timeline-records').scrollIntoView({block:'start',behavior:'instant'});}const r=e.target.closest('[data-recent]');if(r){const event=D.events.find(x=>x.id===r.dataset.recent);jumpTask(event.task);document.querySelector(`[data-event="${CSS.escape(event.id)}"]`)?.closest('details.day')?.setAttribute('open','');document.querySelector(`[data-event="${CSS.escape(event.id)}"] details`)?.setAttribute('open','');document.querySelector(`[data-event="${CSS.escape(event.id)}"]`)?.scrollIntoView({block:'center',behavior:'instant'});}});
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

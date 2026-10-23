"""Source-based overall progress; project names, groups and gates are configuration."""
import re

def task_criteria(task, content):
    headings = [task['criteria_heading']] if task.get('criteria_heading') else ['Acceptance criteria', '验收条件', '验收标准']
    sections = []
    for heading in headings:
        sections.extend(re.findall(r'^## ' + re.escape(heading) + r'\s*$\n(.*?)(?=^## |\Z)', content, re.M | re.S))
    if len(sections) > 1:
        raise ValueError(f'Multiple acceptance sections; specify criteria_heading: {task["id"]}')
    checks = re.findall(r'^- \[([xX ])\] (.+)$', sections[0], re.M) if sections else []
    return {'checked':sum(mark.lower() == 'x' for mark, _ in checks), 'total':len(checks), 'items':[{'checked':mark.lower() == 'x','text':text} for mark,text in checks]}

def prepare_overview(config, tasks, resolve_refs):
    if not tasks:
        raise ValueError('At least one source-backed task is required')
    config = dict(config)
    task_map = {t['id']:t for t in tasks}
    current_id = config.get('current_task') or next((t['id'] for t in tasks if t['state'] == 'in-progress'), tasks[0]['id'])
    if current_id not in task_map:
        raise ValueError('Unknown current_task')
    current = task_map[current_id]

    def group(ids, label, allow_empty=False):
        if not isinstance(ids,list) or (not ids and not allow_empty) or len(set(ids)) != len(ids) or any(i not in task_map for i in ids):
            raise ValueError('Invalid task group: ' + label)
        return ids

    metrics = config.get('metrics')
    if metrics is None:
        metrics = [{'id':'tracked','label':'已验收跟踪任务','basis':'state','task_ids':list(task_map),'note':'按已关闭任务数统计，包含研究或规划任务；不是产品工作量完成率。'}, {'id':'current','label':current_id+' 清单勾选','basis':'criteria','task_id':current_id,'note':'清单勾选与任务最终验收分别统计；无清单时不计算百分比。'}]
    output_metrics = []
    metric_ids = set()
    for metric in metrics:
        mid = metric['id']
        if mid in metric_ids:
            raise ValueError('Duplicate metric id')
        metric_ids.add(mid)
        if metric['basis'] == 'state':
            ids = group(metric['task_ids'],mid)
            done,total = sum(task_map[i]['state'] == 'done' for i in ids),len(ids)
        elif metric['basis'] == 'criteria':
            if metric.get('task_id') not in task_map:
                raise ValueError('Unknown metric task_id')
            criteria = task_map[metric['task_id']]['criteria']
            done,total = criteria['checked'],criteria['total']
        else:
            raise ValueError('Metric basis must be state or criteria')
        output_metrics.append({**metric,'done':done,'total':total})
    gates = config.get('gates',[])
    group(gates,'gates',allow_empty=True)
    stages = []
    stage_ids = set()
    for stage in config.get('stages',[]):
        if stage['id'] in stage_ids or stage['status'] not in {'planned','active','stopped','blocked','done'}:
            raise ValueError('Invalid/duplicate stage')
        stage_ids.add(stage['id'])
        stages.append({**stage,'refs':resolve_refs(stage['refs'])})
    blockers = [{**b,'refs':resolve_refs(b['refs'])} for b in config.get('blockers',[])]
    related = config.get('related_sections',[])
    for section in related:
        group(section['task_ids'],section['title'])
    return {
        'current_task':current_id,
        'as_of':config.get('as_of',current.get('as_of','未记录')),
        'headline':config.get('headline','总体进度'),
        'summary':config.get('summary',current.get('summary','')),
        'next':config.get('next',current.get('next','下一步见当前任务记录。')),
        'execution_label':config.get('execution_label',{'open':'未完成','in-progress':'实施中','done':'已验收'}[current['state']]),
        'refs':resolve_refs(config['refs']) if config.get('refs') else current['refs'],
        'metrics':output_metrics,
        'stages':stages,'stages_title':config.get('stages_title','项目阶段'),
        'stages_note':config.get('stages_note','阶段不是等量工作，不按阶段数估算产品完成率。'),
        'gates':gates,'gates_title':config.get('gates_title','下一阶段门槛'),
        'gates_done':sum(task_map[i]['state'] == 'done' for i in gates),
        'blockers':blockers,'related_sections':related,
        'scope_note':config.get('scope_note',f'范围：{len(tasks)} 项当前跟踪任务。任务关闭、清单勾选与产品工作量分别统计，未定义权重时不给出整套产品完成率。'),
    }

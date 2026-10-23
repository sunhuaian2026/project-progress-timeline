#!/usr/bin/env python3
"""Validate evidence-backed data and render a private static timeline."""
import argparse
import hashlib
import html
import json
import re
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo
from overview import prepare_overview, task_criteria

STAGES = {'authorization', 'implementation', 'test', 'cr', 'fix', 'native', 'design', 'handoff', 'policy'}
RESULTS = {'passed', 'failed', 'blocked', 'deferred', 'recorded'}
EXCLUDED = {'node_modules', '.build', 'build', 'dist', 'module-cache', 'frozen-package', 'package', 'snapshot', 'snapshot-review', 'isolated-package'}

def sha(value):
    return hashlib.sha256(value).hexdigest()

def inside(root, relative):
    path = (root / relative).resolve()
    if not path.is_relative_to(root) or not path.is_file() or path.suffix != '.md':
        raise ValueError(f'Invalid Markdown source: {relative}')
    return path

def validate_time(at, precision):
    if precision == 'unknown' and at is None:
        return
    if precision == 'day' and isinstance(at, str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}', at):
        datetime.strptime(at, '%Y-%m-%d')
        return
    if precision in {'minute', 'second'} and isinstance(at, str):
        pattern = r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}' + (r':\d{2}' if precision == 'second' else '') + r'[+-]\d{2}:\d{2}'
        if re.fullmatch(pattern, at) and datetime.fromisoformat(at).utcoffset() is not None:
            return
    raise ValueError(f'Invalid event time/precision: {at}, {precision}')

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--project', type=Path, required=True)
    parser.add_argument('--data', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--inventory-only', action='store_true')
    parser.add_argument('--overview', type=Path, help='Optional project overview configuration; defaults beside the data file')
    args = parser.parse_args()
    root = args.project.resolve()
    data = json.loads(args.data.read_text())
    if data['schema_version'] != 1:
        raise ValueError('Unsupported schema')
    output = args.output.resolve()
    if not output.is_relative_to(root) or output == root or not output.name == 'site':
        raise ValueError('Output must be a dedicated site directory within the project')
    previous = {}
    if (output / 'manifest.json').exists():
        previous = json.loads((output / 'manifest.json').read_text()).get('inventory_hashes', {})
    inventory = {}
    for pattern in data['inventory']:
        for path in root.glob(pattern):
            if path.is_file() and path.suffix == '.md' and not any(p in EXCLUDED or p.startswith('snapshot-') for p in path.parts):
                relative = str(path.relative_to(root))
                inside(root, relative)
                inventory[relative] = sha(path.read_bytes())
    changes = {'new': sorted(set(inventory) - set(previous)), 'changed': sorted(p for p in inventory if p in previous and inventory[p] != previous[p]), 'removed': sorted(set(previous) - set(inventory))}
    if args.inventory_only:
        print(json.dumps(changes, ensure_ascii=False, indent=2))
        return
    sources, documents = {}, {}

    def resolve_refs(refs):
        if not refs:
            raise ValueError('Every task/event requires evidence')
        resolved = []
        for ref in refs:
            relative = ref['path']
            path = inside(root, relative)
            content = path.read_text()
            lines = content.splitlines()
            matches = [(i + 1, line) for i, line in enumerate(lines) if ref['match'] in line]
            if len(matches) != 1:
                raise ValueError(f'Evidence anchor is not unique: {relative}: {ref["match"]}')
            line, excerpt = matches[0]
            if sha(excerpt.encode()) != ref['sha256']:
                raise ValueError(f'Evidence changed; recheck facts: {relative}:{line}')
            sid = sha(relative.encode())[:20]
            sources[relative] = {'id': sid, 'sha256': sha(path.read_bytes())}
            documents[sid] = (relative, lines)
            resolved.append({'path': relative, 'line': line, 'excerpt': excerpt, 'url': f'evidence/{sid}.html#L{line}'})
        return resolved

    tasks = {}
    for task in data['tasks']:
        if task['id'] in tasks:
            raise ValueError('Duplicate task id')
        task = dict(task)
        content = inside(root, task['source']).read_text()
        state_field = task.get('state_field','State')
        state = re.search(r'^' + re.escape(state_field) + r':\s*(open|in-progress|done)\s*$', content, re.M)
        if not state:
            raise ValueError(f'Missing task state: {task["source"]}')
        if state[1] != task['expected_state']:
            raise ValueError(f'Task state changed; recheck current summary: {task["source"]}')
        task['state'] = state[1]
        task['criteria'] = task_criteria(task,content)
        task['source_sha256'] = sha(inside(root,task['source']).read_bytes())
        task['refs'] = resolve_refs(task['refs'])
        tasks[task['id']] = task
    ids = set()
    events = []
    for event in data['events']:
        if event['id'] in ids or event['task'] not in tasks:
            raise ValueError(f'Duplicate id or unknown task: {event["id"]}')
        ids.add(event['id'])
        validate_time(event['at'], event['precision'])
        if event['time_basis'] not in {'event', 'recorded'}:
            raise ValueError('time_basis must distinguish execution time from record time')
        if event['result'] not in RESULTS or not event['stages'] or not set(event['stages']).issubset(STAGES):
            raise ValueError(f'Invalid stage/result: {event["id"]}')
        event = dict(event)
        event['refs'] = resolve_refs(event['refs'])
        events.append(event)
    overview_file = (args.overview or args.data.parent / 'overview.json').resolve()
    if not overview_file.is_relative_to(root):
        raise ValueError('Overview configuration must be within the project')
    config = json.loads(overview_file.read_text()) if overview_file.exists() else {}
    if args.overview and not overview_file.exists():
        raise ValueError('Explicit overview configuration is missing')
    overall = prepare_overview(config,list(tasks.values()),resolve_refs)
    now = datetime.now(ZoneInfo('Asia/Shanghai')).isoformat(timespec='seconds')
    coverage = {'candidate_files': len(inventory), 'referenced_files': len(sources), 'unreferenced': sorted(set(inventory) - set(sources)), 'changes': changes}
    payload = {'project': data['project'], 'generated_at': now, 'tasks': list(tasks.values()), 'events': events, 'coverage': coverage, 'overview':overall, 'current_task':overall['current_task'], 'lanes':data.get('lanes',{})}
    template = (Path(__file__).resolve().parents[1] / 'assets/timeline.html').read_text()
    encoded = json.dumps(payload, ensure_ascii=False).replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')
    theme_dir = Path(__file__).resolve().parents[1] / 'assets/themes'
    themes = {name: (theme_dir / (name + '.css')).read_text() for name in ('clear', 'night', 'journal')}
    encoded_themes = json.dumps(themes, ensure_ascii=False).replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')
    rendered = template.replace('/*__TIMELINE_DATA__*/', encoded).replace('/*__TIMELINE_THEMES__*/', encoded_themes).replace('/*__DEFAULT_THEME__*/', themes['clear'])
    overview_dir = Path(__file__).resolve().parents[1] / 'assets'
    css = (overview_dir/'overall.css').read_text()
    js = (overview_dir/'overall.js').read_text()
    nav = '<nav class="view-switch" aria-label="进度视图"><button id="show-overall" aria-pressed="true">总体进度</button><button id="show-timeline" aria-pressed="false">开发时间轴</button></nav><section id="overall-view" aria-label="总体进度"></section><div id="timeline-view" hidden>'
    if rendered.count('<main>') != 1 or rendered.count('</main>') != 1:
        raise ValueError('Invalid template layout')
    rendered = rendered.replace('<main>','<main>'+nav,1).replace('</main>','</div></main>',1).replace('</head>','<style>'+css+'</style></head>',1).replace('</body>','<script>'+js+'</script></body>',1)
    # Validate everything before writing; referenced sources alone enter the web root.
    output.mkdir(parents=True, exist_ok=True)
    (output / 'evidence').mkdir(exist_ok=True)
    for sid, (relative, lines) in documents.items():
        rows = ''.join(f'<div id="L{i}"><a href="#L{i}">{i}</a><code>{html.escape(line)}</code></div>' for i, line in enumerate(lines, 1))
        doc = '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="data:,"><title>记录证据</title><style>body{margin:32px;font:15px/1.8 system-ui;color:#213547}h1{font-size:18px;overflow-wrap:anywhere}div{display:flex;gap:20px}div a{min-width:36px;color:#63788e}code{white-space:pre-wrap;overflow-wrap:anywhere;font-family:inherit}div:target{background:#fff1ca}a:focus-visible{outline:2px solid #165fc0}</style><a href="../index.html">返回开发进度</a><h1>' + html.escape(relative) + '</h1>' + rows + '</html>'
        (output / 'evidence' / f'{sid}.html').write_text(doc)
    allowed = {sid + '.html' for sid in documents}
    for stale in (output / 'evidence').glob('*.html'):
        if stale.name not in allowed:
            stale.unlink()  # Only stale generated evidence pages, never project sources.
    manifest = {'generated_at': now, 'data_sha256': sha(args.data.read_bytes()), 'sources': sources, 'inventory_hashes': inventory, 'coverage': coverage, 'events': len(events), 'themes': list(themes), 'overall':{'config_sha256':sha(overview_file.read_bytes()) if overview_file.exists() else None, 'metrics':overall['metrics'], 'gates_done':overall['gates_done'], 'gates_total':len(overall['gates']), 'task_source_hashes':{t['id']:t['source_sha256'] for t in tasks.values()}}}
    (output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    (output / 'overall.json').write_text(json.dumps({**overall,'tasks':list(tasks.values())},ensure_ascii=False,indent=2))
    (output / 'coverage.json').write_text(json.dumps(coverage, ensure_ascii=False, indent=2))
    (output / 'index.html').write_text(rendered)
    for name in themes:
        redirect = '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>开发进度主题</title><p><a href="index.html?theme=' + name + '">打开对应主题</a></p><script>location.replace("index.html?theme=' + name + '")</script></html>'
        (output / f'variant-{name}.html').write_text(redirect)
    print(json.dumps({'output': str(output), 'events': len(events), 'referenced_files': len(sources), 'candidate_files': len(inventory)}, ensure_ascii=False))

if __name__ == '__main__':
    main()

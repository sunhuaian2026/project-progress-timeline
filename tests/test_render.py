"""Behavioral checks using synthetic sources; no live user data or services."""
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / 'scripts' / 'render.py'


class RenderTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name) / 'project'
        shutil.copytree(ROOT / 'examples' / 'demo', self.root,
                        ignore=shutil.ignore_patterns('site', '__pycache__'))
        self.data = self.root / 'progress' / 'timeline.json'
        self.site = self.root / 'site'

    def tearDown(self):
        self.temp.cleanup()

    def render(self, *extra):
        return subprocess.run([sys.executable, str(SCRIPT), '--project', str(self.root),
                               '--data', str(self.data), '--output', str(self.site), *extra],
                              text=True, capture_output=True)

    def modify(self, callback):
        data = json.loads(self.data.read_text())
        callback(data)
        self.data.write_text(json.dumps(data, ensure_ascii=False))

    def test_demo_and_evidence_integrity(self):
        result = self.render()
        self.assertEqual(result.returncode, 0, result.stderr)
        manifest = json.loads((self.site / 'manifest.json').read_text())
        source = json.loads(self.data.read_text())
        self.assertEqual(manifest['events'], len(source['events']))
        self.assertEqual(manifest['themes'], ['clear', 'night', 'journal'])
        self.assertEqual(len(manifest['overall']['task_source_hashes']), 8)
        self.assertEqual([(m['done'], m['total']) for m in manifest['overall']['metrics']],
                         [(3, 3), (0, 3), (2, 3)])
        for path, record in manifest['sources'].items():
            self.assertEqual(record['sha256'], hashlib.sha256((self.root / path).read_bytes()).hexdigest())
            self.assertTrue((self.site / 'evidence' / (record['id'] + '.html')).is_file())
        self.assertFalse((self.site / 'tasks').exists())

    def test_source_state_drift_keeps_previous_page(self):
        self.assertEqual(self.render().returncode, 0)
        before = (self.site / 'index.html').read_bytes()
        p = self.root / 'tasks' / 'B1.md'
        p.write_text(p.read_text().replace('State: done', 'State: open'))
        result = self.render()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Task state changed', result.stderr)
        self.assertEqual((self.site / 'index.html').read_bytes(), before)

    def test_evidence_drift_rejected(self):
        p = self.root / 'roadmap.md'
        p.write_text(p.read_text().replace('本目录所有任务、日期与结果都是虚构示例。',
                                           '本目录所有任务、日期与结果都是虚构示例。内容已变化。'))
        result = self.render()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Evidence changed', result.stderr)
        self.assertFalse(self.site.exists())

    def test_ambiguous_anchor_rejected(self):
        p = self.root / 'roadmap.md'
        p.write_text(p.read_text() + '\n本目录所有任务、日期与结果都是虚构示例。\n')
        result = self.render()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Evidence anchor is not unique', result.stderr)

    def test_source_path_escape_rejected(self):
        self.modify(lambda d: d['tasks'][0]['refs'][0].update(path='../outside.md'))
        (self.root.parent / 'outside.md').write_text('State: done\n')
        result = self.render()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Invalid Markdown source', result.stderr)

    def test_invalid_time_precision_rejected(self):
        self.modify(lambda d: d['events'][0].update(precision='second'))
        result = self.render()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Invalid event time/precision', result.stderr)

    def test_duplicate_event_id_rejected(self):
        self.modify(lambda d: d['events'].append(d['events'][0].copy()))
        result = self.render()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Duplicate id', result.stderr)

    def test_unknown_checklist_remains_unknown(self):
        config = self.root / 'progress' / 'overview.json'
        data = json.loads(config.read_text())
        data['metrics'].append(dict(id='unknown', label='Unknown', basis='criteria', task_id='S1'))
        config.write_text(json.dumps(data, ensure_ascii=False))
        result = self.render()
        self.assertEqual(result.returncode, 0, result.stderr)
        metric = json.loads((self.site / 'manifest.json').read_text())['overall']['metrics'][-1]
        self.assertEqual((metric['done'], metric['total']), (0, 0))

    def test_inventory_is_read_only(self):
        result = self.render('--inventory-only')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('tasks/B1.md', json.loads(result.stdout)['new'])
        self.assertFalse(self.site.exists())

    def test_output_must_be_dedicated_site(self):
        result = self.render('--output', str(self.root))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Output must be a dedicated site', result.stderr)

    def test_evidence_pages_escape_source_html(self):
        p = self.root / 'tasks' / 'S1.md'
        p.write_text(p.read_text() + '\n<script>alert("synthetic")</script>\n')
        result = self.render()
        self.assertEqual(result.returncode, 0, result.stderr)
        sid = hashlib.sha256(b'tasks/S1.md').hexdigest()[:20]
        page = (self.site / 'evidence' / (sid + '.html')).read_text()
        self.assertIn('&lt;script&gt;', page)
        self.assertNotIn('<script>', page)

    def test_no_overview_uses_generic_defaults(self):
        (self.root / 'progress' / 'overview.json').unlink()
        result = self.render()
        self.assertEqual(result.returncode, 0, result.stderr)
        metrics = json.loads((self.site / 'manifest.json').read_text())['overall']['metrics']
        self.assertEqual((metrics[0]['done'], metrics[0]['total']), (3, 8))


if __name__ == '__main__':
    unittest.main()

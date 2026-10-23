# Project Progress Timeline

Turn Markdown tasks and acceptance records into an evidence-backed, static project dashboard.

[中文说明](README.md) · [Data schema (Chinese)](references/schema.md) · [MIT license](LICENSE)

This is a local Codex skill and a standalone Python renderer. It uses the Python standard library, requires no API keys or frontend build, and ships a Chinese-language interface.

![Synthetic project overview](docs/images/overview.png)

Version 1.1 adds an optional, evidence-backed five-part reporting preface on the **same homepage**, preserving every existing progress chart below it. A numbered right outline follows the content edge, stays vertically centered and highlights the current section. See the demo's `overview.json` and [report schema](references/schema.md); omit `report` to retain the developer overview. Missing schedule baselines or business measurements remain explicitly unknown.

## Features

- Visual overview with stage navigation, task groups, acceptance checklists, activity distribution, and recent records.
- A Gantt-style record-coverage chart at the top of the development timeline, followed by collapsible daily records.
- Unique Markdown line anchors and SHA-256 checks. Changed task states or evidence lines stop generation until reviewed.
- Three themes with preference persistence, task/stage/result filters, text search, and chronological sorting.

All screenshots and examples are fictional. They contain no real project records.

## Install with one sentence

Send this to your Codex agent:

```text
Install this skill for me: https://github.com/sunhuaian2026/project-progress-timeline
```

Then start a new conversation and ask:

```text
Use $project-progress-timeline to review this project's tasks and acceptance evidence, then refresh its progress dashboard.
```

For reporting, ask for a conclusion-first project report while keeping the complete progress charts. The agent handles the host's installation workflow and checks existing local customizations. Codex has been verified; other agent hosts require separate discovery and installation checks.

<details>
<summary>Manual installation (fallback)</summary>

Requires Git and Python 3.10+ with IANA timezone data. Run on the host that actually executes Codex:

```bash
git clone https://github.com/sunhuaian2026/project-progress-timeline.git \
  "$HOME/.codex/skills/project-progress-timeline"
```

If `CODEX_HOME` is configured, use `$CODEX_HOME/skills/project-progress-timeline`. Back up and review existing local customizations before replacing an installation. Alternatively, download a [release ZIP](https://github.com/sunhuaian2026/project-progress-timeline/releases).

</details>

The skill is not a background scheduler and does not independently infer completion from Git activity.

## Run the example

From the repository root:

```bash
python3 scripts/render.py \
  --project examples/demo \
  --data examples/demo/progress/timeline.json \
  --output examples/demo/site

python3 -m http.server 8080 --bind 127.0.0.1 --directory examples/demo/site
```

Open [the local demo](http://127.0.0.1:8080/). Output must be inside the project and the final directory must be named `site`. Add `--inventory-only` to inspect changed candidate sources without publishing a new snapshot.

See `examples/demo/` for complete task, event, overview, and line-hash inputs. When a source changes, review the facts before changing its hash.

## What the charts mean

Closed-task counts cover the listed tasks only. Checkbox progress is distinct from task closure. Gantt bars span the first and last aggregated records; they do not represent actual task start/end, working time, future schedules, or dependencies. Activity bars count records rather than productivity. Unknown dates remain unknown; long histories use explicitly labeled seven-day buckets.

The renderer does not support planned-versus-actual schedules, critical paths, team permissions, or automatic background updates. Generated-time labels use `Asia/Shanghai`; adapt and validate the UI for other timezone conventions. The static page requires JavaScript. Chromium has been checked locally; other browsers and complete screen-reader behavior require separate verification.

## Privacy

**Evidence pages include the full referenced Markdown file**, not just the anchored line. Project-relative paths, summaries, and unreferenced candidate paths can also appear in the output. Review all generated files and their source documents before publishing. Hash validation is not redaction. No telemetry or automatic uploads are included.

## Verify

```bash
python3 -m unittest discover -s tests -v
```

CI runs the renderer tests on Linux with Python 3.10, 3.12 and 3.14. The runtime has no third-party Python dependencies. See [CONTRIBUTING.md](CONTRIBUTING.md) for changes and UI checks.

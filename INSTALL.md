# Agent 安装说明

用户只需提出安装请求并提供本仓库链接。以下步骤由执行安装的 Agent 处理，不要求用户手动选择目录或执行命令。

## 识别当前宿主与执行主机

先确认自己运行在 Codex、Claude Code、Cursor 或 Zcode，以及真正执行工具的机器。不要根据机器装了哪些工具来猜当前宿主。远程会话安装在实际执行主机，遵循用户及宿主的权限规则。

| 当前宿主 | 用户级默认目录 | 项目级目录 | 使用方式 |
|---|---|---|---|
| Codex | `$CODEX_HOME/skills/project-progress-timeline`；未配置时 `~/.codex/skills/project-progress-timeline` | 按当前 Codex 版本的项目 Skill 规则 | `$project-progress-timeline` 或自然语言 |
| Claude Code | `~/.claude/skills/project-progress-timeline` | `.claude/skills/project-progress-timeline` | `/project-progress-timeline` 或自然语言 |
| Cursor | `~/.cursor/skills/project-progress-timeline` | `.cursor/skills/project-progress-timeline` | `/` 搜索技能名或自然语言 |
| Zcode | `~/.zcode/skills/project-progress-timeline` | `.zcode/skills/project-progress-timeline` | `$project-progress-timeline` 或技能菜单 |

默认安装到当前宿主的用户级目录；用户指定项目级时按其要求执行。不默认给所有已安装的 Agent 各装一份。云端或远程会话不能假定能访问客户端的用户级技能。

## 下载与安装

1. 阅读仓库的 `SKILL.md` 及所带脚本，确认范围。此仓库根目录就是一个 Skill，名称是 `project-progress-timeline`；`agents/openai.yaml` 是 Codex 可选元数据，其他宿主使用通用 `SKILL.md` 与脚本。
2. 检查目标是否已存在，包括软链。已有版本时先比较、备份并遵守本机定制保护；不自动覆盖、不删除或改名已有目录来绕过保护。
3. 使用宿主的 GitHub Skill 安装器，或下载仓库/Release 到临时目录，再把完整 Skill 放到上述目标。保留 `SKILL.md`、`scripts/`、`assets/`、`references/`；不是只下载一个 Markdown 文件。不要把普通仓库地址当成所有宿主都支持的插件市场地址。
4. Codex 官方安装器若需要参数：本仓库的 `--path` 是 `.`，`--name` 是 `project-progress-timeline`。其他宿主可以将仓库克隆到正确目录；有 GitHub 下载能力时也可解压 Release ZIP。
5. 核对 Python 3.10+ 与 IANA 时区数据。依赖不满足时报告具体缺口，不自动升级系统或扩大权限。

Cursor 的 Customize → From GitHub Repository 使用插件市场格式。本仓库目前是原生 Skill，并不提供该界面导入所需的 `.cursor-plugin/marketplace.json`；请由 Agent 安装到本地技能目录，不能宣称支持插件一键导入。

## 验证后再报告成功

- 确认目标下 `SKILL.md` 的 name 为 `project-progress-timeline`，脚本、模板、主题及引用文件齐全。
- 将 `examples/demo` 复制到临时目录，运行已安装的 `scripts/render.py --project <临时示例> --data <临时示例>/progress/timeline.json --output <临时示例>/site`；确认退出成功以及 HTML 和证据页真实生成。此测试只用合成数据，不触碰用户项目。
- 刷新宿主技能列表或开启新会话，确认能找到该技能。Zcode CLI 可用 `zcode skills list --json`；Zcode App 可在设置 → 技能中刷新。其他宿主按其当前机制核对。
- 安装文件成功、宿主发现成功、Agent 实际调用成功分别报告。缺少宿主/凭证/交互界面时写明未验证，不以目录存在或模型自述替代调用验收。
- 清理本轮临时下载与合成测试产物，保留必要结果。告诉用户如何调用；需要刷新/新会话时明确说明。

## 兼容依据与已测边界

| 宿主 | 当前证据 | 未验证边界 |
|---|---|---|
| Codex | 已有本机实际使用；官方 GitHub 安装器在空白临时目录安装成功，安装包渲染合成示例成功 | 新用户仅用一句自然语言触发的完整安装对话未单独验收 |
| Claude Code | 官方支持 `SKILL.md`、附带脚本及个人/项目技能目录；本 Skill 无 Claude 不支持的必填前置工具 | 未在 Claude Code 会话里执行本 Skill 的完整安装与调用 |
| Cursor | 官方支持同格式与技能目录；本 Skill 的静态生成器无 Cursor 专属依赖 | 当前验证主机无 Cursor CLI，未做界面发现/调用；不支持本仓库直接作为插件市场导入 |
| Zcode | 本机 CLI 0.16.9 在隔离项目目录发现了此 Skill，名称、描述与路径正确；安装副本渲染合成示例成功 | 未验收 App 刷新与模型实际调用，未做完整自然语言安装对话 |

这些记录是验证范围，不保证所有宿主版本、操作系统、组织策略或网络环境均可安装。生成器只要求可运行 Python；不依赖 Codex 专属 API。宿主调用与安装权限仍由各 Agent 自身决定。

官方依据：[Claude Code Skills](https://code.claude.com/docs/en/skills)、[Cursor Agent Skills](https://cursor.com/docs/skills)、[Zcode Skill](https://zcode.z.ai/cn/docs/skill)。

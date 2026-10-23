# Timeline data (version 1)

`timeline.json` 包含：

- `schema_version`: 1。
- `project`: 项目名称。
- `inventory`: 相对项目根目录的 Markdown glob 列表。限定真实记录目录；脚本排除 package/build/snapshot 副本。
- `tasks`: `{id, title, lane, source, expected_state, summary, next, as_of, refs}`。source 是含 `State:` 的项目相对路径；expected_state 是上次核实的 open/in-progress/done，与当前源不同则停止生成并要求复核摘要；lane 建议 implementation/design/planning，也支持项目自己的分组（可用顶层 `lanes` 字典提供中文标签）。可选 `state_field` 指定实际状态字段，例如 Status；值仍为上述三态，不凭空修改原文。可选 `criteria_heading` 指定验收章节，默认识别 Acceptance criteria / 验收条件 / 验收标准，多个章节需显式选择。summary/next 为已核实的当前状态，as_of 是状态记录时刻或日期，refs 使用下述证据结构。证据与后续任务状态冲突时先处理冲突，不沿用旧摘要。
- `events`: `{id, task, at, precision, time_basis, stages, result, title, summary, scope, actor?, version?, refs}`。time_basis 用 event 表示已核实的执行时间，用 recorded 表示截至该时刻的记录/汇总，页面应明确标出记录时刻。

`at` 使用带偏移的 ISO8601 时间，或 YYYY-MM-DD，日期缺失为 null；precision 对应 minute/second/day/unknown。时区使用用户约定。stages 可多选 authorization/implementation/test/cr/fix/native/design/handoff/policy。result 使用 passed/failed/blocked/deferred/recorded；scope 描述“离线阶段”“历史包实机”等结论适用范围。记录时间与实际执行时间不同，须在 summary 中说明。

`refs`: 至少一项 `{path, match, sha256}`，path 相对项目根且指向 Markdown。match 是原文某一行中的唯一字符串；sha256 是该完整行（不含换行）的 UTF-8 SHA256。渲染时必须匹配唯一行并核实哈希，来源漂移时停止生成该版，重新读原文并核对事实后更新。多行证据可使用多个 refs。

汇总引用并不表示已读取文件中所有事件。coverage 中 referenced/unreferenced 只表示文件引用范围；未引用的候选文件包含草案、重复报告和未核实事件，需人工判定。事件数量不作为工作量或完成率。

## 可选 overview.json

同数据目录的总体配置，或通过 `--overview` 指定项目根内的 JSON。配置不存在时按已有任务生成通用总体页；不用创建虚假的阶段或门槛。

- `current_task`：实际当前任务 ID；省略时选择首个 in-progress，其次首任务。
- `as_of / headline / summary / next / execution_label / refs`：已核实的总体状态与证据；省略时沿用当前任务。
- `metrics`：`{id, label, basis, note?, task_ids? , task_id?}` 列表。basis=state 使用 task_ids 的已 done 数/总数；basis=criteria 使用单个 task_id 的正式清单。数值由脚本计算，不接受手工百分比。
- `stages`：`{id,title,status,detail?,highlight?,refs}` 列表；status=planned/active/stopped/blocked/done。阶段状态由 agent 据证据核实，不按其数量折算产品工作量。可用 `stages_title / stages_note` 提供项目说明。
- `gates`：进入下一阶段必须关闭的 task ID 列表，配 `gates_title`；每项由 task 状态判断，不以单测通过代替关闭。
- `blockers`：`{title,detail,refs}` 列表，沿用锚点/哈希校验。
- `related_sections`：`{title,task_ids,note?}` 列表，例如研究分组；未配置则不展示。
- `scope_note`：统计范围与限制；省略时按当前跟踪任务数量说明。不要将研究交付 100% 解释成产品功能 100%。

更新任务状态或移走历史记录时先复核/修正来源；校验失败保留旧页面，不直接改哈希骗过检查。所有项目共享渲染能力，事实数据、分组与阶段保存在各自项目。

## 图表的计算与交互

阶段路线沿用 `stages` 的顺序和状态；点选阶段显示其 `detail` 和 `refs`。没有阶段数据时省略路线。分组任务格沿用 `metrics`，正式复选矩阵来自任务来源的清单；状态计数与清单计数独立，分母为零显示未知。没有复选清单不推断AC数量。

记录分布按 `at` 的日期和 `result` 分组，不按文件mtime；`at: null` 的记录只进入完整时间轴并显示未记日期数量。点柱体以日期筛选，最近记录点选对应任务和事件。时间轴默认保留标题/阶段/结果，展开后显示原始摘要、适用范围及全部证据。没有可比耗时或权重时，不绘制工时占比或整产品完成率。

## 甘特视图

使用现有 `tasks` 与 `events`，不新增必填数据字段。每任务横条连接该任务已聚合事件最早与最晚的 `at` 日期，叠加记录点；点内数字为同日事件数，包含失败/blocked时用“!”提示。横条仅表达“记录覆盖区间”，不是任务连续运行、投入工时、真实开工/完工或计划日程。

只有单日记录时显示单点；没有有日期事件的任务显示“暂无有日期记录”，其状态与未知日期事件仍保留在列表。`precision: day` 保持日期精度，不补小时；`at: null` 不进入横轴。跨度大于120天按7日分组展示并明确标注，点选后查看该组的原始事件。未来任务没有明确日期来源时不绘排期；本版不支持计划/实际对照或依赖箭头，不能由首末记录推断依赖、关键路径或工期。

甘特图按已配置metric任务组及剩余lane分组，提供任务状态筛选和紧凑/标准/放大刻度；分组名是统计分组，不推断依赖。日期标题使用年月与日两层、固定任务列，记录数一直可读，历史失败/受阻使用独立红点标识，不覆盖当前任务状态。

时间轴以有日期的日分组及独立未知日期组展示，支持逐日/全部开合；原始摘要与证据仍在事件内。默认最近一天展开，已手动开合按日期在当前页面保留；过滤后的标题计数来自当前实际匹配记录。定位某条记录时展开其所属日，不能因折叠而丢失证据入口。

甘特图内嵌于开发时间轴顶部，日记录位于下方；不再提供独立甘特标签。`?view=timeline` 与旧 `?view=gantt` 都打开此板块。从图上的任务/记录点定位到下方目标日，并保留筛选和证据；顶部“查看按天记录”可跳过图表。总体进度页不重复显示图表。

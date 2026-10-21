# 视觉与交互规范

本文件规定网站的长期视觉方向。职业定位与内容真实性以 [business.md](business.md) 为准，代码组织以 [coding-style.md](coding-style.md) 为准。具体颜色、尺寸及复用样式以 `src/styles/global.css` 为唯一实现来源；本文说明如何使用，不复制一套设计值。

## 设计原则

**Engineering Portfolio, not SCADA Dashboard.** 以专业、简洁、理性的工程作品集为主体。招聘人员应先看到职业方向、个人贡献、实现方法和验证证据，再看到装饰。允许少量工业控制台语汇帮助阅读技术内容，不将整站做成操作界面。

- 信息顺序：首屏说明身份、方向、代表能力及联系入口 → 精选项目与工程证据 → 经历与教育 → 集中联系区；Blog 为补充。
- 大标题、适度留白、清楚的正文层级与细边框建立秩序。背景和装饰不承担关键信息。
- 项目卡片优先呈现仿真环境、个人实现、测试或联调证据和真实源码/Demo 链接。没有提供的架构图、指标、运行状态或演示不补造。
- 工业语汇限于等宽的年份、技术参数、工具名、标签与确有依据的架构示意。状态色只对应真实状态，不以绿色暗示项目已投产。

## 主题与色彩

本轮只有深色主题。`global.css` 的 `--bg`、`--surface`、`--card` 负责背景层级；`--text`、`--text-secondary`、`--text-muted` 负责文字层级；`--accent` 表示链接和关键提示；`--primary` 表示主要动作。低饱和蓝灰是主色，不新增霓虹渐变作为页面或卡片的常规外观。

- 文字与底色选择以可读性为先：普通文字目标 WCAG AA 对比度至少 4.5:1；可辨识的交互边界和焦点状态至少 3:1。不能单靠颜色说明筛选、状态或链接含义。
- `--border` 与 `--border-light` 用于卡片分隔；按钮和表单边界使用对比更强的 `--border-control`。焦点使用全局 `:focus-visible` 的轮廓，不以 hover 代替。
- `--success`、`--warning`、`--danger` 只用于经事实确认且需要语义区分的状态。项目生命周期未知时省略状态标签。
- 新增或修改颜色时检查实际前景/背景组合，更新 `pnpm run verify:design` 的代表性配对；脚本覆盖常用 token 配对，仍需用浏览器审查真实页面与其他组合。

## 排版与布局

- 正文用系统 sans，技术元数据和短标签用 `--font-mono`。长段经历、项目描述和文章正文保持 sans，不用全页等宽字体。
- 每页一个 h1，章节用 h2，卡片标题用 h3 或按真实层级选择；字号由 `--size-*` 控制。`eyebrow` 是辅助标注，不能替代标题。
- 使用 `.container` 作为宽版页面边界、`.container--text` 作为文章和窄阅读内容边界；组件内部通过 `--space-*`、`--section-gap`、`--page-gutter` 建立间距。窄屏改为单列并保留自然换行。
- 长技术名、链接和代码片段允许换行或局部横向滚动，不裁掉关键内容。固定导航下的主标题与页内锚点应有可见空间。
- 主导航每个入口使用等宽单元，图标、标签和激活状态保持相同的对齐区域；在 320px 宽度也不能截断标签。

## 组件用法

| 需求 | 现有用法 | 生成约束 |
| --- | --- | --- |
| 主要与次要动作 | `.action-link`、`.action-link--primary` | 一屏只强调最有用的主要动作；href 必须真实有效 |
| 项目、经历与文章卡片 | `.surface-card`、`--card-padding` | 一致的边框、圆角、内边距；结构和内容按领域组件维护 |
| 技术栈、领域和年份 | `.tag-list`、`.tag`、`.technical-meta` | 标签是阅读辅助，不用密集假仪表或“熟练度”条 |
| 小节标注与标题 | `.eyebrow`、`.section-heading` | 用真实标题层级表达页面结构 |
| 正文与空状态 | `.prose`、`.empty-state` | 文章长文与无内容状态保持可读，不用占位事实 |
| 页面引言 | `.page-intro` | Projects 与 Blog 等内容页复用次要正文色和阅读宽度 |
| 长项目与经历 | 原生 `<details>`、`.detail-disclosure` | 默认展示身份、简介和首要贡献；长项目预览首条与末条要点。展开后只显示一份按原顺序排列的完整 bullet list，提示切换为 `Show less`，无 JavaScript 时仍可操作 |

共享 recipe 放在 `global.css`，领域布局和局部状态放在 Astro scoped CSS。新组件先复用现有 token 与 recipe；确实多处使用时再增加共享规则。旧版未被页面使用的 ExperienceHero、ExperienceFeatured、ExperienceStats、ExperienceTechSummary 源文件含历史视觉写法，不作为新页面样式模板；重新启用前应先核对事实和本规范。

## 动效与访问方式

首页粒子以昨天之前的最后一次提交 `e9ea692`（2026-06-06）为回溯基准，使用 `particles.js`：`Home.astro` 中的 `#particles-js` 容器和原版加载脚本、`src/assets/particles.json` 原配置、`src/assets/js/particles.min.js` 供应商脚本。恢复 160 个白色粒子、移动速度 1、透明度动画及原版径向渐变背景，容器不再额外降低透明度。粒子仅在 Hero 内，低于正文且不接收指针事件。原版只在页面加载时检查 `prefers-reduced-motion`；开启减少动效时不加载供应商脚本、不创建 canvas，切换偏好后需重新加载页面才能应用。关闭 JavaScript 时不会生成粒子。文字和链接不依赖粒子显示。

交互要能通过键盘使用，焦点清楚可见；筛选按钮同时提供文字、`aria-pressed` 和可读的结果数量。移动端优先保证导航、项目证据和联系入口可达。图像有合适的 alt 与尺寸；纯装饰使用空 alt 或 `aria-hidden`。

## 生成后的验收

1. 核对 Home、About、Projects、Blog 的标题层级、卡片、按钮、技术标注和空状态是否一致。
2. 在至少桌面和 390px/320px 视口检查导航遮挡、横向溢出、长文字换行和焦点可见性。
3. 对新颜色运行 `pnpm run verify:design`，对代码改动运行 `pnpm run build`；改变列表/导航时按 [workflows.md](workflows.md) 运行 `verify:site`。
4. 检查正常与减少动效偏好下的 Hero，以及禁用 JavaScript 时的关键信息。未实际执行的浏览器、WCAG 全站审计或性能检查不要写成已通过。

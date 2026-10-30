# 项目展示与 MDX 维护规范

每个项目维护一个 `src/content/projects/<name>.mdx`。顶部 frontmatter 保存卡片、概览与排序所需的数据，正文直接写 Markdown。沿用 Hybrid Case Study、现有深色 token 与 [business.md](business.md) 的事实边界。

## 页面与组件

| 职责 | 实现 |
| --- | --- |
| 列表与首页精选 | `ProjectCard.astro`；列表传入 `layout="wide"`，首页默认 compact，保持单一详情入口 |
| 详情外壳、Hero 与目录 | `ProjectDetailLayout.astro`、`ProjectHero.astro`、`ProjectContents.astro`；复用 `Layout.astro` |
| Markdown 章节 | `remark-projects.mjs` 从 `##` 自动生成目录与 `ProjectSection.astro` |
| 正文图片、视频与 Figure | `<Figure />` → `ProjectFigure.astro` → `ProjectMedia.astro`；复用原图、Caption 与视频播放器 |
| 媒体分组 | `<Gallery layout="comparison|sequence|featured">`；默认 featured |
| 测试记录 | `<Test />` → `ProjectTest.astro`；预期、实际结果与可选证据链接 |
| 选择与校验 | `content.ts` 负责排序与 slug 唯一性；`project-schema.ts` 共用媒体/测试契约，`project-media.ts` 检查本地视频 |

`/projects/[slug]/` 保持不变，链接通过 `getProjectPath()` 统一生成根路径。`Figure`、`Gallery` 和 `Test` 由布局注入，不需要逐篇导入；图片使用普通的 default import。没有客户端框架或新增内容服务。

首页卡片优先显示标题，列表在桌面采用左图右文，窄屏统一单列；卡片只显示前三项核心技术，详情保留完整技术列表。当前项目列表暂不显示分类筛选，分类仍作为元数据展示，不根据项目数自行切换交互。

`ProjectHero` 负责标题、摘要、角色和元数据，成果媒体由详情布局在正文起点渲染一次。桌面目录与成果媒体并排并保持 sticky，窄屏目录为媒体前的原生 `<details>`。章节编号与标题同行，正文约 70ch，媒体按内容列宽展示；章节锚点与 Figure 编号规则不变。

## 顶部元数据

| 字段 | 用途 |
| --- | --- |
| `title` / `slug` / `summary` | 标题、稳定的公开 URL、事实摘要；slug 跨项目唯一 |
| `category` | Controls & Automation / SCADA / Systems Integration / Software Engineering |
| `projectType` / `role` | 实际项目性质与个人贡献 |
| `techStack` | 3–5 个核心技术 |
| `period` / `year` / `status` | 可选时间、排序年份与 Completed / In Progress；未知时省略 |
| `links` | `{ label, url }[]`，真实 HTTP(S) 地址 |
| `featured` / `order` | 首页显式精选与同组排序，行为不变 |
| `hero` | 可选成果媒体对象；只在顶部显示一次，自动为 Figure 01 |
| `cover` | 可选 `{ src, alt }`；不提供时卡片复用 Hero 图片或 Poster |

Hero 的 `id/type/src/title/alt/caption` 必需。`type` 为 image、video 或 embed；后两种还需要 `poster`。Hero 图片和 Poster 路径相对 MDX 文件，用 collection 的 `image()` 校验。其余媒体字段与下文 Figure 一致。

旧 `sections/paragraphs/media/featuredMedia/coverMedia` 不再使用；媒体不填写所属章节或 `order`，直接放在需要阅读的位置。

## 正文与章节

从 `## Overview` 等二级标题开始，项目唯一 h1 来自元数据。普通段落、列表、链接、引用和 fenced code blocks 使用 Markdown。技术章节按内容组织，不强制四个固定章节。重要证据就近放置，测试记录区分预期和实际，未来计划明确说明。

章节 ID 默认从标题生成。需要保留旧锚点或稳定外链时，在标题末尾写 `[#architecture]`，例如 `## Architecture & approach [#architecture]`；标记不会显示在页面。ID 使用小写字母、数字和连字符，不能重复或使用保留值 hero。改标题时保留显式 ID 可避免外链失效。

## 图片、视频与测试

以下使用已存在的 SCADA 图片，内容说明仍须以实际证据为准：

```mdx
import commandFailure from "#assets/projects/feeder/command-failure.png";

## Command-feedback validation [#command-validation]

The command request and breaker feedback are checked separately.

<Figure
  id="command-failure"
  src={commandFailure}
  title="Breaker command failure"
  alt="Command Failure reads FAILED while breaker feedback remains CLOSED."
  caption="The screenshot shows failed command status with unchanged breaker feedback."
/>

<Test
  scenario="Missing command feedback"
  expected="Missing feedback raises a command-failure alarm."
  result="The screenshot shows FAILED command status and an active alarm."
  evidence="command-failure"
/>
```

- 图片 Figure 默认 `type="image"`；`src` 引用直接导入的本地图片，保留 Astro 响应式优化。PNG、JPEG、WebP 与 SVG 等沿用 Astro 支持的格式。
- 视频填写 `type="video"`、真实 public 路径或 HTTPS MP4/WebM URL，以及 `poster={importedImage}`。原生 controls、playsinline、`preload="none"`，无自动播放或循环。
- 外部视频填写 `type="embed"`、规范 YouTube watch/youtu.be 或 Vimeo URL，以及导入的 Poster；点击后才创建 iframe，无 JavaScript 时仍能打开原网站。
- 每项媒体的 `id/title/alt/caption` 必需，ID 和 title 使用字面量；`sourceUrl` 可选。Alt 描述可见状态，caption 解释证据及限制，两者不能互相代替。`aspectRatio="native"` 可保留长截图比例，默认 16:9，使用 contain。
- 视频可选 `highlights`、`description`、`timestamps` 与 `captions: { src, language, label }`，使用 MDX 属性表达式传入数组/对象。字幕为真实 WebVTT，文件会检查存在性；不虚构声音或时间点。
- `<Gallery layout="comparison">` 内放两项 Figure；sequence 至少两项，并自动显示 Step 编号；featured 可顺序堆叠。Gallery 只容纳 Figure，窄屏比较图自动单列。
- Figure 编号按 Hero → 正文实际顺序生成，不能手填 number 或 step。同一媒体源或 Poster 不重复展示；测试通过 `evidence="media-id"` 引用已登记的 Figure。未知引用、重复 ID/来源、错误分组会使构建失败。
- Test 的 scenario、expected、result 必需，evidence 可选；没有截图时保留书面来源，不能用占位图片冒充结果。正文来源直接使用 Markdown 链接。

## 新增或修改案例

1. 从 [template.mdx.txt](../../src/content/projects/template.mdx.txt) 复制，替换为真实事实后保存为 `.mdx`；模板自身不发布。
2. 核对标题、角色、生命周期状态、项目性质与证据来源；保留参考教程归属，不将个人仿真描述为现场投运。
3. 有真实成果时配置 Hero；否则省略。卡片自动复用其图片或 Poster。
4. 正文使用 Markdown，就近插入 Figure、Gallery 与 Test；媒体保存在现有 assets/public 目录，使用真实本地文件和来源。
5. 执行 `pnpm run build`、`pnpm run verify:site`、`pnpm run verify:output`，核对既有 URL/锚点、目录、Figure 引用和资源。检查 320/390px 与桌面、键盘、减少动效及无 JavaScript。配色变更另运行 `verify:design`。


## 2026-10-21 来源与处理记录

本轮只使用所有者已链接的公开项目仓库，未生成项目截图或新测试结果。

| 本地资源 | 真实来源 | 处理 |
| --- | --- | --- |
| `src/assets/projects/feeder/dashboard-normal.png` | [SCADA screenshot](https://github.com/WeizhouXueBenjamin/distribution-feeder-scada/blob/main/screenshots/dashboard-normal.png) | 原图下载；作为封面与视频 Poster |
| `src/assets/projects/feeder/command-failure.png` | [Command failure](https://github.com/WeizhouXueBenjamin/distribution-feeder-scada/blob/main/screenshots/command-failure.png) | 原图下载；Command-feedback 章节 |
| `src/assets/projects/feeder/overload-trip.png` | [Overload trip](https://github.com/WeizhouXueBenjamin/distribution-feeder-scada/blob/main/screenshots/overload-trip.png) | 原图下载；Protection & recovery 章节 |
| `src/assets/projects/conveyor/codesys-running.png` | [CODESYS running](https://github.com/WeizhouXueBenjamin/smart-conveyor-sorting-codesys/blob/main/media/CODESYS%20running%20correctly.png) | 原图下载并简化文件名；当前只有运行基线截图，不视为完整分拣演示 |
| `public/media/projects/feeder-demo.mp4` | [SCADA Release v1.0.0](https://github.com/WeizhouXueBenjamin/distribution-feeder-scada/releases/tag/v1.0.0) | 原始约 361.6 MB 转为约 1.34 MB；1920×1080 H.264、15 fps、AAC、faststart；保留完整约 87 秒流程，帧率换算令封装时长约 87.27 秒 |

视频处理命令（需本机 FFmpeg，仅用于维护素材，网站构建不依赖它）：

```powershell
ffmpeg -i source.mp4 -c:v libx264 -preset medium -crf 23 -r 15 -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart feeder-demo.mp4
```

SCADA 技术说明来自 [README](https://github.com/WeizhouXueBenjamin/distribution-feeder-scada) 与 [Tag export](https://github.com/WeizhouXueBenjamin/distribution-feeder-scada/blob/main/ignition/Feeder01-tags.json)。输送线技术说明来自 [Architecture notes](https://github.com/WeizhouXueBenjamin/smart-conveyor-sorting-codesys/blob/main/notes/PLC%20Architecture%20-%2015Aug2026.md) 与 [Troubleshooting record](https://github.com/WeizhouXueBenjamin/smart-conveyor-sorting-codesys/blob/main/notes/2%20issues%20faced.md)。正文中的流程文本是这些已记录结构的排版，不是重新仿真生成的证据。

## 待补充的真实资源

- **Smart Conveyor：**完整 Factory I/O 运行截图或周期 Demo 与 Poster；当前 Hero 是 CODESYS 运行基线，尚不能满足“先看最终运行成果”的最强表达。
- **Smart Conveyor：**实际 18 点 I/O Mapping、当前状态机监控截图、可重复的正常周期测试记录。联锁、Jam Detection、故障恢复及 FAT-style 表格只能在实现并测试后加入。
- **SCADA：**独立通讯故障、拒绝命令不启动计时器、报警 acknowledgement/reset/recovery 的日志或截图序列；当前保留原始视频和书面测试记录，不虚构额外截图或测量。
- **两项案例：**有来源的架构图可替换现有可读的文本结构；没有来源前不绘制未经验证的设备或通信关系。

当前没有 Software Engineering 项目内容，通用 schema 和无媒体/无外链的软件案例由隔离测试覆盖，不向正式列表添加演示项目。

# 项目展示与 Visual Evidence 维护规范

本规范落实已确认的 Hybrid Case Study Layout：先展示成果，再解释工程过程，以相关证据支撑重要陈述。定位及真实性以 [business.md](business.md) 为准，色彩、排版与留白沿用 [design-system.md](design-system.md)。网站内容使用 NZ English，开发说明使用中文。

## 页面与组件

| 职责 | 实现 |
| --- | --- |
| 列表与首页精选 | `ProjectList/ProjectCard.astro`；整张卡片只有一个详情链接，无嵌套外链 |
| 详情文档与 metadata | `ProjectDetailLayout.astro` 复用 `Layout.astro`，唯一 main/h1 |
| 顶部成果与身份 | `ProjectHero.astro`；标题、摘要、个人角色、项目类型、技术栈、真实外链与 Featured Media |
| 技术章节 | `ProjectSection.astro`；正文、可选代码/流程、就近证据、测试与来源 |
| 图片与 Figure | `ProjectMedia.astro`、`ProjectCaption.astro`；完整图像与原图入口 |
| 成组证据 | `ProjectGallery.astro`；featured / comparison / sequence |
| 视频 | `ProjectVideo.astro`；本地或 HTTPS MP4/WebM，或按需加载 YouTube/Vimeo |
| 共享选择规则 | `src/lib/content.ts` 负责排序、URL、重复 slug 与本地视频存在性；`project-media.ts` 负责阅读顺序、Figure 编号与封面 |

独立页面由 `src/pages/projects/[slug].astro` 静态生成；沿用站点 `trailingSlash: never`，链接为 `/projects/project-slug`。不用为新案例复制页面代码。项目结构继续采用 YAML/YML/JSON Content Collection，不引入新的 CMS 或客户端框架。

## 内容契约

实际校验以 `src/content.config.ts` 为准；未识别字段会报错，避免旧字段被静默丢弃。

| 字段 | 用途 |
| --- | --- |
| `title` / `slug` / `summary` | 标题、独立 URL、1–2 句事实摘要；slug 为小写字母/数字/连字符，跨项目唯一 |
| `category` | Controls & Automation / SCADA / Systems Integration / Software Engineering；驱动筛选 |
| `projectType` / `role` | 真实项目性质与个人负责部分，不以目标岗位冒充任职头衔 |
| `techStack` | 3–5 个核心技术标签 |
| `status` | 可选 Completed / In Progress；不知道就省略，不设推断默认值 |
| `period` / `year` | 可选时间说明及排序年份 |
| `links` | `{ label, url }[]`，只填真实 HTTP(S) 地址 |
| `featured` / `order` | 首页精选与同组排序；Controls & Automation / SCADA 同属优先组，再按 featured、order、year、id 排序 |
| `featuredMedia` | 可选媒体 ID，只能指向 section 为 hero 的条目 |
| `coverMedia` | 可选独立封面 ID；默认沿用 Featured Media 的图片或 Poster，不重复维护图片路径 |
| `sections` | 按阅读顺序排列的技术章节；至少一项 |
| `media` | 项目唯一媒体清单；无真实素材可省略，不渲染占位框 |

章节包含 `id`、`title`、`paragraphs`，可选 `bullets`、`code: { title, language, content }`、`tests`、`significance`、`sources: [{ label, url }]`。`mediaLayout` 默认 featured，也可为 comparison 或 sequence，作为所关联媒体的 Display Variant。

推荐叙述顺序为 Overview → Architecture & Approach → 有依据的实现章节 → Testing & Validation → Outcomes & Lessons。章节名称和数量按实际内容调整，软件案例可以使用 Application Overview / Technical Challenges 等名称。`significance` 放在证据之后，说明工程意义，不机械添加总结句。

`tests` 每项包含 `scenario`、`expected`、`result`，可选 `evidence` 引用项目内的媒体 ID。页面显示预期与实际的独立描述及 Figure 锚点；只有书面记录时使用章节 `sources`，不能冒充有截图或测试日志。Simulation、Emulation、FAT-style 必须与实际方法一致。

## 媒体字段与排版

每项媒体都有 `id`、`type`、`src`、`title`、`caption`、`alt`、`section`，可选 `order`、`aspectRatio`、`sourceUrl`。图片 `src` 和视频 `poster` 使用 collection 的 `image()`，相对于内容文件引用 `src/assets/projects/` 中的真实资源。视频文件位于 `public/media/projects/`，数据填写公开路径。

- `type: image`：Astro Image 为位图生成 WebP/srcset，SVG 原样传递，保留可缩放图形。原图通过明确标注的新标签页链接打开，支持浏览器原生缩放，无需 JavaScript。
- `type: video`：本地或 HTTPS MP4/WebM，必须提供 Poster。原生 controls、playsinline、fullscreen，`preload="none"`，无 autoplay/loop；不会因减少动效偏好而自动播放。
- `type: embed`：使用规范的 YouTube watch/youtu.be 或 Vimeo 数字 ID 地址。Poster 链接点击后才创建 iframe，禁用 JavaScript 时仍能打开原始地址。播放器不自动播放；第三方内容仍受来源可用性与自身可访问性限制。
- `aspectRatio` 默认 `16:9`，长截图、架构图可用 `native`。所有媒体使用 contain；卡片保持 16:9，完整内容不会被裁切。
- `section: hero` 只供 Featured Media，其余 section 必须对应真实章节 ID。每章按 `order` 升序排列，同序按 ID 排列；编号依据 Hero → 章节 → 媒体顺序，从 Figure 01 开始。不要手写编号到 caption。
- comparison 必须有两项媒体；sequence 至少两项，每步另显示 Step 编号，各自仍有全页 Figure 与说明。移动端改为单列。
- 同一个图片、视频或 Poster 不在详情页重复渲染；测试记录使用 Figure 锚点引用已有证据。卡片与详情共享同一封面属于正常导航预览。

Caption 使用 `Figure 01 — Descriptive Title` 加 1–2 句，说明看见什么、验证什么及其工程意义。Alt 描述可见状态，不重复全部技术分析。不得使用无信息量的 “Screenshot of my project”，也不能从静态状态截图推导响应时间或整周期测试通过。

视频可提供 `highlights`、`description` 和 `timestamps: [{ seconds, label }]`；时间点必须逐段核对录制内容。存在讲解或重要声音时提供 `captions: { src, language, label }` 的 WebVTT。静默视频提供文字过程说明；不要生成虚构讲解字幕。本轮 SCADA 视频的音轨检测为静音，已提供文字说明，未编造时间索引。

## 新增或修改案例

1. 从 [structure.txt](../../src/content/projects/structure.txt) 复制字段结构，将说明占位值替换为真实内容，再保存为 YAML。`.txt` 不会被发布。
2. 核对个人贡献、环境、功能状态及证据来源。保留参考项目/教程归属，区分作者改动与初始样例。
3. 选最有代表性的真实结果作为 Hero；有合适演示时优先视频及 Poster。缺少时先保留文字，不制作假证据。
4. 图片放入 `src/assets/projects/<project>/`，视频放入 `public/media/projects/`；登记来源 URL、获取日期与必要处理。不要把大体积原始录屏直接加入仓库。
5. 在章节正文附近关联媒体，设置布局与顺序；预期/实际结果必须分开，未来计划不能写成已完成成果。
6. 执行 `pnpm run build` 和 `pnpm run verify:site`，检查实际页面、媒体链接、Figure、320/390px 与桌面、键盘和无 JavaScript。改变颜色 token 时另运行 `verify:design`。

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

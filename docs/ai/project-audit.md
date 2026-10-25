# 项目现状审计

审计日期：2026-10-20（Pacific/Auckland）。下文保留首次扫描的事实快照；本轮改造结果见文末实施记录，不能将初始待办当作当前仍存在的问题。

## 审计范围与证据

- 已检查：配置、页面、布局、主要组件、内容 schema、现有内容与项目 Skill。
- 已执行：`pnpm run build`，退出码为 0；检查了生成的 `dist/rss.xml`，其中没有文章条目。
- 未执行：浏览器视觉检查、完整类型检查、无障碍自动检查、Lighthouse、线上部署验证。
- 工作区原有大量已暂存、未暂存及未跟踪修改。本次梳理以工作区文件为准，不以 Git HEAD 代替现状。
- 个人经历、学历、指标与推荐信仅作为仓库中的内容读取，没有独立核实真实性。

## 技术与运行方式

| 项目 | 当前事实 | 证据 |
| --- | --- | --- |
| 渲染 | Astro 静态构建 | `astro.config.mjs`、构建输出 |
| 声明依赖 | Astro `^7.0.7`、MDX、RSS、Sitemap | `package.json` |
| 样式入口 | Tailwind CSS 4，通过 Vite 插件接入 | `astro.config.mjs`、`src/styles/global.css` |
| DaisyUI | 声明依赖，旧配置文件有 dark/light 配置；尚未验证当前构建是否加载该配置 | `package.json`、`tailwind.config.mjs` |
| 实际主题 | HTML 固定 `data-theme="dark"`，全局仅定义 dark token | `src/layouts/Layout.astro`、`src/styles/global.css` |
| 包管理器 | pnpm；版本和 Node 固定值见配置 | `package.json`、`pnpm-lock.yaml` |
| 客户端框架 | 未声明 React、Preact、Vue 集成；tsconfig 存在 React JSX 设置 | `package.json`、`tsconfig.json` |
| 部署配置 | 站点 URL 指向 GitHub Pages，base 为 `/` | `astro.config.mjs` |
| 部署验证 | 尚未核实线上状态及发布流水线 | 本次只验证本地构建 |

## 页面与业务职责

| 当前路径 | 当前实现 | 与目标的差异 |
| --- | --- | --- |
| `/` | 身份、职位、社交联系方式、简介、粒子背景 | 尚未呈现精选项目或完整的职业展示路径 |
| `/about` | 简介、工作经历全文、学习经历、技能 | 与独立 Experience 页职责重叠，且部分内容硬编码 |
| `/experience` | 经历汇总、精选经历、时间线、技术统计、推荐信 | 用户已决定合并 About 与 Experience；当前仍是独立页面，且不在主导航中 |
| `/projects` | 标签过滤、三条组件内示例项目 | 已有 projects schema，但未接入内容集合 |
| `/blog` | 文章列表，按发布日期倒序 | 没有过滤 draft |
| `/blog/[slug]` | 静态文章详情 | 没有过滤 draft；布局和正文重复输出 h1 |
| `/gallery` | 只有布局，没有实际内容 | 用户已决定暂缓 Gallery；当前导航仍有入口 |
| `/rss.xml` | RSS 端点能够生成 | 读取了不存在的 `blog` 集合，实际集合名为 `blogs`，输出无文章 |

## 内容与数据流

| 领域 | 数据来源 | 当前消费者 | 主要问题 |
| --- | --- | --- | --- |
| 站点身份与联系方式 | `src/config/site.ts` | 首页、布局、社交链接、页脚 | About 和 Experience 中还有独立的职业介绍文案 |
| Blog | `src/content/blogs/*.{md,mdx}` → `blogs` | 列表、详情；RSS 集合名未对齐 | 有 schema，但草稿发布规则没有贯穿消费者 |
| Experience | `src/content/experience/*.{yaml,yml,json}` → `experience` | About、Experience | 两处排序不同；模板字段与 schema 不一致 |
| Projects | `src/content/projects/*.{yaml,yml,json}` → `projects` | 当前列表未使用 | 目录只有 `structure.txt`；页面仍渲染示例数组 |
| 学历与技能 | `src/pages/about.astro` 内数组 | About | 尚无独立配置或集合，不能宣称已集中管理 |
| Gallery | 未发现相应集合 | 空页面 | 尚无经过确认的内容模型 |

内容字段的运行时依据是 `src/content.config.ts`。`structure.txt` 只是当前不完整的手工草稿，不能作为生成器的 schema。

## 待办与验收依据

这些是本次发现的待办，不自动授权执行代码改造。

| 编号 | 问题与证据 | 完成时应观察到的行为 |
| --- | --- | --- |
| A01 | `rss.xml.ts` 使用 `getCollection("blog")` | RSS 与列表、详情共用有效的 blogs 内容范围，实际出现应发布的文章 |
| A02 | Blog 列表、静态路径、RSS 均未实现一致的 draft 过滤 | draft 内容不出现在正式列表、详情路径或 RSS；生成的 sitemap 也没有草稿 URL |
| A03 | ProjectList 使用示例数组，projects 集合为空 | 列表读取集合；无内容时有真实空状态，不生成假项目 |
| A04 | About 与 Experience 重复；Gallery 为空但可导航 | 按已确认的合并目标调整页面与导航；已有 URL 的处理有明确方案 |
| A05 | experience 模板写 `highlights`，schema/数据/消费者为 `highLights`；模板缺少 `refererAvatar`，并混入 `//` 注释 | schema、模板与消费者一致；直接复制模板并填入真实内容后可通过校验 |
| A06 | 推荐信 `a/a.pdf` 在 public 中不存在，头像和引文有占位内容；技术栈存在 `a`、亮点存在空字符串 | 生产页面不显示占位文案或失效文件链接；真实内容由所有者补充 |
| A07 | About 仅按 order 排序，Experience 按 featured、order、日期排序 | 同一业务规则只有一套明确实现，概览和详情顺序符合各自职责 |
| A08 | Experience 用最早入职日至构建时刻计算年限并向上取整；技术条宽度反映出现频次 | 数字有明确口径，不把时间跨度称作累计工作年限，不把出现频次称作熟练度 |
| A09 | Blog 详情与 MainLayout 均输出 h1 | 页面保留一个清楚的主标题，正文标题层级正确 |
| A10 | 仅有 dark token，导航却部分跟随系统色彩偏好；现有 Skill 要求 light/dark 兼容 | 明确实际主题策略后统一控制来源，不宣称已支持 light 模式 |
| A11 | Skill 描述写 Astro 6，正文与 package 声明为 Astro 7；README 仍是 Starter Kit | 入口说明与实际配置一致，后续规范不依赖过期版本描述 |
| A12 | scripts 中没有 check、lint、test；build 成功仍带内容告警 | 如实报告验证范围；如后续增加质量工具，在同一任务中提供配置和可运行命令 |
| A13 | ProjectListItem 固定嵌入同一示例视频；缺少部分 URL 时仍生成打开链接的按钮 | 媒体来自真实项目数据；可选链接缺失时不生成无效交互；导航使用链接语义 |

## 构建基线

本次 `pnpm run build` 成功，生成了 7 个页面以及 RSS 和 sitemap，存在两项内容告警：

1. projects 目录没有匹配的 YAML/YML/JSON 内容文件。
2. RSS 读取的 `blog` 集合不存在或为空。

构建成功只证明这份工作区可以完成静态生成，不证明内容完整、链接有效、类型检查通过、性能指标达标或站点已经上线。

## 现有 instructions

已读取 `.codex/astro-personal-website/SKILL.md`。其中已有 Astro 优先、最少客户端 JavaScript、内容集合、语义 HTML 和设计一致性等指导，但也混有过时版本、未实现的主题目标和较多通用建议。

建议以根目录 `AGENTS.md` 作为项目入口，将已确认业务规则、工程约定和任务流程按需引用；现有 Skill 的整理应避免再复制一套业务定义。Codex 的入口与 Skill 分工参考 [OpenAI 官方说明](https://learn.chatgpt.com/docs/customization/overview)。本地 Skill 文件的存在不等于已经验证它会被当前工具自动发现。

## 本轮实施记录

所有者已确认 Automation / Control Systems & Software Integration 定位、英文网站与中文规范，并授权页面、导航和相关内容链路改造。另提供两项 Aug 2026 个人仿真项目的事实与 GitHub 地址。

| 范围 | 已实施结果 |
| --- | --- |
| 定位与入口 | site 配置统一职业方向、简介、所在地与联系方式；首页加入显式精选项目、背景和联系入口 |
| About / Experience | 完整经历在 About 消费同一 experience 集合；教育与能力分类迁入 profile 配置；旧 Experience 页跳转至 About 对应锚点 |
| Gallery / 导航 | 主导航为 Home、About、Projects、Blog；Gallery 旧地址跳转首页；两项旧地址不进入 sitemap |
| Projects | 接入真实集合与所有者提供的 SCADA、PLC 仿真案例；支持标签筛选、可选链接、无项目空状态；移除示例视频与虚构项目数组 |
| Blog / RSS | 列表、详情路径和 RSS 共用发布过滤；详情支持子目录；去除重复 h1，日期显示固定英文与 UTC |
| 内容边界 | Starter 文章标为草稿；移除占位推荐信、无意义技术栈与空亮点；两个 schema 模板对齐字段并将未提供的可选字段改为注释 |
| 展示统计 | 合并页不再渲染无明确口径的年限、技术频次条或重复精选经历；旧展示组件保留在源文件中，未擅自删除 |
| 样式 | 导航改用现有 dark token；内容页顶部为固定导航留出空间，页面复用现有布局 |
| AI 入口 | 新增根目录 AGENTS 与业务、工程、流程文档；README 替换 Starter 内容。恢复工作后，既有 Skill 已精简为这些规范的引用入口，移除过期版本与未实现主题描述 |

额外发现并修复：当前安装的 Astro 7.0.7 glob loader 在目录为空时提前返回，未删除缓存中的旧条目。`src/lib/local-content-loader.ts` 在同步前清理源文件已不存在的条目；连续删除全部内容后重建的场景验证覆盖了这个问题。

### 实际验证

- 最终 `pnpm run build` 通过，退出码 0，未出现首次扫描时的两项内容告警。
- `scripts/verify-site.mjs` 通过：在独立临时工作区执行三轮真实构建，覆盖 draft 隔离、嵌套文章 URL、RSS 顺序与条目、单一主标题、项目排序/精选/可选字段、清空集合后的页面、导航、跳转与 sitemap。
- `git diff --check` 通过；原有已暂存修改未被重置或重新暂存。
- 当前正式内容只有 Starter 草稿，因此正式 Blog 为空、RSS 无文章条目属于预期行为；有公开文章时的 RSS 链路已用隔离数据验证。
- 首次 Playwright 检查曾因未获执行授权而中止；所有者随后重新授权，完整浏览器结果见下方记录。未向项目添加 Playwright 依赖。
- 未执行完整类型检查、Lighthouse 或线上发布。本轮没有部署网站。

### 中断后的收尾

恢复时重新检查了工作区状态、入口文档及已完成的验证记录；页面与内容改造保持完整。获得受保护目录的写入权限后，将 `.codex/astro-personal-website/SKILL.md` 更新为引用 AGENTS、业务、工程、流程与审计文档的简短入口，保留原有 Skill 名称。此次收尾不新增业务代码，也不继续执行 Playwright 检查。

### 重新授权后的浏览器验收

所有者重新授权后，使用本机 Chrome 的无界面会话检查构建后的本地站点。以下为实际观察结果，窄屏检查通过视口模拟完成。

| 检查 | 结果 |
| --- | --- |
| Home、About、Projects、Blog × 1440/390/320px | 12 个页面与宽度组合均无横向溢出；各有一个 h1 与 main；主标题未被固定导航遮挡 |
| 导航与 metadata | 四个导航入口及当前页状态正确；点击 About 能到达对应页面；页面 title 与 canonical 已核对 |
| 项目筛选 | SCADA、PLC 分别显示匹配项目，All 恢复两项；aria-pressed 与显示状态一致 |
| 键盘操作 | 筛选按钮聚焦后按 Enter 可以操作，焦点 outline 为 2px solid |
| 旧地址 | `/experience` 到达 `/about#work-experience` 且目标内容未被导航遮挡；`/gallery` 到达首页 |
| 关闭 JavaScript | 首页与 Projects 仍展示两项真实项目；GitHub 与联系入口可见；Experience 的静态跳转仍正常 |
| 运行时 | 主会话未捕获页面脚本错误、控制台 error 或站内 HTTP 4xx/5xx 响应 |
| 截图复核 | 已检查 Home、Projects、About 的桌面与 390px 截图，内容、卡片与导航未见遮挡或截断问题 |

截图复核发现页脚 `by` 与作者姓名缺少空格，已在 Footer 中显式保留该间隔。修复后再次执行 `pnpm run build`，退出码 0、无内容告警；浏览器读取桌面和窄屏下三个页面的页脚文本，均为 `Built with Astro and ♥ by Benjamin Xue`。

本次本地截图保存于 `.astro/home-desktop.png`、`.astro/home-mobile.png`、`.astro/projects-desktop.png`、`.astro/projects-mobile.png`、`.astro/about-desktop.png`、`.astro/about-mobile.png`，属于忽略的临时产物。未增加浏览器测试依赖，也没有部署网站；完整类型检查、Lighthouse 与其他浏览器引擎不在本次已验证结果中。

## 2026-10-21 视觉规范与一致性收尾

所有者进一步确认以克制的工程作品集为主体，少量使用工业控制台元素；本轮统一深色主题、保证可读性，并保留 Hero 内低权重粒子，停用鼠标交互及高亮连线，遵循减少动效偏好。本轮开始时工作树为干净状态，现有页面已采用深色 token、统一卡片和弱化粒子参数，但缺少独立的视觉生成契约。

- 新增 [视觉与交互规范](design-system.md)，明确页面信息顺序、色彩与排版层级、卡片和动作 recipe、技术标注、粒子及验证要求。根入口、业务、工程、代码生成、任务流程和 README 均链接到该规范；历史未使用的 Experience 展示组件不作为新样式模板。
- 新增 `pnpm run verify:design`，用 Node 内置 API 读取全局 token，按 WCAG 对比度公式检查 19 组常用文字、状态、按钮及控件边界配对，并限制 Hero 粒子的密度、亮度、速度和交互开关。最弱的所测普通文字组合 `--text-muted`/`--card` 为 6.61:1；所测控件边界 `--border-control`/`--card` 为 4.04:1。脚本对当前配对通过，但不覆盖每个实际像素或第三方内容。
- 将被触及的基础 CSS 和组件首条规则整理为一致的多行格式，没有改变业务内容或站点路由。
- `pnpm run build` 通过，生成 6 个页面，没有内容告警；`pnpm run verify:design` 通过；`git diff --check` 通过。此轮未改集合、发布、列表、导航或跳转行为，未重跑 `verify:site`。
- Playwright 无界面 Chrome 复核 Home、About、Projects、Blog 在 1440/390/320px 共 12 种组合，未见横向溢出或导航遮挡；页面各有一个 h1/main。项目筛选、键盘焦点、旧路径及禁用 JavaScript 的主要内容仍通过，未捕获页面错误、控制台 error 或站内 4xx/5xx。
- 单独检查粒子：正常动效下只有一张 canvas，边界位于 Hero 内，指针事件为 none，叠层透明度 0.35；切换为减少动效后 canvas 被销毁且粒子容器隐藏，切回后重新渲染。浏览器截图已重新复核首页、项目和关于页的桌面/窄屏版面。

上述证据不等于完整 WCAG 全站审核、跨浏览器兼容验证、真实性独立核实或线上发布。真实项目的架构图、独立 Demo 和可公开测试材料仍需所有者提供后才能加入页面。

## 2026-10-21 粒子、工具栏与代码一致性复核

所有者指出首页粒子不明显、主导航入口尺寸不一，并要求检查项目代码一致性。开始前检查了工作区，保留上轮尚未提交的文档和样式修改。本轮实际范围为活跃页面、组件、内容选择、路由、样式及验证脚本；未调用的历史 Experience 展示组件与旧静态资源没有被当作当前页面实现，也未清理所有者源文件。

- 浏览器量测证实：旧工具栏四个链接宽度约 49–67px；旧 Hero 在 1440px 视口仅有约 19 个粒子，画布已绘像素平均 alpha 约 0.028，外层再乘 0.35 的 opacity，视觉上接近不可见。
- 导航改为四列等宽网格，窄屏收紧入口内边距；粒子提高到适度密度与尺寸，改用稳定透明度，外层 opacity 调为 0.7。保留低速、无连线、无鼠标/点击交互和减少动效停用。`verify:design` 同时限制粒子配置的过低/过高可见度及过快运动。
- 检查了活跃内容读取、页面出口和外链生成。统一 Projects/Blog 页引言样式、活跃组件 CSS/Props 排版、外链 rel 与原生导航语义；历史资产与展示组件未被主路由引用。未发现需要改动既有事实或集合 schema 的问题。
- `pnpm run build` 与 `pnpm run verify:site` 通过，后者覆盖草稿、嵌套文章、RSS、项目排序/可选数据、空集合、导航和静态跳转；`verify:design` 的 19 组 token 对比度和粒子约束通过。
- Playwright 无界面 Chrome 检查 Home、About、Projects、Blog 在 1440/390/320px 的 12 个组合，均无横向溢出、导航遮挡或运行时错误；筛选、键盘焦点、旧地址及禁用 JavaScript 时的正文仍正常。导航链接宽度在三个视口分别一致为 80.5px、78.25px、60.75px。
- 新截图可见稀疏的 Hero 背景点；正常动效下 canvas 只在 Hero 内，切换到减少动效时 canvas 被移除，恢复偏好后重新出现。此结果来自模拟视口与本机 Chrome，未代替真实设备和其他浏览器验证。

## 2026-10-21 粒子常显、首页联系与长卡片折叠

所有者再次指出 Hero 粒子不可见，并明确要求在减少动效偏好下也持续可见；同时要求首页快速呈现定位、能力和联系入口，加入英文简历下载及集中联系区，过长经历和项目默认折叠。所有者提供的本机 PDF 为 `Benjamin-Xue-Automation-SCADA-CV.pdf`，核对 `%PDF-` 文件头与 SHA-256 后复制到 `public/documents/`，网站路径由 `site.resumeUrl` 维护。

- 将依赖 `particles.js` 的旧 canvas 效果改为 Hero 内静态生成的 HTML/CSS 点阵。正常情况下低速位移；减少动效只停止动画，不删除粒子。移除未引用的旧粒子脚本及依赖，配置保留在 `src/assets/particles.json`。
- 首页 Hero 缩短介绍并直接提供 Projects、英文 CV 和联系入口；底部集中联系区展示真实邮件、LinkedIn、GitHub 与 PDF。About 的联系动作指向首页联系区。
- 三条以上的长项目贡献和较长经历用原生 `<details>` 默认折叠其余说明，标题、背景与首要贡献直接可读。无需 JavaScript 也可展开。
- `pnpm run build`、`pnpm run verify:site`、`pnpm run verify:design` 与 `git diff --check` 通过；36 个本地 Markdown 链接有效。Playwright 无界面 Chrome 检查 Home、About、Projects、Blog × 1440/390/320px 共 12 组布局；40 个桌面粒子正常动效和减少动效下均可见，后者动画为 `none`；无 JavaScript 的移动端仍显示粒子与内容。PDF 返回 200 且有 `%PDF-` 文件头，点击可下载正确文件名；联系锚点未被工具栏遮挡，项目及经历折叠、键盘展开和项目筛选通过。浏览器未报告脚本或站内请求错误。

本次视觉证据为本地截图与浏览器计算样式；没有执行完整 WCAG 审核、其他浏览器引擎测试或线上部署。简历内容由所有者提供，本站未独立核实其中事实。

## 2026-10-22 Project Showcase 与 Visual Evidence 验收

本轮承接所有者确认的 Hybrid Case Study 需求，保留此前深色视觉调整与现有暂存内容。项目列表改为统一的 16:9 封面卡片，整卡进入 `/projects/distribution-feeder-scada` 或 `/projects/smart-conveyor-sorting`；首页精选复用同一组件。详情复用站点外壳，以成果 Hero、页内索引、技术章节、就近媒体、预期/实际测试结果及经验总结组织内容。

- 新增 ProjectCard、ProjectHero、ProjectSection、ProjectMedia、ProjectGallery、ProjectVideo、ProjectCaption 和 ProjectDetailLayout；媒体支持 featured、comparison、sequence，按页面阅读顺序生成 Figure 编号。原图可在浏览器放大；视频默认暂停、按需下载、提供 Poster、原生控件与文本说明。外部嵌入点击后才加载播放器。
- projects schema、两项正式内容、模板、所有消费者及维护文档已同步迁移。分类优先突出 Automation / SCADA，重复 slug、媒体来源、错误章节关联与缺失本地视频会使构建失败。集合 ID 独立于公开 slug，避免 Astro 默认 loader 静默覆盖重名 URL。
- 真实素材来自所有者此前提供的两个公开 GitHub 仓库。接入四张原始截图及 SCADA Release 演示，保留来源；演示从约 361.6 MB 压缩为 1.34 MB、1080p、约 87 秒，未添加虚构场景。Astro Image 使用显式 Sharp 依赖生成响应式 WebP，SVG 保留矢量。
- 输送线以现有运行基线截图作为 Hero，说明它只能证明 SoftPLC 连接与 RUN 状态。OPC UA、18 个信号及状态机依据实际技术笔记；Manual/Auto、联锁、Jam Detection、故障处理和正式 FAT-style 文档仍属计划范围。完整素材缺口与来源见 [project-showcase.md](project-showcase.md)。
- 修复验证脚本原有的缓存隔离缺口：临时工作区的 node_modules 链接会共享默认 Astro cache。现在为测试配置独立 Astro/Vite cache；并行正式构建与场景验证均通过，最终 dist 无测试案例或测试文章。

| 验证 | 本轮实际结果 |
| --- | --- |
| `pnpm run build` | 退出码 0，8 个静态页面，包括两项独立案例；最终构建无内容或媒体告警 |
| `pnpm run verify:site` | 退出码 0；覆盖发布/RSS、分类优先级、卡片与详情路由、可选数据、Figure 排序、三种布局、视频/嵌入、错误输入及删除后的空状态 |
| `pnpm run verify:design` | 19 组既有深色 token 对比度配对通过 |
| 本地链接与构建产物 | 46 个文档相对链接有效；正式 HTML 的站内页面/资源引用均有文件，项目详情仅两项，无 fixture 内容 |
| Chrome 布局 | Home、Projects、两页案例、About、Blog × 1440/390/320px 共 18 组；无横向溢出、重复 ID 或已加载图片损坏，每页一个 h1/main，Figure caption 结构正确 |
| Chrome 交互 | 分类筛选与 Enter 操作、2px 可见焦点、整卡导航、章节锚点、原图 HTTP 200、视频实际解码/播放/全屏通过；播放前 MP4 请求数为 0 |
| 降级与媒体样式 | 三页 Projects 内容无 JavaScript 仍可读；减少动效下视频保持暂停、平滑滚动关闭；隔离样例验证 comparison 窄屏单列、sequence 编号与按需 iframe 创建 |

按 distinctive-ai-design 对实际截图做了自查，重点检查成果媒体、章节层级、caption 关联与窄屏阅读。没有独立评审者。截图与浏览器结果保留在忽略目录 `.astro/showcase-*.png`、`.astro/project-review-results.json`；fixture 页面不属于正式内容。浏览器没有捕获脚本异常或站内 HTTP 错误。

窄屏截图自查发现 SCADA 长流程文本撑宽了隐式网格列，进而使固定导航偏移；已将章节正文列限定为 `minmax(0, 1fr)`，长代码仅在自身容器内滚动。浏览器断言同步比较指定视口宽度、document clientWidth 与导航右边界，避免只比较随内容扩大的 innerWidth 而漏检。

本轮没有重新运行 Ignition/CODESYS 仿真，没有把书面项目记录当成本轮独立实测。外部视频嵌入验证了加载机制，未用虚构视频 ID 宣称第三方实际播放通过；正式案例使用本地真实 MP4。未执行完整类型检查、WCAG 全站审核、真实手机/其他浏览器或线上部署。

## 2026-10-25 组件一致性与冗余清理

所有者要求检查 Projects 的精选/排序是否弃用，并梳理组件与架构。核对当前调用链后，确认 Projects 的 `featured`、项目级 `order` 及媒体级 `order` 均有实际用途，全部保留。所有者另行确认 Experience 改为按开始日期倒序，并删除无调用者的旧组件。

- 移除 Experience 的 `featured/order` schema、内容和模板字段；同日按 id 稳定排序，年份分组沿用排序后的顺序。新增隔离场景覆盖年内日期、跨年和同日起始日期；同时补查 Projects 同优先组的 featured/order 与首页无精选状态。
- 删除五个旧 Experience 组件、两个旧导航图标、未使用的图标分支/类型/导航描述、脚手架说明、React JSX 设置，以及未接入当前 Tailwind 构建的 DaisyUI 依赖与旧配置。现有页面、布局和领域目录继续保留。
- 联系方式 URL 在 `site.ts` 派生后供联系区、社交图标与页脚共用；筛选器初始化时解析标签，点击时复用；经历按年份分组改用 Map。移除已由 schema 保证的重复默认处理，外部视频只生成实际使用的响应式 Poster。
- 同步工程、设计与项目展示文档；纠正项目展示说明中旧的 trailing slash 规则。项目详情路由补齐集合 Props 与静态路径类型，与 Blog 的路由约定一致。
- `pnpm run build`、`pnpm run verify:site`、`pnpm run verify:output` 通过；正式产物包含 9 个页面，176 个站内 URL/资源引用有效。场景验证保留内容发布、媒体、错误输入、空集合、静态跳转及根路径/Project Pages/自定义子路径检查。
- 本地 Chrome 检查 6 个页面 × 1440/390/320px 共 18 组，无横向溢出、导航遮挡或损坏图片，每页一个 h1/main；Enter 分类筛选、结果计数与恢复全部、2px 键盘焦点、Experience 展示顺序、视频解码播放、减少动效停用粒子、普通模式加载粒子及禁用 JavaScript 的案例正文均通过。未捕获脚本或站内请求错误，抽查了移动首页与桌面案例截图。结果保留在忽略目录 `.astro/cleanup-browser-after/`。

本轮未引入新的架构层、客户端框架或业务事实；未执行完整类型检查、WCAG 全站审核或线上部署。构建与本机浏览器结果不代表真实设备及其他浏览器均已验收。

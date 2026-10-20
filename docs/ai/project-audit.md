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

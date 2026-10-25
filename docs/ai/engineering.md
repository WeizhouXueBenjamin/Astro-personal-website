# 工程与内容约定

本文约束后续生成和修改代码时的选择。业务目标见 [business.md](business.md)；遗留差异见 [project-audit.md](project-audit.md)。既有代码并非所有约定都已满足，修改时聚焦当前任务范围。

代码组织、Props 与格式的具体约定见 [coding-style.md](coding-style.md)；视觉方向和 token 用法见 [design-system.md](design-system.md)，不在各个任务提示中重复定义。

## 事实来源

| 要判断的内容 | 优先读取 |
| --- | --- |
| 依赖、包管理器、脚本、Node 固定值 | `package.json`，需要精确解析版本时再查 `pnpm-lock.yaml` |
| 渲染、集成、站点地址、base | `astro.config.mjs` 与 `src/config/deployment.mjs`；完整 URL 可通过 `SITE_URL` 设置 |
| 个人身份与外部联系方式 | `src/config/site.ts` |
| 教育、证书与能力分类 | `src/config/profile.ts` |
| 集合名称、文件匹配方式、字段验证 | `src/content.config.ts` |
| 已删除内容的缓存清理 | `src/lib/local-content-loader.ts` |
| 页面路由与静态参数 | `src/pages/` |
| HTML 文档、metadata、全站导航和页脚 | `src/layouts/Layout.astro` |
| 内容页容器、主标题与宽度 | `src/layouts/MainLayout.astro` |
| 颜色、表面、文字、边框与尺寸基础 | `src/styles/global.css` 与实际组件样式 |
| 导航数据及状态 | `src/components/GlobalNav/` |

配置与历史文档不一致时，报告真实差异，不通过文档措辞假装代码已经迁移。

## 代码职责

- `src/pages` 处理路由、集合读取和页面组合；已有领域组合组件也可以负责本领域集合读取，不为形式统一而无故重构。
- `src/layouts` 负责共享文档结构和内容容器；不要在业务组件中复制 head、导航、页脚。
- `src/components/Experience`、`ProjectList`、`GlobalNav` 继续承载相应领域。新建目录前先检查是否已有同职责组件。
- 复用组件通过明确的 Props 接收数据；涉及集合条目时优先使用 `CollectionEntry<"集合名">`，不手工复制一套容易漂移的类型。
- 导航和内容选择集中表达；共用排序、发布过滤等规则在多个消费者出现时，再提取最小共享函数。
- 本项目现有共享内容选择函数在 `src/lib/content.ts`：`getPublishedPosts()`、`getProjects()`、`getExperiences()`、`getBlogPath()` 与 `getProjectPath()`。页面和列表复用它们，不再各自定义公开范围或排序。
- 新增及大幅修改文件使用项目已有的 `#components/*`、`#layouts/*`、`#config/*` 等 imports；同一目录的相邻文件可以使用相对路径。不要只为统一 import 改动无关文件。
- 延续现有文件夹与命名方式，避免顺手引入 `ui`、`services`、`repositories` 等额外层次；确有新职责时再增加。

## 渲染与交互

- 优先 Astro 静态组件、语义 HTML、CSS 和少量原生 TypeScript。
- 当前没有客户端框架集成；新增框架须与任务需求相符，并同步依赖与 Astro 集成，不预留无调用者的框架配置或目录。
- 集合内容在构建时读取，不在浏览器请求本地 YAML/Markdown 源文件。
- 跳转使用 `<a>`，改变页面状态使用 `<button type="button">`。可选 URL 不存在时省略链接，避免 `window.open(undefined)`。
- 需要筛选时检查 `basic/filter.astro` 是否适用，保留按钮状态和可访问名称。无 JavaScript 时至少仍能阅读内容。
- 动效和媒体按内容需要使用；尊重 `prefers-reduced-motion`，不要新增与真实项目无关的视频或装饰占位图。
- 首页粒子以 `e9ea692`（2026-06-06）为回溯基准，使用原有 `particles.js` 与 `src/assets/particles.json` 配置；页面加载时开启减少动效则不创建粒子。英文简历从 `public/documents/` 提供，下载路径集中维护在 `site.resumeUrl`；更新文件时检查公开 PDF 与链接是否一致。

## 内容 schema

以下是审计时的运行时契约摘要；实际生成前仍以 `src/content.config.ts` 为准。

| 集合名 | 文件来源 | 必需字段 | 常用可选或默认字段 |
| --- | --- | --- | --- |
| `blogs` | `src/content/blogs/**/*.{md,mdx}` | `title`、`pubDate`（解析为 Date）、`description` | `author` 默认站点姓名，`tags` 默认 `[]`，`draft` 默认 `false` |
| `experience` | `src/content/experience/**/*.{yaml,yml,json}` | `jobTitle`、`company`、`startDate`、至少一个 `bullets` | `location`、`endDate`、`tags`、`techStack`、`logo`、`companyWebsite`、`highLights`、`referenceLetter` |
| `projects` | `src/content/projects/**/*.{yaml,yml,json}` | `title`、`slug`、`summary`、`category`、`projectType`、`role`、3–5 个 `techStack`、至少一个 `sections` | `period`、`year`、`status`、`links`、`featuredMedia`、`coverMedia`、`media`、`order`、`featured`；完整维护说明见 [project-showcase.md](project-showcase.md) |

容易出错的现有约束：

- 集合名是 `blogs`，公开路由是 `/blog`，两者不能混用。
- Experience 当前字段为 `highLights`，不是模板中的 `highlights`。除非任务包含迁移，否则按现有 schema 写入。
- `referenceLetter` 一旦提供，当前 schema 要求同时包含 `path`、`refererName`、`refererAvatar`、`refererSentence`；引文至少 10 个字符，文件后缀限 PDF/DOC/DOCX/TXT。不能用占位内容绕过必需字段。
- `path` 后缀校验不会证明文件存在，图片路径也不会证明公开权限。发布前核对真实文件及使用范围。
- Experience 当前日期是字符串，已有内容使用 `Dec 2025`、`Present` 等格式。不要未经迁移就改成 Date 字段、ISO 专用解析或新的任职状态模型。
- Project `status` 仅接受 `In Progress` 或 `Completed`，没有默认值；所有者未提供状态时省略字段和 UI，不自行推断。
- `logo` 使用 schema 的 `image()`，按实际内容文件位置提供可解析的图片，不把任意字符串当成已验证图片。
- Experience 按开始日期倒序排列，相同日期按 id 稳定排序；已移除 `featured` 与 `order`。Projects 保留这两个展示字段：先将 Controls & Automation / SCADA 作为同一优先组，再按 featured 优先、order 升序、year 倒序排列；平局按 id 稳定排序。首页只取显式 featured 的前两项，不在缺少精选时自动编造精选标签。媒体条目的 `order` 独立控制章节内阅读顺序。
- Projects 使用严格 schema；旧 `description`、`bullets`、`tags`、`githubUrl` 等字段已迁移为摘要、章节、分类与 `links`。新增案例从 `src/content/projects/structure.txt` 开始，不能复制旧字段。重复 slug、媒体来源、无效章节引用、缺失本地视频会使构建失败。

## 正式发布规则

公开 Blog 列表、详情静态路径和 RSS 通过 `getPublishedPosts()` 一致排除 `draft: true`，sitemap 不包含草稿页。详情路由为 `src/pages/blog/[...slug].astro`，支持内容子目录；单层旧文章 URL 保持 `/blog/文章id` 形式。

列表和 RSS 复用 `getBlogPath()` 生成相同路径；构建详情时从已过滤的静态路径直接传入集合条目，不再二次按任意 slug 查询。日期统一使用英文显示，并固定时区，避免构建机器区域设置改变日期。

新增或修改任何文章出口时，检查其他出口是否仍遵循同一规则。是否按未来日期定时发布尚未约定，不自行引入日期过滤或定时任务。

内容 schema 变更属于完整迁移：一起检查所有内容条目、类型、页面、RSS、示例和手工模板。不要仅重命名字段或放宽验证来消除错误。没有真实数据时，提供空状态和待补充项。

当前三个集合通过 `localGlob()` 包装 Astro glob loader：在同步前清理源文件已删除的缓存条目，覆盖 Astro 7.0.7 在目录为空时提前返回的行为。不要用清除整个缓存来掩盖内容删除失败；升级依赖后用 `verify:site` 的连续删除场景验证，再判断是否仍需要兼容处理。

## 样式与布局

- 优先复用 `--bg`、`--surface`、`--surface-hover`、`--card`、`--border`、`--text`、`--text-secondary`、`--text-muted`、`--accent` 等现有 token，按设计规范区分其用途。
- Tailwind 工具类与 Astro scoped CSS 均可使用；跟随所在模块的表达方式。全局 CSS 仅承载跨页面基础规则，不为单个卡片扩大影响范围。
- 目前只有 dark token，HTML 也固定 dark。不得假定配置中出现 light 就表示已支持浅色主题；主题任务需统一 token、DOM 状态和组件行为。
- 普通内容页使用 MainLayout 的宽度与主标题；项目详情使用 ProjectDetailLayout，并复用 Layout 的文档外壳。博客正文从 h2 开始，避免重复 h1。首页与项目详情自行提供唯一的 main/h1。
- 检查窄屏换行、长标题、长链接和空内容，不以固定卡片高度掩盖截断问题。

## 页面质量

- metadata 通过现有布局的 title/description 传入；共享站点信息复用配置。联系方式的 URL 从 `src/config/site.ts` 的 `contactLinks` 派生，联系区、社交图标与页脚复用，组件只选择需要显示的入口。
- 部署地址统一由 `src/config/deployment.mjs` 提供给 Astro，不在身份配置中重复维护。改动域名或 base 时同步核对 canonical、RSS、sitemap、站内链接和静态资源路径；原始 public / 站内路径通过 `withBase()` 渲染，Astro 图片 URL 不重复加 base。Markdown 链接由 Remark 处理；静态页面使用 trailing slash，404 输出为 `404.html`。操作步骤见 [部署说明](../github-pages-deployment.md)。
- 图片提供恰当的替代文本和尺寸；装饰性图片使用空 alt。iframe 仅在存在真实媒体需求时渲染，并有可访问标题。
- 键盘可达，焦点可见，交互状态可被辅助技术理解。先使用原生 HTML 语义，再按需添加 ARIA。
- 用测量结果报告性能与可访问性；未经实际运行，不宣称达到 Lighthouse 分数或完成 WCAG 验证。

## 命令与验证

当前可用项目命令：`pnpm run dev`、`pnpm run build`、`pnpm run preview`、`pnpm run verify:site`、`pnpm run verify:output`、`pnpm run verify:design`、`pnpm run astro -- ...`。

`verify:output` 在正式 build 后检查实际 `dist/` 的站内链接、资源、metadata、RSS、sitemap、大小写和体积。`verify:site` 另外覆盖根路径、Project Pages 和自定义域名子路径。CI 只构建一次正式站点并上传已验证的 Artifact；本地检查通过不代表远程发布或端到端自动化已验证。

`verify:site` 使用 Node 内置断言，在独立临时工作区复制代码并构建内容场景，验证草稿、嵌套文章路径、RSS、项目分类优先级、独立详情路由、缺少可选数据、Figure 排序、三种媒体布局、本地视频与按需外部播放器、非法引用/重复来源/slug、空集合、导航和静态跳转。测试插图只在临时目录生成，不进入正式内容，也不代替浏览器交互验证。

临时工作区复用 node_modules 链接，但必须使用自己的 Astro `cacheDir` 与 Vite cache，避免默认缓存经链接污染正式构建。Projects 的集合 ID 使用完整源文件相对路径，与公开 slug 分开，防止默认 loader 用重复 slug 覆盖条目而绕过 URL 唯一性校验。

scripts 目前没有 `lint`、`check` 或 `typecheck`，也未声明完整的 Astro 类型检查工具链。不能生成报告声称运行了不存在的检查；如要引入工具，应单独在任务范围内配置。

代码或内容变更优先执行 `pnpm run build`，再根据受影响行为验证生成页面、RSS、链接或交互。build 不等于完整类型检查。纯文档修改检查链接、事实一致性和 diff 即可，不需要为了形式添加测试。

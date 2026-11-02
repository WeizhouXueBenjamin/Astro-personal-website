# 工程与内容约定

本文维护数据流、运行时契约和兼容约束。业务含义见[business.md](business.md)，代码写法见[coding-style.md](coding-style.md)，验证命令与选择见[workflows.md](workflows.md#验证选择)。历史审计不代表当前实现。

## 事实来源

| 信息 | 优先读取 |
| --- | --- |
| 依赖、pnpm、Node 与可执行脚本 | [package.json](../../package.json)；精确解析版本再查 lockfile |
| 渲染、集成与公开域名 | [astro.config.mjs](../../astro.config.mjs)、[deployment.mjs](../../src/config/deployment.mjs) |
| 身份、联系方式与 CV 路径 | [site.ts](../../src/config/site.ts)；公开 PDF 位于 `public/documents/` |
| 教育、证书与能力分类 | [profile.ts](../../src/config/profile.ts) |
| 集合匹配与字段验证 | [content.config.ts](../../src/content.config.ts)；不复制完整 schema 表 |
| 内容选择、排序与 URL | [content.ts](../../src/lib/content.ts) |
| 内容缓存与开发监听 | [local-content-loader.ts](../../src/lib/local-content-loader.ts) |
| 路由、布局与导航 | `src/pages/`、`src/layouts/`、`src/components/GlobalNav/` |
| 样式数值 | [global.css](../../src/styles/global.css)；用途见设计规范 |

配置与文档冲突时报告差异，以实际代码描述现状，不通过改写措辞假装已完成迁移。

## 数据流与内容选择

配置保存共享身份和能力，内容集合保存作者内容；页面及领域组合组件在构建时读取，浏览器不请求本地内容源文件。

- `getPublishedPosts()` 统一排除 `draft: true`，列表、详情静态路径和 RSS 必须使用同一范围，sitemap 不含草稿。集合叫 `blogs`，公开路由为 `/blog`。
- `getBlogPath()` 保持嵌套文章 URL 一致；详情通过已过滤的静态路径传入条目，不再按任意 slug 二次查询。日期固定英文和时区；未来日期过滤或定时发布尚未约定，不自行添加。
- `getExperiences()` 按开始日期倒序，相同日期按 id 稳定排序；Experience 不使用 `featured/order`。
- `getProjects()` 将 Controls & Automation / SCADA 作为同一优先组，再按 featured 优先、order 升序、year 倒序及 id 排列。首页只取显式 featured 的前两项，链接复用 `getProjectPath()`。
- Projects 的集合 ID 使用完整源文件相对路径，与公开 slug 分开，防止重复 URL 被 loader 覆盖后绕过唯一性检查。

修改 schema 必须同步内容、类型、消费者、RSS 与模板，不静默丢字段，不放宽验证掩盖错误。项目编写与媒体契约见[项目展示规范](project-showcase.md)。

## 容易误用的契约

- Experience 字段为 `highLights`；日期为字符串，沿用现有月份格式和 `Present`，不未经迁移改为 Date 或新状态模型。
- `referenceLetter` 的必需子字段、长度与后缀以 schema 为准。后缀通过不代表文件存在或允许公开；不能用占位引文或头像绕过验证。
- `image()` 必须解析真实图片；链接、媒体、PDF 与使用范围还需核对实际资源。
- Projects 使用严格 MDX frontmatter，技术章节在正文组织；不恢复旧 YAML 章节或媒体排序字段。项目状态未知时省略，不推断为 Completed。
- MDX 的章节、Figure、分组和测试引用由 `remark-projects.mjs` 处理，Hero 与正文共用 `project-schema.ts`；本地视频由 `project-media.ts` 校验。

## 页面外壳与访问方式

- `Layout.astro` 提供文档、metadata、导航和页脚；`MainLayout.astro` 提供普通内容页容器与主标题。项目和文章分别使用专用 DetailLayout，复用文档外壳。
- 每页唯一 main/h1。普通页面正文从 h2 开始；首页、项目详情和文章阅读页自己提供主标题，分别由首页、ProjectHero 和 BlogDetailLayout 负责。
- Blog 目录由 `render()` 的 h2/h3 生成，桌面侧栏、窄屏原生 details；没有章节时省略，不增加作者维护字段。列表显示日期、最多三个既有标签、标题和摘要。
- metadata 通过布局传入；共享联系 URL 从 `site.contactLinks` 派生，组件只选择入口。
- CV 链接读取 `site.resumeUrl`，文案为 View CV，使用 `target="_blank"`、`rel="noopener noreferrer"`，不加 `download`；更新 PDF 后检查文件与入口一致。
- 仅使用静态 Astro、语义 HTML 和按需原生脚本。链接使用 a，状态操作使用 `button type="button"`；客户端框架或服务需符合当前需求并同步依赖与集成。

### iframe 可访问标题

仅在存在真实媒体需求时使用 iframe，并提供描述其内容的非空 `title`，使辅助技术能够识别嵌入内容。优先使用原生 HTML 语义，按需添加 ARIA。

## 域名与部署

公开地址来自部署配置，`SITE_URL` 可覆盖默认自定义域名。仅支持 HTTPS 根路径；拒绝子路径、凭据、query 和 fragment，不读取 Git remote 或 `GITHUB_REPOSITORY` 推导地址。

站内链接和 public 资源使用根路径；Astro 图片保留生成的 URL，不恢复 base 包装或 Markdown 链接重写。静态页面使用 trailing slash，404 为 `404.html`；robots 从 Astro site 生成 sitemap 地址。域名变更需一起核对 canonical、RSS、sitemap、robots 和资源。

CI 保留正式构建一次并上传已验证 Artifact 的流程；本地成功不代表远程发布已验证。操作步骤见[部署说明](../github-pages-deployment.md)。

## Loader 与验证环境

三个集合使用 `localGlob()`：同步前清理已删除源文件的缓存条目；开发模式初始为空时保留 add/change 监听，首条有效内容出现后交回原生监听，并补扫监听建立期间的新增文件。

这是针对早期 Astro 7.0.7 空目录提前返回造成缓存和 watcher 缺口的兼容处理。升级依赖后运行站点验证中的连续删除与实时空目录恢复场景，再决定是否移除；不以清缓存、忽略警告或添加占位内容掩盖失败。

场景验证使用独立临时工作区；即使通过链接复用 node_modules，Astro `cacheDir` 与 Vite cache 也必须独立，避免污染正式构建。临时插图和内容不能进入正式集合，测试结束关闭自己的 dev 服务。

依赖维护同步 Volta pin 与 Workflow 的 Node 值，核对 Markdown processor API 和 loader 兼容层。历史安全检查结果见[依赖维护记录](../dependency-security-maintenance.md)。

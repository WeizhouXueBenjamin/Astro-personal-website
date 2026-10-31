# Benjamin Xue · Automation & Software Integration

基于 Astro 静态生成的个人职业展示网站，重点呈现 PLC/SCADA、工业自动化、系统集成与软件开发。网站正文使用 NZ English，业务文档与 AI instructions 使用中文。

## 本地运行

使用项目 package.json 指定的 pnpm 与 Node 版本：

```sh
pnpm install
pnpm run dev
pnpm run typecheck
pnpm run lint
pnpm run test:quality
pnpm run build
pnpm run verify:output
pnpm run preview
pnpm run verify:site
pnpm run verify:design
pnpm run verify:ai-docs
pnpm run test:ai-docs
```

build 生成 dist；preview 用于检查构建结果。verify:site 使用隔离临时工作区验证发布规则、RSS、项目列表与空状态、导航和静态跳转，不修改正式内容。verify:design 检查深色主题常用 token 配对的 WCAG 对比度。

typecheck 与 lint 独立执行，不自动修复文件；覆盖范围和验证边界见[验证选择](docs/ai/workflows.md#验证选择)。test:quality 验证检查入口的失败行为、Lint 规则、视频加载和 CI 门禁。CI 依赖关系与发布条件见[部署流程](docs/github-pages-deployment.md#配置与流程)。

## 页面与内容

| 路径 | 职责 | 主要来源 |
| --- | --- | --- |
| / | 职业定位、精选项目、联系与背景入口 | site 配置、projects 集合 |
| /about | 工程方向、完整经历、教育与证书 | site/profile 配置、experience 集合 |
| /projects | 统一项目卡片，当前不显示分类筛选 | projects 集合 |
| /projects/[slug] | Hybrid Case Study、成果媒体、技术章节与验证证据 | projects 集合与本地媒体 |
| /blog | 正式文章列表 | blogs 集合 |
| /blog/文章id | 正式文章详情，支持子目录 | blogs 集合 |
| /rss.xml | 与文章页面一致的正式文章 Feed | getPublishedPosts() |
| /robots.txt | 允许抓取并声明当前部署的 sitemap 地址 | Astro site |
| /experience | 跳转至 /about#work-experience | 静态跳转页 |
| /gallery | 暂缓，跳转首页 | 静态跳转页 |

旧地址通过 HTML meta refresh 和链接处理，不代表静态托管返回 HTTP 301/302。它们不进入主导航或 sitemap。

## 维护入口

部署流程、GitHub Pages 首次启用、域名配置、排障与回滚见 [GitHub Pages 自动部署](docs/github-pages-deployment.md)。正式发布仅允许 `main`；PR 和其他分支的手动运行只验证构建。

- 身份、方向、联系方式和英文简历访问路径：src/config/site.ts；公开 PDF 存放在 public/documents/。
- 教育、证书、能力分类：src/config/profile.ts。
- 项目：src/content/projects 下的 MDX。
- 项目详情、图片、视频与 Figure 的字段、来源及新增流程见 [项目展示维护规范](docs/ai/project-showcase.md)。
- 经历：src/content/experience 下的 YAML/YML/JSON。
- 文章：src/content/blogs 下的 Markdown/MDX；draft: true 的文章不生成公开详情或进入 RSS。
- schema：src/content.config.ts；手工模板仅作参考。
- 内容选择与路径：src/lib/content.ts。
- 主题与基础样式：src/styles/global.css；当前仅实现深色主题，用法见 docs/ai/design-system.md。

两项自动化项目素材由所有者提供，均按个人仿真项目展示。未提供的生产部署、认证、项目状态和指标不补写。Starter Kit 文章作为草稿保留。

src/lib/local-content-loader.ts 保留针对早期 Astro 7.0.7 的 glob loader 空目录问题的兼容处理，包括清理已删除文件对应的缓存条目和恢复开发监听。每次依赖升级后继续用 verify:site 复核这些场景，再单独决定是否移除兼容层。

历史安全维护的版本选择、验证结果和旧构建告警分析见 [依赖安全维护记录](docs/dependency-security-maintenance.md)。当前版本以 package.json 和 lockfile 为准。

## AI 协作

从 [AGENTS.md](AGENTS.md) 开始，按任务选择领域规范。指导文档变更先执行[写入审查](docs/ai/workflows.md#指导文档写入审查)，再运行 `pnpm run verify:ai-docs`。检查器测试使用 `pnpm run test:ai-docs`。

文档检查验证本地 Markdown 链接、标题锚点、活跃文档命令和体积预算；重复长段落仅提醒。它不改写文件，不验证外部网址或业务真实性。现有 Markdown 处理器负责语法解析，无新增依赖。普通任务结果留在会话；需要追溯旧证据时再读取[历史审计索引](docs/ai/project-audit.md)。

未经执行不宣称类型检查、Lighthouse、线上发布或其他验收通过。

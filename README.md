# Benjamin Xue · Automation & Software Integration

基于 Astro 静态生成的个人职业展示网站，重点呈现 PLC/SCADA、工业自动化、系统集成与软件开发。网站正文使用 NZ English，业务文档与 AI instructions 使用中文。

## 本地运行

使用项目 package.json 指定的 pnpm 与 Node 版本：

```sh
pnpm install
pnpm run dev
pnpm run build
pnpm run preview
pnpm run verify:site
pnpm run verify:design
```

build 生成 dist；preview 用于检查构建结果。verify:site 使用隔离临时工作区验证发布规则、RSS、项目列表与空状态、导航和静态跳转，不修改正式内容。verify:design 检查深色主题常用 token 配对的 WCAG 对比度。

## 页面与内容

| 路径 | 职责 | 主要来源 |
| --- | --- | --- |
| / | 职业定位、精选项目、联系与背景入口 | site 配置、projects 集合 |
| /about | 工程方向、完整经历、教育与证书 | site/profile 配置、experience 集合 |
| /projects | 统一项目卡片与分类筛选 | projects 集合 |
| /projects/[slug] | Hybrid Case Study、成果媒体、技术章节与验证证据 | projects 集合与本地媒体 |
| /blog | 正式文章列表 | blogs 集合 |
| /blog/文章id | 正式文章详情，支持子目录 | blogs 集合 |
| /rss.xml | 与文章页面一致的正式文章 Feed | getPublishedPosts() |
| /experience | 跳转至 /about#work-experience | 静态跳转页 |
| /gallery | 暂缓，跳转首页 | 静态跳转页 |

旧地址通过 HTML meta refresh 和链接处理，不代表静态托管返回 HTTP 301/302。它们不进入主导航或 sitemap。

## 维护入口

- 身份、方向、联系方式和英文简历下载路径：src/config/site.ts；公开 PDF 存放在 public/documents/。
- 教育、证书、能力分类：src/config/profile.ts。
- 项目：src/content/projects 下的 YAML/YML/JSON。
- 项目详情、图片、视频与 Figure 的字段、来源及新增流程见 [项目展示维护规范](docs/ai/project-showcase.md)。
- 经历：src/content/experience 下的 YAML/YML/JSON。
- 文章：src/content/blogs 下的 Markdown/MDX；draft: true 的文章不生成公开详情或进入 RSS。
- schema：src/content.config.ts；手工模板仅作参考。
- 内容选择与路径：src/lib/content.ts。
- 主题与基础样式：src/styles/global.css；当前仅实现深色主题，用法见 docs/ai/design-system.md。

两项自动化项目素材由所有者提供，均按个人仿真项目展示。未提供的生产部署、认证、项目状态和指标不补写。Starter Kit 文章作为草稿保留。

当前 Astro 7.0.7 的 glob loader 在目录清空时可能保留缓存条目；src/lib/local-content-loader.ts 在同步前清理已删除文件对应的条目。升级 Astro 后用 verify:site 复核这一行为，再决定是否移除兼容处理。

## AI 协作

从 [AGENTS.md](AGENTS.md) 开始，按任务读取：

- [业务定义与已确认决策](docs/ai/business.md)
- [工程与内容约定](docs/ai/engineering.md)
- [视觉与交互规范](docs/ai/design-system.md)
- [代码生成与组织约定](docs/ai/coding-style.md)
- [任务模板与验收流程](docs/ai/workflows.md)
- [首次审计与后续实施记录](docs/ai/project-audit.md)

代码生成围绕真实内容、单一数据源和实际验证展开。未经执行不宣称类型检查、Lighthouse、线上发布或其他验收已经通过。

# 项目 AI Instructions

## 目标与范围

本项目是 Astro 个人职业展示网站，定位为 **Automation / Control Systems & Software Integration**：突出 PLC/SCADA、工业自动化、系统集成与软件开发，现场技术经验作为实践优势。网站正文使用英文，业务文档与 instructions 使用中文，保留代码术语英文。

主要页面为 Home、About、Projects、Blog。About 集中展示经历；旧 `/experience` 跳转到 `/about#work-experience`，Gallery 暂缓，旧 `/gallery` 跳转首页。

以用户本次明确要求为准。业务决定见 [docs/ai/business.md](docs/ai/business.md)，不要从示例数据、旧页面或历史 Skill 推断新的业务授权。

## 按任务读取

| 工作 | 读取 |
| --- | --- |
| 定位、文案、页面职责、导航与范围 | [业务定义与决策](docs/ai/business.md) |
| 组件、样式、内容集合、schema、路由与 metadata | [工程与内容约定](docs/ai/engineering.md) |
| 文件职责、Props、TypeScript、代码格式与样式组织 | [代码生成与组织约定](docs/ai/coding-style.md) |
| 任务拆分、生成与验收 | [AI 任务流程](docs/ai/workflows.md) |
| 了解现有实现、差距和构建基线 | [带日期的现状审计](docs/ai/project-audit.md) |

只读取与任务相关的细节。审计属于事实快照，待办不代表本轮实施范围。

## 事实来源

- 技术栈、包管理器、可执行脚本：`package.json`。精确依赖版本看 lockfile，不沿用旧文档版本号。
- 静态构建、集成与部署 URL：`astro.config.mjs`。
- 身份与联系方式：`src/config/site.ts`。
- 教育与能力分类：`src/config/profile.ts`。项目事实来自 `projects` 内容集合；用户提供的两项自动化案例都是个人仿真项目。
- 内容契约：`src/content.config.ts`。集合名是 `blogs`、`experience`、`projects`；公开文章路由是 `/blog`。
- 布局：`Layout.astro` 提供文档与 metadata，`MainLayout.astro` 提供内容页容器与主标题。
- 样式：`src/styles/global.css` 的现有 token；当前仅实现 dark token，不假定已支持浅色主题。
- `.codex/astro-personal-website/SKILL.md` 是任务入口，按需引用本文件及上述文档；业务规则统一维护在文档中，不在 Skill 内另设一套定义。

## 生成约束

- 先检查相关文件和 `git status`，保留所有者已有的已暂存、未暂存与未跟踪修改。不要顺手重置、暂存或提交。
- 优先 Astro 静态组件、内容集合、语义 HTML 和少量原生脚本；新增客户端框架或服务需有明确任务需求。
- 沿用现有领域目录、布局、组件与 token。不要因局部需求引入额外架构层或整站重构。
- 个人经历、学历、指标、项目成果、推荐引文必须来自已提供事实。缺少内容时询问或省略，不发布占位事实。
- 共用数据维护一份，通过明确的 Props 或集合类型消费；schema 变更同步内容、消费者与模板。
- 公开文章统一通过 `src/lib/content.ts` 的 `getPublishedPosts()` 获取；列表、详情静态路径与 RSS 一致排除草稿。项目排序与精选也复用该文件。
- 不将个人仿真项目描述为生产现场投运，不把求职方向写成未提供的岗位头衔或工作成果。
- 可选链接、文件和媒体必须有真实来源，缺失时不生成无效交互；保证内容无需 JavaScript 也能阅读。
- 需要所有者决定的是定位、事实冲突和范围等实质问题；常规局部实现可自行处理，已确认事项不反复询问。

## 验证与交付

- 使用 pnpm。现有命令为 `pnpm run dev`、`pnpm run build`、`pnpm run preview`、`pnpm run astro -- ...`。
- 代码或内容改动运行 `pnpm run build`，并验证受影响行为；改动集合、发布、列表、导航或跳转时运行 `pnpm run verify:site`。纯文档修改检查链接、事实与 diff。
- `verify:site` 在临时工作区构建固定内容场景，不写入正式内容；当前没有独立 lint/check/typecheck 脚本。构建和场景验证不等于类型、视觉、性能或线上发布验证通过。
- 区分原有问题与本次改动。说明实际完成结果、验证证据、未验证事项和仍缺少的业务输入。

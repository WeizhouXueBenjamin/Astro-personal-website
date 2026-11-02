# 项目 AI Instructions

本仓库是 Astro 个人职业展示网站，定位为 **Automation / Control Systems & Software Integration**。网站正文使用 NZ English，项目文档与 instructions 使用中文，保留代码术语英文。

## 入口与阅读范围

本文件是统一入口。按任务选择资料，不默认通读；用户当前要求决定本次范围，历史目标、待办和示例不构成新授权。

| 工作 | 唯一维护位置 |
| --- | --- |
| 定位、页面职责、业务决定与事实边界 | [业务定义](docs/ai/business.md) |
| 数据流、内容契约、发布、部署与兼容约束 | [工程约定](docs/ai/engineering.md) |
| 文件职责、Props、TypeScript 与代码写法 | [代码组织](docs/ai/coding-style.md) |
| 视觉方向、token、排版与交互原则 | [设计规范](docs/ai/design-system.md) |
| 案例 MDX、媒体、Figure 与证据来源 | [项目展示](docs/ai/project-showcase.md) |
| 任务执行、指导文档写入审查与验证 | [工作流程](docs/ai/workflows.md) |
| 追溯历史原因或验证证据时才读取 | [历史审计索引](docs/ai/project-audit.md) |

前端与 UI 修改前自动读取并结合 `distinctive-ai-design` Skill，按[设计检查流程](docs/ai/workflows.md#前端与-ui-修改前的设计检查)执行；按当前任务规模应用，不重复确认已定方向。

## 关键约束

- 修改前检查相关实现与 `git status`，保留已有暂存、未暂存和未跟踪修改；不顺手重置、暂存或提交。
- 优先现有 Astro 静态组件、领域目录和 token；新增客户端框架、服务或架构层必须有当前任务需要。
- 个人事实和项目成果必须有已提供的依据。两项自动化案例均为个人仿真，不可写成生产投运或未提供的岗位经历。
- 共用数据只维护一份；schema 变更同步内容、消费者和模板；公开文章、排序与路径复用工程规范指定的共享入口。
- 可选链接、文件与媒体缺失时省略；核心内容无需 JavaScript 也能阅读。
- 已授权的常规实现直接完成；缺少影响业务、事实或范围的决定时集中询问。
- 指导文档写入先按工作流程审查，优先替换原规则。普通任务结果留在会话，不例行追加规范或实施流水。

## 验证与交付

使用 `package.json` 指定的 pnpm、Node 和脚本，按[验证选择](docs/ai/workflows.md#验证选择)执行。指导文档修改运行 `pnpm run verify:ai-docs`，检查事实与 diff；新增或修改检查器时另运行 `pnpm run test:ai-docs`。

交付说明实际改动、验证证据、未验证事项和缺少的输入；构建通过不代表类型、视觉、性能或线上发布验证通过。

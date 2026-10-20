---
name: astro-personal-website
description: 在本仓库实现或审查个人职业展示站的页面、组件、内容集合与发布链路时使用。按项目级 instructions 复用现有 Astro 结构，并验证受影响行为。
---

# Astro Personal Website

本 Skill 用于本仓库的实现与审查。业务定义和工程规则维护在项目文档中，不在这里复制一套。

## 按需读取

- 首先读取仓库根目录的 [AGENTS.md](../../AGENTS.md)。
- 涉及定位、页面职责、栏目合并或文案时，读取 [业务定义](../../docs/ai/business.md)。
- 涉及集合、Props、布局、主题或 metadata 时，读取 [工程约定](../../docs/ai/engineering.md)。
- 组织任务与验收时，读取 [任务流程](../../docs/ai/workflows.md)。
- 排查现有差距时，参考 [现状审计与实施记录](../../docs/ai/project-audit.md)，并核对当前代码；审计是带日期快照。

上述链接按本 Skill 在项目内原有的两层目录位置解析。开始前确认当前目录属于本仓库；不要将这些约定扩展到其他项目。

## 实施

先核对任务范围、相关实现与工作区差异，再按 AGENTS.md 执行。已确认的业务目标不代表已实施，也不自动授权执行整个待办清单。

通过 package.json、astro.config.mjs 与 src/content.config.ts 核对实际依赖、脚本与内容契约，不依赖旧版本描述或手工模板。

只交付范围内的完整改动，并报告实际执行的验证。缺少会影响事实、定位或范围的输入时集中询问，其他独立工作继续推进。

# 依赖安全维护记录

日期：2026-10-27。此文是本次本地实施与验证快照，当前配置仍以 package.json、pnpm-lock.yaml 和部署 Workflow 为准。

## 实施范围

所有者先授权实施证据充分、风险低的修复，随后明确授权准备并验证依赖安全升级。本轮包含：

- 修复 `verify:output` 对 template literal 动态 `_astro` 资源地址的漏检，并用实际构建的粒子脚本断链验证失败路径。
- 新增 `src/pages/robots.txt.ts`，复用 Astro site 与 `withBase()` 声明当前部署的 sitemap；验证根路径、Project Pages 与自定义子路径。
- 补全 `.env.*` 忽略规则，保留 `.env.example` 可跟踪。
- 更新依赖与 Node，生成并验证 lockfile；同步当前部署说明中的 Node 值。

改动仍在本地开发分支，未提交、推送或部署；未修改 GitHub 设置、DNS 或粒子交互。原有 CSS 修改完整保留，原有部署文档修改仅叠加当前 Node 版本的同步。

## 版本选择

| 项目 | 原解析版本 | 本次解析版本 | 依据 |
| --- | --- | --- | --- |
| Node | 22.12.0 | 22.23.4 | 22 LTS 的 security release，本地 Volta pin 与 CI 同步 |
| Astro | 7.0.7 | 7.3.3 | 覆盖 AVIF 图片处理、JSX/MDX 转义与 View Transition CSS 安全修复 |
| Sharp | 0.34.5 | 0.35.5 | 覆盖原生图像库的安全修复 |
| @astrojs/mdx | 7.0.2 | 7.0.8 | 保留 MDX 7，结合匹配的 processor 验证既有内容与插件 |
| @astrojs/markdown-remark | 7.2.1 | 7.3.0 | 满足升级后 Astro 的 peer 要求，继续使用现有 `unified()` API |
| Vite | 8.1.4 | 8.3.5 | 在 Astro/Tailwind 现有约束内刷新，覆盖已知安全修复 |
| Zod | 4.4.3 | 4.6.7 | 在上游允许范围内刷新受影响的传递依赖 |
| source-map-js | 1.2.1 | 1.2.2 | 覆盖 source map 解析 DoS 修复 |

RSS、sitemap、Tailwind 的直接版本维持既有值，按需刷新其传递依赖。未增加新的直接依赖，也未添加强制 overrides。

官方依据：[Node security release](https://nodejs.org/en/blog/release/v22.23.4)、[Astro AVIF 公告](https://github.com/advisories/GHSA-26w7-cxv4-gfx2)、[Astro JSX/MDX 公告](https://github.com/advisories/GHSA-98hj-9722-w3j8)、[Astro CSS 公告](https://github.com/advisories/GHSA-mpr7-6m5w-76rw)、[Sharp 公告](https://github.com/advisories/GHSA-wq5f-xc86-pv6w)。

## 验证结果

Windows、Node 22.23.4、pnpm 10.34.1：

| 检查 | 结果 |
| --- | --- |
| 全新临时目录 `install --frozen-lockfile --offline --store-dir E:\.pnpm-store --config.strict-peer-dependencies=true` | Pass；使用现有 store，严格 peer 校验通过 |
| 正式工作区 frozen-lockfile 离线安装 | Pass；实际 Node 为 22.23.4 |
| `pnpm.cmd audit --prod --json` | 原 35 条公告降至 0 条，含原 1 critical、20 high、12 moderate、2 low |
| `pnpm.cmd run build`，`SITE_URL=https://benjaminxue.nastu.net/` | Pass；10 个 HTML 页面，另生成 robots.txt、RSS 与 sitemap |
| `pnpm.cmd run verify:output` | Pass；45 个文件，211 个站内 URL，3,038,099 bytes |
| `pnpm.cmd run verify:site` | Pass；发布/RSS、集合空状态与开发恢复、排序、媒体证据、三种 base、robots sitemap 地址和动态脚本断链 |
| `pnpm.cmd run verify:design` | Pass；19 组代表性对比度 |
| robots.txt 的实际 Preview HTTP | Pass；200、text/plain，sitemap 地址正确且可访问 |
| Chromium 升级前后对比 | 6 个页面 × 1440/390/320px；所检查的主要布局、文字、媒体尺寸和样式指标一致，无溢出或资源/脚本错误 |
| 交互与阅读 | 键盘焦点、项目筛选、正常粒子启动、减少动效和代表性无 JavaScript 正文通过 |
| 截图评审 | 按现有深色工程作品集方向自查桌面首页、窄屏 Projects、项目与文章；未委派独立评审 |
| `git diff --check` | Pass |

安全审计数字是本次公告数据库与 lockfile 的匹配结果，不是长期安全认证。

## 已知告警与边界

- 当前构建有三条 Vite `MODULE_LEVEL_DIRECTIVE` 告警，涉及两项项目和一篇文章生成的 `use astro:head-inject` directive。本轮保留告警，未通过日志过滤配置隐藏它们；上述内容、产物与浏览器验证未发现对应页面回归。
- pnpm 按现有安装策略跳过 `esbuild@0.28.2` 的安装脚本并提示 warning；预编译依赖可用，真实构建通过，未放宽安装脚本权限。
- 保留针对早期 Astro 空目录行为的 `localGlob()` 兼容层，未将移除兼容处理合并到安全升级。
- 未执行 Linux GitHub Actions、远程发布、完整 TypeScript/Astro check、Lighthouse、真实用户 Core Web Vitals、完整 WCAG 或跨浏览器审核。
- GitHub 分支保护、Dependabot alerts、粒子暂停机制与分享图仍为待确认的后续范围。

## 后续推进计划（2026-10-27 补充）

### 告警定性

已核对安装的 Astro 源码及官方 [issue #18087](https://github.com/withastro/astro/issues/18087)、[修复 PR #18088](https://github.com/withastro/astro/pull/18088)。告警来自 Astro 在内容资源传播模块中生成的遗留 `use astro:head-inject` directive；其旧消费者已被基于 module ID 的检测替代。上游将其列为不破坏功能的 P2 问题，并在 [Astro 7.3.6](https://github.com/withastro/astro/releases/tag/astro%407.3.6) 发布修复。

这不是已证实的 MDX 7 兼容性故障，不要求迁移 MDX major。当前先保留已验证的 7.3.3 基线；后续如吸收 7.3.6，单独验证 processor、内容、样式与告警变化，不直接修补 node_modules 或屏蔽日志。

### 发布范围

本轮只读复核：GitHub `main` 为 `d9c32c5a055cad8eddab2e9ad675eb53661181fc`；当前开发 HEAD 为 `e3f5bc8c103f0002e67d4ef1f0e0d2fdb2fb5ee2`。两者已有 65 个已跟踪文件的差异，包含项目 YAML → MDX、Blog 阅读布局、组件整理等既有工作；这些不是本次安全维护新增的范围。

建议先基于届时重新核对的生产 `main` 准备独立安全维护补丁，既有功能分支另行审阅。下面是准备清单，尚未创建发布分支、提交或 PR：

| 目标 | 独立移植内容 | 验收重点 |
| --- | --- | --- |
| package.json / pnpm-lock.yaml | 四项直接依赖安全升级、Node pin 和相应传递依赖；以生产 manifest 重新解析 | 保留生产原有依赖；frozen 安装、严格 peer 校验及 audit |
| .github/workflows/deploy.yml | 同步 Node 22.23.4 | 其余触发条件、权限和部署限制保持既有规则 |
| .gitignore | `.env.*` 与 `.env.example` 例外 | 忽略敏感变体，示例可跟踪 |
| src/pages/robots.txt.ts | 当前部署 sitemap 入口 | 根路径与子路径、text/plain、sitemap 可访问 |
| scripts/verify-output.mjs | 动态资源引号识别与 robots.txt 存在性 | 真实断链被拒绝，正常产物通过 |
| scripts/verify-site.mjs | 仅移植 robots 与动态脚本断链场景 | 在生产原有内容格式上验证，不复制开发分支的整套脚本 |
| README / 工程与部署说明 / 维护记录 | 与独立补丁确实相关的说明 | 记录该补丁自己的产物和检查结果，不复用开发分支的文件数、URL 数或 UI 验收结论 |

### 推进顺序与验收门槛

1. **独立发布准备：**在隔离目录准备上述补丁并审阅 diff，明确哪些既有功能与文案另行保留。
2. **本地回归：**对独立补丁重新执行 frozen 安装、audit、build、verify:site、verify:output 和受影响的实际页面检查；不沿用当前开发分支的通过记录。
3. **Linux CI 与发布：**补丁和结果可审阅后，请所有者确认提交、推送和 PR 范围；PR 验证 Linux 构建。合并与生产发布再按所有者授权执行，随后核对域名、canonical、robots、媒体和深层路由。
4. **仓库保护：**准备 Dependabot alerts 与 main 保护的具体设置，再经所有者确认实施；个人仓库的规则须保留可操作的维护路径。
5. **后续体验：**先确定粒子暂停与偏好变化响应的交互，再处理分享图；每批独立验证，不与安全维护一起扩大发布范围。

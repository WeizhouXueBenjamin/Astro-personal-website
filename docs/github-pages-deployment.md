# GitHub Pages 自动部署

## 初始检测记录（2026-10-25）

| 项目 | 结果 | Confidence / 证据 |
| --- | --- | --- |
| Repository | `WeizhouXueBenjamin/Astro-personal-website` | Confirmed：唯一 Git remote 与 GitHub Repository API 一致；公开仓库 |
| Repository Default Branch | `main` | Confirmed：GitHub Repository API |
| 当前分支 / Upstream | `feature/basic-setup` / `origin/feature/basic-setup` | Confirmed：本地 Git；比 `origin/main` 多 7 个提交 |
| Production Branch | 拟定 `main` | Inferred：未发现独立生产分支或既有部署流程，本轮 Workflow 将其作为唯一允许发布的分支；尚未上线 |
| Deployment Type | Astro static / GitHub Project Pages | static 已通过构建确认；Project Pages 为 Inferred，仍需核实 Pages 设置 |
| Site URL | 预期 `https://weizhouxuebenjamin.github.io/Astro-personal-website/` | Inferred：根据已确认的 Repository 推导，不代表已发布 |
| Astro Base Path | `/Astro-personal-website` | Confirmed：本地配置推导结果；线上挂载路径尚未验证 |
| Pages Publishing Source | Unknown | 未认证 `GET /repos/{owner}/{repo}/pages` 返回 404；不能据此声称已确认关闭或不存在自定义域名 |
| Custom Domain / HTTPS | Unknown | Pages API 未取得设置，项目中无 `CNAME`；未修改 DNS 或域名 |
| 预期站点 HTTP | 404 | Confirmed：本轮实际 GET 预期 URL；尚不能验证线上页面与媒体 |
| Workflows / Deployments / Environments | 均为 0 | Confirmed：公开 GitHub API；尚无 `github-pages` Environment 可供检查保护规则 |
| 项目结构 | 单一根目录 Astro 项目，无 Submodule 或 workspace 配置 | Confirmed：本地文件和 Git 检查 |

原配置使用域名根路径，且 `src/config/site.ts` 重复维护 URL。本轮将部署 URL 统一由 `src/config/deployment.mjs` 提供给 Astro；身份和联系方式仍在 `site.ts`。

所有者随后明确授权提交、合入 `main`、配置 Pages 与真实发布。通过现有 Git credential helper 认证后，已创建 `github-pages` Environment，仅允许 `main` Branch，并启用 Pages 的 `workflow` Publishing Source。API 已确认 URL 为 `https://weizhouxuebenjamin.github.io/Astro-personal-website/`、`cname: null`、`https_enforced: true`。未设置 Custom Domain 或修改 DNS。发布在隔离的 `deploy/github-pages` worktree 准备；原有未提交文章、经历排序和相关文档修改保留在原工作区，不进入本次发布。

## 当前生产配置（2026-10-25 已验证）

| 项目 | 当前值 | Confidence |
| --- | --- | --- |
| Repository | `WeizhouXueBenjamin/Astro-personal-website` | Confirmed |
| Default / Production Branch | `main` / `main` | Confirmed |
| Deployment Type | Astro static / GitHub Project Pages | Confirmed |
| Site URL | `https://weizhouxuebenjamin.github.io/Astro-personal-website/` | Confirmed：Pages API 与实际 HTTPS |
| Astro Base Path | `/Astro-personal-website` | Confirmed：CI 产物与线上资源 |
| Publishing Source | GitHub Actions（`build_type: workflow`） | Confirmed |
| Custom Domain / HTTPS | 无 Custom Domain；HTTPS enforced | Confirmed |
| Environment | `github-pages`，只允许 `main` Branch | Confirmed |

## 配置与流程

Workflow：[`../.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)。

`main` 的 Push、目标为 `main` 的 Pull Request、任意分支的 `workflow_dispatch` 均执行验证。只有 `main` 的 Push / 手动运行能够进入 Deployment Job。PR（包括 Fork PR）和其他分支的手动运行仅构建，不发布；不使用 `pull_request_target`，不需要部署 Secret。

Build Job 只有 `contents: read`，执行官方 `withastro/action@v6`：安装一次依赖，运行 `verify:site`、正式 `build`、`verify:output`，最后上传一次 Artifact。`verify:site` 的额外构建用于隔离内容场景，并非重复构建正式站点。Node 固定为项目要求的 `22.12.0`，pnpm 从 `package.json` 读取；CI 下按 frozen lockfile 安装。没有配置独立 lint / Astro Check / TypeScript Check，不把 build 当作完整类型检查。

Deployment Job 依赖 Build 成功，只授予 `pages: write`、`id-token: write`，使用 `actions/deploy-pages@v5` 和 `github-pages` Environment。Concurrency 按 PR / Git ref 分组；生产构建与部署顺序运行，`cancel-in-progress: false`，新 Push 不会取消进行中的发布。GitHub 可以替换同一组中尚未开始的 pending run；保留最新待执行版本。

`SITE_URL` 表示**包含挂载子路径的完整 HTTPS URL**。优先级为：

1. 环境变量 `SITE_URL`（Actions 从同名 Repository Variable 读取）。
2. Actions 提供的 `GITHUB_REPOSITORY`。
3. 本地唯一且已核实的 `origin` GitHub remote。

普通 Repository 推导 `/<repo>/`，`<owner>.github.io` Repository 推导 `/`。代码不写死个人 GitHub 地址。下载归档或移除 Git 信息后，需要显式设置 `SITE_URL`。复制到其他 Remote / Fork 后应重新核实发布目标；推导值不能代替实际 Pages 设置。

Astro 使用 `output: static`、`trailingSlash: always` 和目录 `index.html`，与 Pages 的目录路由一致。`withBase()` 只用于渲染原始站内路径，不对 Astro 已处理的图片 URL 二次添加 base。Markdown / MDX 的 Markdown 链接、图片和链接定义通过 Remark 同步处理 base；为使用 Astro 7 当前的 processor API，显式声明已在依赖树中的官方 `@astrojs/markdown-remark@7.2.1`，不使用已弃用的 `markdown.remarkPlugins` 配置。MDX 中自行编写的组件或 HTML 属性需要使用路径工具；`verify:output` 会检查最终产物是否存在遗漏。

`404.html` 复用现有布局并使用绝对 base 资源路径，包含 `noindex`；跳转页和 404 不进入 sitemap。`/experience/` 使用 HTML 跳转至 `/about/#work-experience`，`/gallery/` 跳转首页；静态跳转不等于 HTTP 301/302。

## 首次启用与授权边界

1. 先审阅 `feature/basic-setup` 与 `main` 的 7 个既有提交差异，并明确哪些未提交内容需要发布。不要只把 Workflow 复制到旧 `main`：它还缺少本次配套脚本和网站实现。
2. 在所有者授权后，将完整、审阅过的部署改动通过 PR 合入 `main`，保留已有 Git History。
3. 仓库 **Settings → Pages → Build and deployment → Source → GitHub Actions**。如果实际设置显示已存在域名或其他发布源，先核实迁移影响，再调整；不要直接覆盖。
4. 如果实际 Pages URL 与推导地址不同，在 **Settings → Secrets and variables → Actions → Variables** 添加 `SITE_URL`，填写实际完整公开 URL。普通 Project Pages 不需要这个 Variable。
5. Pages 创建 `github-pages` Environment 后，检查 **Settings → Environments → github-pages**。如当前 Plan 支持且所有者授权，可限制 Deployment Branch 为 `main`，保留原有审批规则。Workflow 已有分支条件，但 Environment 限制能进一步保护生产。
6. 首次启用晚于 Push 时，前往 **Actions → Validate and deploy Astro → Run workflow**，选择 `main`。手动发布成功只能证明 Deployment；随后仍需一次真实 Push 验证自动更新。

GitHub 插件能管理 Repository / PR，但不提供 Pages / Environment 设置的管理接口；本机也未安装 `gh`。本轮使用现有 Git credential helper 在内存中提供认证，经 GitHub 官方 REST API 完成设置，凭据不写入文件或日志。其他环境权限不足时，由具有 Repository 管理权限的所有者完成设置，或提供可用的受权管理方式。不要将 Token 写入代码、聊天或日志。

## 日常更新

- 代码：修改 `src/` 中对应页面或组件。
- Projects：修改 `src/content/projects/` 的 YAML/YML/JSON，字段与事实规则见 [项目展示规范](ai/project-showcase.md)。项目详情在构建阶段由 `getStaticPaths()` 生成。
- 截图和视频 poster：存放在 `src/assets/projects/`，在项目条目中按源文件相对路径引用，由 Astro 处理。
- 本地视频 / 字幕：存放在 `public/media/projects/`，内容中仍填写 `/media/projects/实际文件.mp4` 或 `.vtt`，不手工加入 Repository 名。渲染时统一添加 base。
- 简历和推荐材料：放在 `public/documents/`，只添加实际存在且可公开的文件。
- Blog：修改 `src/content/blogs/`；`draft: true` 保持从列表、详情路径、RSS 和 sitemap 一致排除。

本地执行：

```sh
pnpm install --frozen-lockfile
pnpm run verify:site
pnpm run build
pnpm run verify:output
```

Windows 如遇 PowerShell 执行策略限制，使用 `pnpm.cmd`。本机现有依赖采用 `E:\.pnpm-store`；默认 store 不一致时，可使用 `pnpm.cmd install --frozen-lockfile --offline --store-dir E:\.pnpm-store`，无需为部署迁移 store。CI 不需要这个本机路径。

经审阅合入 `main` 的内容和媒体更新会自动发布，无须手工上传 `dist/`。功能分支通过 PR 检查；其他分支需要临时验证时，可在已有 Workflow 的 **Run workflow** 中选择相应分支，Deployment Job 会跳过。

## 查看结果与排障

[Repository Actions](https://github.com/WeizhouXueBenjamin/Astro-personal-website/actions) 中检查对应 Commit SHA 的运行，展开 Build 的安装、验证、构建、上传日志，再检查 Deploy 日志与 Environment URL。确认实际部署版本与预期 Commit 一致。

| 症状 | 处理 |
| --- | --- |
| Build 失败 | 从首个失败步骤读取完整错误，本地运行同一命令；区分依赖、schema、缺失媒体与构建错误，修复后正常 Push。不要跳过验证 |
| lockfile 安装失败 | 使用 `package.json` 指定的 pnpm 版本，确认依赖声明与 lockfile 一起更新；不在 CI 删除 lockfile 或关闭 frozen 安装 |
| Pages 未启用 / 404 | 核对 Source 是否为 GitHub Actions、当前运行是否为 `main`、部署是否成功，以及实际 Pages URL；404 API 响应也可能来自访问权限不足 |
| 资源 / 内部链接 404 | 对照实际 Pages 地址核对 `SITE_URL` 与 base，执行 `build` 后再执行 `verify:output`；检查文件名大小写。内容中的 public 路径不含 base，输出应包含 base |
| Deploy 权限或保护规则失败 | 检查 Job 的 Pages/OIDC 权限、`github-pages` Environment 的分支规则和审批，以及仓库 / 组织 Actions Policy；不要删除保护规则来绕过失败 |
| 非 `main` 手动运行未发布 | 这是预期保护；发布生产需使用 `main` |
| 网站没有更新 | 核对最新 Commit、触发事件、Build / Deploy 结论、Pages URL 与缓存；不要只看首页能否打开 |

`verify:output` 检查产物中的站内链接、媒体、srcset、CSS URL、JS 中的 `_astro` 路径、canonical / Open Graph、RSS、sitemap、大小写、必需输出和发布体积。它不访问外部链接，不等于浏览器交互、视频解码、性能或 WCAG 检查。上线后仍需用实际 HTTP / 浏览器检查 Home、About、Projects、每个项目详情、截图、视频、静态资源、旧地址和任意不存在的深层地址。

## 媒体与平台限制

本轮检查：最大 public 文件 `public/media/projects/feeder-demo.mp4` 为 1,343,975 bytes（约 1.28 MiB），无须删除、降质或迁移。现有本地截图由 Astro 优化；没有引入外部字体或媒体服务。

GitHub Pages 当前限制包括发布站点不超过 1 GB、Deployment 超过 10 分钟会超时、月流量软限制 100 GB；源仓库建议不超过 1 GB。自定义 Actions 发布不受每小时 10 次 Pages build 软限制影响。大视频增加前重新核对 [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) 和 Git 文件限制；`verify:output` 会阻止超过 1 GB 的发布产物。

官方集成依据：[Astro GitHub Pages 指南](https://docs.astro.build/en/guides/deploy/github/)、[withastro/action v6](https://github.com/withastro/action/blob/v6/action.yml)、[checkout releases](https://github.com/actions/checkout/releases)、[deploy-pages releases](https://github.com/actions/deploy-pages/releases)。Actions 版本于本轮核实；后续升级需要重新验证 Node、pnpm 和 Artifact 兼容性。

## 回滚

1. 在 Actions / `github-pages` Deployment History 中找到最后一次成功且实际检查过的版本，记录 Commit SHA；结合 `git log --oneline` 和 `git show <sha>` 确认内容。
2. 从最新 `main` 创建修复分支，对引入问题的普通 Commit 使用 `git revert <bad-sha>`。多个提交按实际 History 规划顺序；Merge Commit 需要先确认正确 mainline，不机械复制命令。
3. 通过 PR 验证并合入 `main`。这个新 Commit 会自动重新构建、发布；无需 Force Push 或 Hard Reset。
4. 核对新 run 的 Commit、Build、Deployment 和实际网站；若问题来自 `SITE_URL` 或 Pages Settings，另行恢复经确认的旧配置，再运行当前 `main`。

简单重跑旧 Workflow 可能重新发布旧 Artifact，却没有恢复 `main` 的内容，不能代替可审计的版本回滚。

## 未来 Custom Domain

所有者确定真实域名后，按 GitHub 官方步骤配置 DNS、Pages Custom Domain 与 HTTPS；保留现有域名直到迁移方案确认。将 Repository Variable `SITE_URL` 设置为实际完整 URL（根域名通常为 `https://实际域名/`），本地也使用相同变量，重新构建检查，再运行 `main` 的 Workflow。`site` 和 `base` 自动从该值统一推导，无须改写 Workflow 或逐个改内容路径。Actions 发布不依赖 `public/CNAME` 判断域名生效。

## 验收状态

Configuration Ready、Deployment Verified、Full Automation Verified 是独立状态。只有真实 Push 自动触发、构建与发布成功，并确认线上对应版本更新后，才能标记 Full Automation Verified。本轮本地验证结果及尚未授权的生产操作见交付报告；不得把文件已创建或旧站能访问写成自动部署已验证。

本轮实际结果（2026-10-25）：

| 检查 | 结果 / 证据 |
| --- | --- |
| Dependency Installation | Pass：隔离发布 worktree 使用 `pnpm.cmd install --frozen-lockfile --offline --store-dir E:\.pnpm-store`；lockfile 仅新增官方 Markdown processor 的直接引用 |
| Existing Tests | Pass：`pnpm.cmd run verify:site`，含既有内容场景、根路径、Project Pages、自定义域名子路径、Markdown / MDX 链接、错误根路径与大小写失败场景 |
| Production Build | Pass：`pnpm.cmd run build`，输出 static；两项项目详情均生成 |
| Static Output | Pass：Windows 隔离 worktree 为 43 个文件、176 个站内 URL、3,017,607 bytes；Linux CI 为 43 个文件、176 个站内 URL、3,016,620 bytes。不包含原工作区未提交文章 |
| 本地 Preview HTTP | Pass：Home、About、Projects、两个项目详情、Blog、RSS、sitemap、favicon、简历均为 HTTP 200；视频 Range 为 HTTP 206 / `video/mp4` / 1024 bytes；不存在的深层路径返回自定义 HTTP 404 |
| Workflow / GitHub Actions | Pass：PR 与非生产分支的手动运行均 Build success / Deploy skipped；`main` 的真实 Push 自动完成 Build、Artifact 上传与 Deploy |
| Astro / TypeScript Check | Not Run：项目没有独立配置，不把 build 当作类型检查 |
| 线上 HTTP / 媒体 | Pass：下载线上实际引用的 41 个文件并验证 176 个站内 URL；简历与视频 SHA-256 和本地原文件一致；视频 Range 返回 206，缺失深层地址返回自定义 404 |
| 线上浏览器 / 视频解码 | Pass：1440 / 390 / 320px × 6 个页面共 18 组，无横向溢出、导航遮挡或图片失败；canonical、当前导航、筛选、减少动效、无 JavaScript 正文检查通过；1920×1080、87.27 秒视频实际播放；未捕获脚本异常或站内资源错误 |
| 完整 WCAG / 跨浏览器审核 | Not Run：已检查 19 组对比度及 Chrome 实际页面，不等于完整 WCAG 或其他浏览器验证 |
| Pages Deployment / Full Automation | Pass：真实 `main` Push、GitHub Actions、Pages Deployment 与更新后的线上网站均有证据 |

Configuration Ready：**Yes**；Deployment Verified：**Yes**；Full Automation Verified：**Yes**。

首次自动发布证据：

- [PR #1](https://github.com/WeizhouXueBenjamin/Astro-personal-website/pull/1)：合入既有 7 个功能提交及本轮部署提交，保留 Git History；原有未提交文章和经历排序未发布。
- [PR validation run](https://github.com/WeizhouXueBenjamin/Astro-personal-website/actions/runs/40155201638)：Build success，Deploy skipped。
- [非生产分支手动运行](https://github.com/WeizhouXueBenjamin/Astro-personal-website/actions/runs/40155487896)：`workflow_dispatch` 选择 `deploy/github-pages`，Build success，Deploy skipped；未覆盖生产。
- [Production Push run](https://github.com/WeizhouXueBenjamin/Astro-personal-website/actions/runs/40155304852)：由合并提交 `c9719befa5bf474260e29ac03fd1e2099030ac97` 的 Push 自动触发，Build / Deploy success。
- Pages Deployment ID `7307666609` 对应上述 Commit，状态 `success`；[Deployment log](https://github.com/WeizhouXueBenjamin/Astro-personal-website/actions/runs/40155304852/job/121055520690)。随后实际访问 [生产网站](https://weizhouxuebenjamin.github.io/Astro-personal-website/) 完成 HTTP 与浏览器检查。
- 原工作区的浏览器截图与结果在忽略目录 `.astro/pages-live-review/`；HTTP 验证结果在 `.astro/pages-live-http-results.json`。这些本地证据不进入网站内容集合或公开站点。

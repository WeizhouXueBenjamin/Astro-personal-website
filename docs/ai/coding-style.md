# 代码生成与组织约定

本文维护代码写法；数据、发布与布局契约见[工程约定](engineering.md)，主题语义见[设计规范](design-system.md)。生成前先定位实际消费者与数据源，沿用现有领域目录。

## 文件与复用

- `src/pages/` 组合路由与页面，领域组件可读取本领域集合；`src/layouts/` 提供共享外壳，不在业务组件复制 head、导航和页脚。
- 静态配置、作者内容和共享选择行为分别留在现有 config、content、lib 中，不在组件建立第二份事实或规则。
- 优先现有 Experience、ProjectList、GlobalNav 等领域目录。已有多个消费者确需共享时才提取最小函数或样式；不为假设中的复用增加服务层、工厂或全局状态。
- 新功能应有真实调用者、明确输入和可观察行为，不生成无调用者的组件体系。

## Astro 与 Props

- frontmatter 顺序为 import、Props 类型、props 解构、派生数据；其后为模板、按需 script 与 scoped style。
- 使用 `interface Props` 或 `type Props`。复用公开类型时提供本地 Props 别名以便 Astro 识别，保持调用接口。
- 领域组件优先接收完整 `CollectionEntry<"projects">` 或 `CollectionEntry<"experience">`；展示组件仅接收所需数据，不传整份站点配置。
- 可选内容在模板中显式判断；无值时不生成空 href、不可用按钮或占位媒体。
- CSS 类使用有业务含义的 kebab-case；动态状态使用 `class:list` 或原生状态属性，不依赖文本内容选择元素。

## TypeScript 与交互

- 沿用现有 imports aliases；相邻文件使用简短相对路径，不批量改写无关 import。
- 类型使用 `import type` 与集合契约，不复制字段定义或用 any 掩盖结构问题。
- 派生值负责展示，不重新解释任职状态、项目完成度或证据是否已验证。
- DOM 脚本不导入构建时内容读取或 Node 文件系统代码。筛选、展开优先局部 DOM 状态，重复初始化保持安全。

## 样式组织

- 全局 CSS 负责 token、基础排版及已复用 recipe；scoped CSS 负责组件结构、布局和局部状态。
- 外观从共享 token 取值。已有 recipe 的按钮、卡片和标签不再叠加冲突工具类；Tailwind 用于适合的局部布局。
- CSS 一条声明一行，状态和媒体查询紧邻基础规则。inline style 仅用于数据驱动的自定义属性或尺寸。
- 不用全局 button、iframe 等宽泛规则修复单一组件；焦点和减少动效可以全局定义。

## 格式与注释

- 新写 TypeScript 使用双引号、分号、两空格缩进；较长 Astro 属性和 map 模板展开排版。
- 提交普通源码，不手工压缩，不重排第三方 minified 脚本。
- 注释解释业务约束、兼容原因和非显然选择，不逐行复述代码。
- 只整理受影响部分，保留无关修改。本文格式是编写约定，未由自动格式化、lint 或完整类型检查强制执行；新增工具需在任务范围内提供配置与命令。

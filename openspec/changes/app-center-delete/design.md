## Context

应用中心（app-center）当前页面结构：
- 左面板：Accordion（FAccordion + FAccordionItem）展示应用域树，每个应用域节点内嵌 FListView 展示模块列表
- 右面板：FListView 以卡片视图（CardView）展示当前选中模块下的应用
- 每张应用卡片 footer 包含状态标签、发布/下线/上线按钮、`...` 按钮（当前仅承载 GIT 操作 popover）

约束：
- 不可修改 FAccordionItem / FListView 组件源码（组件库处于独立 repo，变更应限于应用层）
- 使用现有 modalService / notifyService（通过 `inject` 获取）
- 使用 `f-icon-delete` 作为删除图标（来自 Farris 字体图标库）

## Goals / Non-Goals

**Goals:**
- 为应用域、模块、应用三种实体提供删除入口
- 设计安全的确认流程（弹窗 + 名称校验）
- 保持 UI 简洁，删除入口不常态占据视觉空间
- 删除逻辑独立封装（独立 service），不污染 GitService

**Non-Goals:**
- 不支持批量删除
- 不支持删除撤销/回收站
- 不修改发布/下线/上线逻辑

## Decisions

### 1. 左侧树节点：Hover 浮现删除图标

通过 CSS `:hover` 伪类控制图标可见性，无需 JS 状态管理。

- 应用域（Accordion）：利用 `FAccordionItem` 的 `toolbar` slot（`.panel-item-tool`）放置图标，CSS 控制默认 `opacity: 0`，`.card-header:hover .panel-item-tool .f-delete-icon` 显示
- 模块（ListView item）：在 `renderAppModule` 的返回 JSX 中增加图标元素，CSS 控制默认隐藏，父 `li` hover 显示

有子节点时：图标显示但添加 `disabled` class（`opacity: 0.3; cursor: not-allowed; pointer-events: none`），配合 `title` 属性给出原生 tooltip。

### 2. 右侧卡片 `...` popover：分组 + 危险操作

将 popover 菜单改为分组结构，常驻两区：

```
GIT操作（分组标题）
─────────────（分隔线）
  📥 拉取
  📤 推送
  ...（动态）

危险操作（分组标题）
─────────────（分隔线）
  🗑 删除应用
```

- GIT 操作区分组：内容随 git 状态动态变化（现有逻辑不变）
- 危险操作区分组：始终显示「删除应用」，红色文字（`#f56c6c`），`f-icon-delete` 图标
- `...` 按钮 aria-label：从「GIT 操作」改为「更多操作」

### 3. 确认弹窗设计

- **应用删除**：需要输入应用名称匹配确认，确认按钮为红色
- **应用域/模块删除**：普通「取消/确认」弹窗，确认按钮红色
- 弹窗使用 `modalService.open()` 渲染（与现有创建/发布弹窗一致）

### 4. 服务层：独立 app-delete.service.tsx

新建 `src/services/app-delete.service.tsx`，提供：
- `deleteBusinessObject(boId: string): Promise<boolean>` — 调用 `DELETE /api/runtime/sys/v1.0/business-objects/{boId}`
- `deleteApp(path: string, boId: string): Promise<boolean>` — 调用 `POST /solo-mte-publish/delete-app`

二者都返回 `boolean` 表示成功/失败，失败时内部调用 `notifyService.error()`。

### 5. 有子节点时的交互

点击禁用态删除图标时，不执行任何操作（pointer-events: none），通过 `title` 属性的原生浏览器 tooltip 提示原因。不额外弹出 notify。

**备选方案**：移除 pointer-events: none，点击时弹出 warning notify。但这样增加了 JS 交互复杂度，且 tooltip 已传达信息，故不采用。

## Risks / Trade-offs

- **风险**：删除 API 失败后，本地数据已刷新但远程未删除 → **缓解**：仅在 API 返回成功时才刷新数据；失败时保留现有数据状态
- **风险**：用户误触删除 → **缓解**：应用删除需要输入名称确认；应用域/模块有子节点检查
- **权衡**：Hover 浮现图标的发现性依赖于用户习惯 → **接受**：这是 VS Code / GitHub 等开发者工具的惯例，目标用户群体熟悉此模式

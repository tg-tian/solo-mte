## Why

应用中心当前支持创建应用域、模块和应用，但不支持删除。用户无法清理误创建或不再使用的实体，导致数据膨胀。此外，"更多操作"（`...`）按钮目前仅承载 GIT 操作，缺少危险操作的容纳空间。此次变更为三种实体提供安全、明确的删除能力。

## What Changes

- 左侧树面板：应用域和模块节点 hover 时浮现删除图标，有子节点时禁用 + tooltip 提示
- 右侧应用卡片：`...` 按钮 popover 增加分组标题（"GIT操作" / "危险操作"），危险操作区以红色样式提供「删除应用」入口
- 删除应用域/模块：调用 `DELETE /api/runtime/sys/v1.0/business-objects/{boId}`
- 删除应用：调用 `POST /solo-mte-publish/delete-app { path, boId }`
- 所有删除操作弹出确认弹窗；应用删除需输入名称二次确认；应用域/模块仅需「取消/确认」确认
- 删除成功或失败后自动刷新数据
- 新建独立的 `app-delete.service.tsx` 处理删除逻辑（不侵入现有 `GitService`）
- `...` 按钮 aria-label 从「GIT 操作」变更为「更多操作」

## Capabilities

### New Capabilities

- `app-delete`: 在应用中心页面提供删除应用域、模块和应用的能力，包含前置校验（子节点检查）、确认弹窗和安全输入确认

### Modified Capabilities

<!-- 无现有 specs 需要修改 -->

## Impact

- **组件**：`apps.component.tsx` — 新增删除图标渲染、popover 分组、确认弹窗逻辑
- **样式**：`apps.css` — 新增 hover 删除图标、危险操作区、分组标题样式
- **服务**：新增 `app-delete.service.tsx` — 封装删除 API 调用（DELETE business-objects、POST delete-app）
- **类型**：`composition/type.ts` — 无变化
- **API**：依赖 `/solo-mte-publish/delete-app`（已存在）和 `/api/runtime/sys/v1.0/business-objects/{boId}`（平台 API）

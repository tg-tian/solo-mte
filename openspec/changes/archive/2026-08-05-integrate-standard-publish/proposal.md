## Why

定制项目的 `app-builder` 预览与 `app-center` 发布目前无法正常工作:预览只发布前端表单元数据(参数甚至是硬编码样例值),后端元数据未编译,预览必然失败;发布则只调迁移接口,但没有构建产物可迁移。只有先执行标准产品的完整发布(将应用元数据编译为前后端产物并部署到低代码环境),后续的预览和迁移才有意义。

## What Changes

- 新增共享发布模块(与 `app-builder`、`app-center` 平级),迁移标准产品(web-ide2022)的发布核心闭环:**进度 WebSocket**(`/api/dev/main/v1.0/lcm-log/ws?token={uuid}`)+ **发布 API**(`POST /api/dev/main/v1.0/repo-packages/publish?id={uuid}&path={boPath}`)+ **进度面板 UI**。
- `app-builder` 预览按钮行为变更为:先执行标准产品发布,成功后关闭发布进度面板并打开预览页(`/apps/platform/development-platform/ide/app-preview/index.html?path=...&appId=...&ws=...`);失败则保持面板显示错误信息,不打开预览。移除现有硬编码参数的 `publishFormMetadata` 调用。
- `app-center` 发布按钮行为变更为:先执行标准产品发布,成功后关闭发布进度面板,再执行现有迁移流程(`POST /solo-mte-publish/publish` → 成功确认重启对话框);失败则保持面板显示错误信息,不执行迁移。
- 不迁移日志 ws(仅进度 + 错误信息)、不迁移 validatebo 前置校验、不做重启等待(`reStart` 仅作为后端单向通知,成功后直接执行下一步)。

## Capabilities

### New Capabilities
- `standard-publish`: 迁移自标准产品的发布能力——通过进度 WebSocket 监听发布进度(process/stage/status/errorMsg),驱动进度面板展示,返回发布成功/失败结果。供 app-builder 与 app-center 复用。
- `app-builder-preview`: app-builder 应用信息页"预览"按钮行为——先执行标准产品发布,成功后才打开预览页,失败则保持发布面板显示错误信息。
- `app-center-publish`: app-center"我的应用"卡片"发布"按钮行为——先执行标准产品发布,成功后才调用迁移接口,失败则保持发布面板显示错误信息且不迁移。

### Modified Capabilities
<!-- 无现有 spec 需求变更 -->

## Impact

- 新增共享模块:`packages/ide/apps/platform/development-platform/ide/publish/`(组件 + composition + 类型)
- 修改:
  - `packages/ide/apps/platform/development-platform/ide/app-builder/src/components/profile/compositon/use-preview.ts`(替换发布逻辑)
  - `packages/ide/apps/platform/development-platform/ide/app-center/src/services/git.service.tsx`(发布流程前置标准发布)
  - `packages/ide/apps/platform/development-platform/ide/app-center/src/components/apps/apps.component.tsx`(调用链)
- 依赖后端接口(已有,不变):`lcm-log/ws`、`/api/dev/main/v1.0/repo-packages/publish`、`/api/runtime/sys/v1.0/userinfos`(如需)、`/solo-mte-publish/*`
- 无新增依赖

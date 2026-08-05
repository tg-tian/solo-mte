## Context

标准产品(web-ide2022)的发布闭环:发布按钮 → 生成 uuid → 建**进度 WebSocket**(`/api/dev/main/v1.0/lcm-log/ws?token={uuid}`)→ ws onopen 后 `POST /api/dev/main/v1.0/repo-packages/publish?id={uuid}&path={boPath}`(body=null)→ onmessage 解析 `{process, stage, status, errorMsg, reStart}` → `process===100` 成功 / `status===1` 失败 → 关 ws。**发布状态只能通过该 ws 获取,无 REST 轮询兜底**,因此脱离 IDE 页面触发发布必须自建进度 ws。另有一个日志 ws(token=userId,IDE 页面打开时建立)仅用于日志展示,不参与发布功能(本次不迁移)。

本定制项目现状:`app-builder` 的预览按钮调用 `publishFormMetadata`(硬编码样例参数 + 注释掉的 ws 代码,发布对象错误);`app-center` 的发布按钮直接调迁移接口 `/solo-mte-publish/publish`(无产物可迁移)。两个页面都运行在标准后端之上,`lcm-log/ws` 与 `repo-packages/publish` 接口可用。

## Goals / Non-Goals

**Goals:**
- 迁移"进度 ws + 发布 API + 结果分发"闭环到共享模块,供两个按钮复用
- 提供发布进度面板(百分比/阶段/进度条/错误信息),失败保持显示
- 成功 → 关面板 → 执行下一步(预览/迁移);失败 → 不执行下一步

**Non-Goals:**
- 不迁移日志 ws 与"查看日志"功能(用户决策:仅进度+错误信息)
- 不迁移 validatebo 前置校验、脏文件检查(IDE 特有)
- 不做重启等待(`reStart` 仅作后端单向通知;成功即执行下一步)
- 不改动迁移接口 `/solo-mte-publish/*` 及其后端

## Decisions

### 1. 共享模块位置:`apps/platform/development-platform/ide/publish/`

与 `app-builder`、`app-center` 平级的新目录,内含:
- `publish.types.ts` — `PublishProgress`、`PublishResult` 类型
- `use-standard-publish.composition.ts` — 发布核心逻辑(ws 生命周期 + 状态)
- `publish-panel.component.tsx` — 进度面板组件

两个 app 以**相对路径**导入共享模块(如 `../../../../publish/use-standard-publish.composition`)。

**替代方案**:复制逻辑到两个 app。否决——逻辑完全相同,复制必然漂移。
**踩坑记录**:曾尝试沿用既有先例的裸路径导入(`apps/platform/development-platform/ide/...`,profile.component.tsx 中 import app-center 的方式),但 vite 4 的 resolver 对非 `.html` importer 的裸路径不做 root 相对解析,rollup 直接报 `failed to resolve import`;相对路径验证通过。既有那处 `apps/...` 裸 import 属遗留代码,能构建通过原因未深究,不在本次改动范围。

### 2. 发布核心逻辑(use-standard-publish)

照搬标准产品 `publish.component.ts` 的 `connectSocket` 语义:

```
startPublish(boPath): Promise<PublishResult>
  ├─ 显示面板(progress 0%)
  ├─ uuid = crypto.randomUUID()          // 标准产品用 IdService.guid(),效果等同
  ├─ 建 ws: ws(s)://{location.host}/api/dev/main/v1.0/lcm-log/ws?token={uuid}
  │     (wsType 按 location.protocol 切换 ws/wss)
  ├─ onopen → POST /api/dev/main/v1.0/repo-packages/publish?id={uuid}&path={去前导/的boPath}, body=null
  ├─ onmessage → body.match(/\{(.*)\}/)[0] → JSON.parse → 更新 progressInfo
  │     process===100 → ws.close() → resolve({result:true})
  │     status===1    → ws.close() → resolve({result:false, error: errorMsg})
  ├─ onerror → 重连 ≤10 次(重建 ws,复用 onopen 逻辑);超限 → resolve({result:false, error:'发布异常,请重试'})
  └─ closePanel(): 关 ws(若未关)、隐藏面板;调用方在成功后调用
```

- 面板状态(`panelVisible`、`progressInfo`)为响应式(ref),由本 composition 导出,面板组件消费
- 发布中面板不提供关闭按钮;成功/失败后显示关闭按钮,点击调用 `closePanel()`(用户决策:失败保持显示,手动关闭)
- `reStart` 字段解析但不使用(后端单向通知;按用户决策成功即下一步)
- ws 的 `onclose` 不触发重试(与标准一致,仅 onerror 重试)

### 3. 进度面板 UI(publish-panel)

仿标准产品 `publish-waiting-modal`:全屏遮罩 + 居中卡片。
- 标题:进行中「正在发布 {process}%」/ 成功「发布成功」/ 失败「发布失败」
- 5 个阶段行(stage 0-4:生成代码/后端编译/前端编译/打包/部署),已完成 ✓、当前 spinner、未开始灰态
- 进度条 `width: {process}%`(仅进行中)
- 失败时错误信息区显示 `errorMsg`
- 关闭按钮:仅 `status !== 0 || process === 100` 时显示

### 4. app-builder 预览按钮改造

`use-preview.ts`:
- 删除 `publishFormMetadata` 及硬编码样例参数(其调用的 `repo-packages/publish` 与标准发布重复且参数错误)
- `preview(options)` 改为:
  ```
  startPublish(options.path).then(({result}) => {
      if (result) {
          closePanel();          // 成功 → 关面板
          window.open(previewUrl) // 下一步:打开预览页(URL 拼装与现有一致)
          // window.open 返回 null → 提示调整浏览器安全设置
      }
      // 失败:不执行任何操作,面板保持显示错误
  })
  ```
- `profile.component.tsx` 挂载 `<PublishPanel>`

### 5. app-center 发布按钮改造

`apps.component.tsx` 的 `handlePublishClick`:
```
result = await startPublish(boPath)
if (!result.result) return      // 失败:面板保持显示,不迁移
closePanel()                    // 成功:关面板
gitService.handlePublish(boPath, boId)  // 现有迁移流程(loading → /solo-mte-publish/publish → confirmRestart)不变
```
- `git.service.tsx` 的 `handlePublish` 及迁移接口逻辑不动,只调整入口调用链

## 踩坑记录(生产验证发现)

- **axios 415 问题(两轮排查)**:发布接口 @Consumes(application/json),但 axios 无法发出"空 body + Content-Type: application/json"的请求:
  1. `dispatchRequest` 对无 Content-Type 的 POST/PUT/PATCH 注入 `application/x-www-form-urlencoded`(`force=false` 不覆盖已有值)→ 415;
  2. 显式设置 Content-Type 后,`xhr adapter` 又会清除 undefined body 的 Content-Type(lib/adapters/xhr.js:137 "Remove Content-Type if data is undefined")→ 请求无 Content-Type → 仍 415(node/http adapter 无此逻辑,本地实测会误判通过)。
  **修复**:发布请求改用 `fetch`(method POST + headers `Content-Type: application/json` + credentials same-origin,无 body),请求形态与标准产品一致;HTTP 失败时取响应体首行(CXF 错误堆栈)作为错误信息,成功不消费响应(进度经 ws 推送)。**经验**:浏览器 XHR 与 node http 的 axios 行为不同,涉及请求头的验证须以浏览器为准。
- **vite 裸路径 import**:见决策 1。

## Risks / Trade-offs

- [发布状态无 REST 兜底,ws 消息丢失则面板停滞] → 与标准产品一致的行为,接受;失败/成功判定依赖 ws 消息
- [定制环境后端行为与标准环境有差异(如 lcm-log/ws 消息格式)] → 后端同一套,风险低;联调时验证消息格式,消息解析兼容带前缀文本
- [发布中用户刷新/关闭页面,后端任务继续但进度丢失] → 与标准产品一致,接受
- [面板新增为全屏遮罩,可能遮挡 app-builder 的 iframe 设计器] → 全屏遮罩本就是发布中的期望交互;失败时面板有关闭按钮,可解除遮挡

## Migration Plan

纯前端改动,随 `packages/ide` 构建发布。无数据迁移、无后端变更。回滚:还原两个按钮调用点与 `use-preview.ts` 即可(删除 `publish/` 共享模块)。

## Open Questions

无(关键决策已与用户确认:不迁移日志 ws、成功即下一步、不迁移校验、空发布按钮不动)。

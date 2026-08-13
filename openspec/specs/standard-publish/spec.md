# standard-publish Specification

## Purpose
提供迁移自标准低代码产品的应用发布能力:编译应用元数据为前后端产物并部署到低代码环境,通过 WebSocket 实时获取发布进度并在进度面板展示,向调用方返回发布成功或失败结果。
## Requirements
### Requirement: 触发标准发布

系统 SHALL 支持对指定的应用路径(boPath)触发一次标准产品发布:打开发布进度面板,建立进度 WebSocket(以本次发布唯一标识作为 token),并在 WebSocket 连接建立后调用发布接口,然后持续监听发布进度。

#### Scenario: 点击发布/预览按钮触发标准发布

- **WHEN** 用户在 app-builder 点击"预览"按钮或在 app-center 点击"发布"按钮
- **THEN** 系统立即显示发布进度面板(初始进度 0%),建立进度 WebSocket,连接建立后调用发布接口 `POST /api/dev/main/v1.0/repo-packages/publish?id={uuid}&path={boPath}`(boPath 去除前导 `/`),并开始监听进度消息

### Requirement: 发布进度展示

发布进度面板 SHALL 实时展示发布进度:进度百分比(0-100%,标题为"正在编译 {n}%")、进度条、当前阶段。阶段依次为:生成代码、后端编译、前端编译、打包应用、部署应用(进行/完成/未开始状态由行前图标指示:转圈=当前进行、绿色对号=已完成、灰色圆点=未开始)。进度数据仅来源于进度 WebSocket 的进度消息,无轮询兜底。

#### Scenario: 收到进度消息更新面板

- **WHEN** 进度 WebSocket 收到消息且 `process` 在 0-100 之间、`status` 为 0(进行中)
- **THEN** 面板更新进度百分比、进度条和当前阶段(按 `stage` 字段映射)

#### Scenario: 发布中禁止手动关闭面板

- **WHEN** 发布正在进行中(未收到最终结果)
- **THEN** 面板不提供关闭按钮,用户无法手动关闭面板

### Requirement: 发布成功

当进度 WebSocket 收到 `process === 100` 的进度消息时,系统 SHALL 判定发布成功:关闭进度 WebSocket,面板显示成功状态,并向调用方返回成功结果。调用方随后关闭面板并执行其后续步骤。

#### Scenario: 发布成功且返回成功结果

- **WHEN** 进度 WebSocket 收到 `process === 100` 的消息
- **THEN** 系统关闭进度 WebSocket,面板显示"发布成功",并向调用方返回成功结果;调用方关闭面板并执行后续步骤(打开预览页/调用迁移接口)

### Requirement: 发布失败

当进度 WebSocket 收到 `status === 1` 的进度消息时,系统 SHALL 判定发布失败:关闭进度 WebSocket,面板显示失败状态与错误信息(`errorMsg`),**保持面板打开**,并向调用方返回失败结果。调用方不得执行后续步骤。

#### Scenario: 发布失败且面板保持显示错误信息

- **WHEN** 进度 WebSocket 收到 `status === 1` 且含 `errorMsg` 的消息
- **THEN** 系统关闭进度 WebSocket,面板显示"发布失败"及 `errorMsg` 内容,面板保持打开不自动关闭,调用方不执行后续步骤

#### Scenario: 发布失败后用户手动关闭面板

- **WHEN** 发布失败后用户点击面板的关闭按钮
- **THEN** 面板关闭,页面停留在当前状态,不执行任何后续动作

### Requirement: 进度 WebSocket 连接失败重试

进度 WebSocket 连接失败时,系统 SHALL 自动重试连接,最多 10 次。超过重试上限仍无法连接时,判定发布失败:面板显示通用错误信息(如"发布异常,请重试")并保持打开,调用方不执行后续步骤。

#### Scenario: WebSocket 重连成功继续发布

- **WHEN** 进度 WebSocket 首次连接失败且重试次数未超过上限
- **THEN** 系统自动重新建立连接,重试次数加一;重连成功后继续触发发布并监听进度

#### Scenario: WebSocket 重连超过上限判定失败

- **WHEN** 进度 WebSocket 连续连接失败超过 10 次
- **THEN** 系统判定发布失败,面板显示通用错误信息并保持打开,调用方不执行后续步骤

### Requirement: 发布结果反馈给调用方

发布流程 SHALL 以 Promise 形式向调用方返回结果(`{ result: boolean, error?: string }`):成功时 `result: true`;失败时 `result: false` 且携带错误信息。调用方依据结果决定后续行为。

#### Scenario: 调用方依据结果执行后续

- **WHEN** 发布流程结束且返回 `result: true`
- **THEN** 调用方关闭面板并执行其后续步骤(打开预览页/调用迁移接口)

- **WHEN** 发布流程结束且返回 `result: false`
- **THEN** 调用方不执行后续步骤,面板保持打开显示错误信息


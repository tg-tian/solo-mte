## Purpose

定义 app-builder 应用信息页"预览"按钮的行为:先执行标准产品发布,发布成功后才打开预览页面,发布失败则保持发布面板显示错误信息。

## ADDED Requirements

### Requirement: 预览前先执行标准产品发布

app-builder 应用信息页的"预览"按钮 SHALL 先触发一次标准产品发布(使用当前应用的 boPath),发布成功后才打开预览页面;不得再调用旧的表单元数据发布逻辑。

#### Scenario: 点击预览按钮触发标准发布

- **WHEN** 用户在应用信息页点击"预览"按钮
- **THEN** 系统显示发布进度面板并执行标准产品发布,发布期间不打开预览页面

### Requirement: 发布成功后打开预览页面

当标准产品发布成功时,系统 SHALL 关闭发布进度面板,并以当前应用的工作区参数打开预览页面(`/apps/platform/development-platform/ide/app-preview/index.html?path={path}&appId={appId}&ws={workspaceId}`,参数取自当前工作区)。

#### Scenario: 发布成功打开预览页

- **WHEN** 标准产品发布成功(`process === 100`)
- **THEN** 发布进度面板关闭,系统打开预览页面 URL(含当前应用的 path、appId、workspaceId 参数)

#### Scenario: 预览窗口被浏览器拦截

- **WHEN** 发布成功后尝试打开预览页面但新窗口被浏览器拦截
- **THEN** 系统提示用户调整浏览器安全设置后重试

### Requirement: 发布失败不打开预览

当标准产品发布失败时,系统 SHALL 不打开预览页面,发布进度面板保持显示错误信息,用户可手动关闭。

#### Scenario: 发布失败保持面板

- **WHEN** 标准产品发布失败(进度消息 `status === 1` 或 WebSocket 连接重试超限)
- **THEN** 系统不打开预览页面,发布进度面板保持显示"发布失败"及错误信息,用户可点击关闭按钮关闭面板

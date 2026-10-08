## 1. 共享发布模块

- [x] 1.1 新建 `apps/platform/development-platform/ide/publish/` 目录,编写 `publish.types.ts`(`PublishProgress`、`PublishResult` 类型)
- [x] 1.2 实现 `use-standard-publish.composition.ts`:`startPublish(boPath): Promise<PublishResult>` —— uuid 生成、进度 ws 建立(ws/wss 按协议切换)、onopen 后 `POST /api/dev/main/v1.0/repo-packages/publish?id={uuid}&path={去前导/的boPath}`,进度消息解析(`process===100` 成功 / `status===1` 失败带 errorMsg),onerror 重连 ≤10 次超限报"发布异常,请重试"
- [x] 1.3 实现 `publish-panel.component.tsx`:全屏遮罩面板,标题/5 个阶段行/进度条/失败错误信息区;关闭按钮仅在非进行中显示,发布中禁止关闭
- [ ] 1.4 面板组件与 composition 联调:状态共享(panelVisible、progressInfo 响应式),`closePanel()` 关闭 ws 并隐藏面板

## 2. app-builder 预览按钮

- [x] 2.1 改造 `app-builder/src/components/profile/compositon/use-preview.ts`:删除 `publishFormMetadata` 及硬编码样例参数;`preview()` 改为先 `startPublish(options.path)`,成功后 `closePanel()` + `window.open` 预览页(URL 拼装与现有一致,window.open 被拦截时提示调整浏览器安全设置),失败不执行任何操作
- [x] 2.2 在 `profile.component.tsx` 挂载 `<PublishPanel>` 组件

## 3. app-center 发布按钮

- [x] 3.1 改造 `app-center/src/components/apps/apps.component.tsx` 的 `handlePublishClick`:先 `startPublish(boPath)`,失败直接返回(面板保持显示);成功后 `closePanel()` 再调用 `gitService.handlePublish(boPath, boId)`(迁移流程不变)
- [x] 3.2 在 apps 组件挂载 `<PublishPanel>` 组件

## 4. 验证

- [x] 4.1 `npm run build`(packages/ide)通过(vite build 48s 成功;publish 模块进共享 chunk,appBuilder/appCenter 入口均引用;vue-tsc 对新增/改动文件无类型错误,其余报错均为仓库既有问题)
- [ ] 4.2 联调验证:app-builder 预览 —— 发布成功打开预览页;发布失败(如制造错误元数据)面板保持显示错误信息、不打开预览(需真实后端环境)
- [ ] 4.3 联调验证:app-center 发布 —— 发布成功后面板关闭并执行迁移(出现"是否重启运行环境"确认框);发布失败面板保持显示、不调迁移接口(需真实后端环境)

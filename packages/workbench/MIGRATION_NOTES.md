# Solo-Front 迁移到 Workbench 说明

## 迁移完成内容

### 1. 代码迁移
- ✅ 已将 `mte-prototype/solo-front/src` 的所有源代码迁移到 `apps/meta-modeling/meta-modeling-l2/meta-modeling-l3/meta-modeling-app/src/`
- ✅ 已迁移所有组件、API、Store、类型定义等

### 2. 应用入口创建
已创建四个独立的应用入口：

1. **设备类型** (`device-type-list`)
   - 入口：`apps/meta-modeling/meta-modeling-l2/meta-modeling-l3/device-type-list/`
   - 组件：`DeviceTypeList`

2. **设备型号列表** (`device-model-list`)
   - 入口：`apps/meta-modeling/meta-modeling-l2/meta-modeling-l3/device-model-list/`
   - 组件：`DeviceModelList`

3. **节点类型** (`node-type-list`)
   - 入口：`apps/meta-modeling/meta-modeling-l2/meta-modeling-l3/node-type-list/`
   - 组件：`NodeTypeList`

4. **组件类型** (`component-list`)
   - 入口：`apps/meta-modeling/meta-modeling-l2/meta-modeling-l3/component-list/`
   - 组件：`ComponentList`

### 3. 菜单配置更新
- ✅ 已更新 `public/assets/solo-functions.json`
- ✅ 菜单项已更新为：设备类型、设备型号列表、节点类型、组件类型
- ✅ 移除了"设备类型定制"和"组件定制"菜单项

### 4. 构建配置更新
- ✅ 已更新 `vite.config.build.ts`，添加了新的应用入口
- ✅ 已更新 `vite.config.dev.ts`，添加了新的应用入口
- ✅ 已配置路径别名 `@` 指向 `meta-modeling-app/src`
- ✅ 已更新 `tsconfig.json` 添加路径映射

### 5. 依赖项更新
- ✅ 已在 `package.json` 中添加必要依赖：
  - `element-plus`: ^2.9.7
  - `pinia`: ^3.0.1
  - `pinia-plugin-persistedstate`: ^4.2.0
  - `vue-router`: ^4.5.0

## 后续需要完成的工作

### 1. 安装依赖
```bash
cd packages/workbench
npm install
```

### 2. 检查 API 配置
- 检查 `meta-modeling-app/src/utils/request.ts` 中的 API 基础 URL
- 确保 API 请求路径正确
- 可能需要配置代理或更新 API 地址

### 3. 路由处理
由于这些应用在 iframe 中运行，可能需要：
- 移除或调整路由跳转逻辑（如 `navigateToDeviceTypeSetting`）
- 使用 workbench 的消息机制进行页面跳转
- 或者保持路由，但确保路由配置正确

### 4. 样式调整
- 检查样式是否正确加载
- 确保 Element Plus 样式正确引入
- 可能需要调整一些样式以适应 iframe 环境

### 5. 测试
- 测试每个应用入口是否正常加载
- 测试 API 调用是否正常
- 测试功能是否完整

### 6. 后端迁移（如果需要）
如果后端也需要迁移，需要：
- 将 `mte-prototype/engine` 迁移到合适的位置
- 配置后端服务
- 更新 API 地址配置

## 文件结构

```
workbench/
├── apps/
│   └── meta-modeling/
│       └── meta-modeling-l2/
│           └── meta-modeling-l3/
│               ├── meta-modeling-app/          # 共享源代码
│               │   └── src/
│               │       ├── api/
│               │       ├── store/
│               │       ├── types/
│               │       ├── utils/
│               │       └── views/
│               ├── device-type-list/           # 设备类型入口
│               ├── device-model-list/          # 设备型号列表入口
│               ├── node-type-list/            # 节点类型入口
│               └── component-list/            # 组件类型入口
```

## 注意事项

1. **路径别名**：所有组件使用 `@/` 路径别名，指向 `meta-modeling-app/src`
2. **共享代码**：所有应用共享 `meta-modeling-app/src` 下的代码
3. **独立入口**：每个应用有独立的 `index.html` 和 `main.ts`
4. **iframe 环境**：这些应用在 workbench 的 iframe 中运行，需要注意跨域和消息通信

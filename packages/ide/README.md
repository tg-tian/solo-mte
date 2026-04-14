# IDE 项目开发指南

本项目实现场景计算元工具平台，以 UBML 项目社区发行版 inBuilder 社区版为基础运行环境。

## 目录结构

```
packages/ide/
├── apps/                          # 功能模块前端代码
│   └── platform/
│       └── development-platform/
│           └── ide/
│               ├── app-builder/   # 应用构建器
│               └── app-center/    # 应用中心
├── src/                           # 基础运行代码
├── vite.config.dev.ts             # 开发环境配置
├── vite.config.build.ts           # 构建环境配置
└── package.json                   # 项目依赖配置
```

其中，`apps` 下的文件目录结构与运行部署目录结构一致，分四级目录，每级目录具有特定含义：

- **第一级目录**：代表顶层关键应用
- **第二级目录**：代码功能模块
- **第三级目录**：代表应用分组
- **第四级目录**：代码具体功能

独立的功能模块可以按此结构组织源代码。

## 运行环境配置

### 前置要求

在运行项目之前，需要确保已安装以下环境：

- Node.js (推荐 v16+)
- pnpm (推荐使用 pnpm 作为包管理器)
- inBuilder 社区版运行环境（本地运行在 5200 端口）

### 配置本地代理服务

在开发模式下，可以通过配置代理服务，实现与 inBuilder 社区版集成调试。

编辑 `vite.config.dev.ts` 配置文件，在配置文件中已包含 `proxy` 配置节点：

```TypeScript
server: {
    proxy: {
        "/api": {
            target: "http://localhost:5200",
            changeOrigin: true,
            secure: false
        },
        "/platform": {
            target: "http://localhost:5200",
            changeOrigin: true,
            secure: false
        },
        "/runtime": {
            target: "http://localhost:5200",
            changeOrigin: true,
            secure: false
        }
    }
}
```

其中，`proxy` 配置对象的 `key` 为代理 restful 风格 api 的路径，`target` 属性指向 inBuilder 在本地运行的端口号（默认 5200）。

## 如何运行 IDE 项目

### 开发模式

开发调试需要同时启动以下两个服务：

**1. 启动本地文件系统服务（localfs-server）**

app-builder 中集成了 Web 版 VS Code 编辑器，需要通过 `localfs-server` 提供本地文件系统访问能力。该服务是一个独立的 Node.js HTTP 服务器，为编辑器的 `FileSystemProvider` 提供 REST API，支持文件的读写、目录浏览、重命名、删除等操作。

```bash
# 在项目根目录（推荐）
pnpm --filter @solo/ide run localfs

# 或直接进入目录运行
cd packages/ide
node localfs-server.mjs [rootDir] [port]
```

- `rootDir`：服务的根目录，默认为当前工作目录
- `port`：监听端口，默认为 `3456`

启动后终端会输出：

```
[localfs-server] Serving "<rootDir>" on http://localhost:3456
[localfs-server] API prefix: /__localfs/
```

**2. 启动 Vite 开发服务器**

```bash
# 在项目根目录（推荐）
pnpm --filter @solo/ide run dev

# 或直接进入目录运行
cd packages/ide
pnpm dev
```

开发服务器启动后，可以通过浏览器访问应用入口页面进行预览调试。`vite.config.dev.ts` 中已配置代理，将 `/__localfs` 请求转发至 localfs-server（端口 3456）：

```TypeScript
"/__localfs": {
    target: "http://localhost:3456",
    changeOrigin: true,
    secure: false
}
```

### localfs-server API 说明

所有接口以 `/__localfs/` 为前缀，通过 `path` 查询参数指定目标路径：

| 接口 | 方法 | 说明 |
|------|------|------|
| `/__localfs/stat?path=<path>` | GET | 获取文件/目录状态信息 |
| `/__localfs/readdir?path=<path>` | GET | 列出目录内容 |
| `/__localfs/readfile?path=<path>` | GET | 读取文件内容 |
| `/__localfs/writefile?path=<path>` | POST | 写入文件内容（请求体为文件数据） |
| `/__localfs/mkdir?path=<path>` | POST | 创建目录（支持递归创建） |
| `/__localfs/delete?path=<path>&recursive=true` | POST | 删除文件或目录 |
| `/__localfs/rename?path=<from>&to=<to>` | POST | 重命名/移动文件 |
| `/__localfs/set-root` | POST | 动态切换根目录（请求体：`{"rootDir": "<newPath>"}` ） |
| `/__localfs/get-root` | GET | 获取当前根目录 |

### 构建应用程序

可以执行以下命令构建 release 交付物：

**构建为 SystemJS 格式模块：**
```bash
pnpm --filter @solo/ide run build:system
```

**构建为 Vite 标准模块：**
```bash
pnpm --filter @solo/ide run build
```

将编译后的交付物部署在 inBuilder 社区版 `web\apps` 目录下。

### 配置打包应用页面

应用页面采用 rollup 进行打包，对于独立应用模块需要配置独立打包入口。

编辑 `vite.config.dev.ts` 和 `vite.config.build.ts` 配置文件，在配置文件中已包含 `rollup` 配置节：

```TypeScript
build: {
    rollupOptions: {
        input: {
            main: resolve(__dirname, 'index.html'),
            appBuilder: resolve(__dirname, 'apps/platform/development-platform/ide/app-builder/index.html'),
            appCenter: resolve(__dirname, 'apps/platform/development-platform/ide/app-center/index.html')
        }
    }
}
```

其中，`input` 节点的 `key` 为应用编号，值为独立应用模块入口页面路径。

## app-builder 组件结构

app-builder 是 IDE 的核心应用构建器，位于 `apps/platform/development-platform/ide/app-builder/src/components/` 目录下。

### 组件注册机制

所有组件通过 `component-registry.ts` 进行注册管理：

```typescript
// component-registry.ts
const componentRegistryMap = new Map<string, any>([
    ['menu', FAppMenu],
    ['variables', FAppVariables],
    ['profile', FAppProfile],
    ['analysis', FAppAnalysis],
    ['devices', FAppDevices],
    ['pages', FAppPages],
    ['page-flow', FAppPageFlows],
    ['logic-flow', FAppLogicFlows]
]);
```

### 组件目录结构

每个组件通常包含以下文件结构：

```
component-name/
├── component-name.component.tsx    # 组件主文件
├── component-name.props.ts         # 组件 Props 定义
├── component-name.scss             # 组件样式文件
├── composition/                    # 组合式函数目录
│   ├── use-component-name.ts      # 组合式函数实现
│   └── types.ts                    # 类型定义
├── mock-data.ts                    # 模拟数据（可选）
└── type.ts                         # 类型定义（可选）
```

### 核心组件说明

#### 1. Pages 组件（页面设计器）

**位置：** `components/pages/`

**功能：** Web 应用页面设计器，用于管理和设计应用页面。

**文件结构：**
- `pages.component.tsx` - 主组件，实现页面列表展示和设计器打开逻辑
- `pages.props.ts` - Props 类型定义
- `composition/use-page.ts` - 组合式函数，提供页面数据获取和创建功能
- `composition/types.ts` - 定义 `UsePage` 接口

**核心功能：**
- 页面列表展示（卡片视图）
- 打开页面设计器（通过 iframe 嵌入）
- 支持多种页面类型（Form、GSPBusinessEntity、GSPViewModel 等）
- 功能实例管理（多标签页支持）

#### 2. Logic-Flow 组件（业务逻辑设计器）

**位置：** `components/logic-flow/`

**功能：** 业务逻辑流程设计器，用于设计和编辑业务逻辑流程。

**文件结构：**
- `logic-flow.component.tsx` - 主组件，实现业务逻辑流程管理界面
- `logic-flow.props.ts` - Props 类型定义
- `composition/use-logic-flow.ts` - 组合式函数，提供流程数据获取和创建功能
- `composition/types.ts` - 定义 `UseLogicFlow` 接口

**核心功能：**
- 业务逻辑流程管理
- 通过 iframe 嵌入流程设计器
- 支持 `gspframeworkService.rtf.func.openMenu` API 调用
- 功能实例管理（多标签页支持）

#### 3. Page-Flow 组件（页面流设计器）

**位置：** `components/page-flow/`

**功能：** 页面流程设计器，用于设计和编辑页面之间的流转关系。

**文件结构：**
- `page-flow.component.tsx` - 主组件，实现页面流列表展示和管理
- `page-flow.props.ts` - Props 类型定义
- `composition/use-page-flow.ts` - 组合式函数，提供页面流数据获取和创建功能
- `composition/types.ts` - 定义 `UsePageFlow` 接口

**核心功能：**
- 页面流列表展示（卡片视图）
- 页面流状态管理（测试中、已发布、定制中）
- 支持打开页面流设计器
- 通过 postMessage 与父窗口通信

## 扩展开发指南

### 开发 Web 应用设计器（扩展 Pages）

要扩展 Pages 组件以支持新的页面类型或功能，需要：

1. **修改 `pages.component.tsx`**
   - 在 `designerMap` 中添加新的页面类型映射：
   ```typescript
   const designerMap = new Map<string, string>([
       ['NewPageType', '/platform/path/to/new-designer/index.html'],
       // ... 其他类型
   ]);
   ```

2. **扩展 `composition/use-page.ts`**
   - 修改 `getPages()` 方法以支持新的数据源或过滤条件
   - 实现 `createPage()` 方法以支持创建新页面

3. **更新类型定义**
   - 在 `type.ts` 中添加新的页面类型定义
   - 更新 `composition/types.ts` 中的接口定义

4. **注册组件**
   - 确保在 `component-registry.ts` 中已注册 `FAppPages` 组件

### 开发业务逻辑设计器（扩展 Logic-Flow）

要扩展 Logic-Flow 组件，需要：

1. **修改 `logic-flow.component.tsx`**
   - 配置默认的流程管理页面 URL
   - 实现 `gspframeworkService.rtf.func.openMenu` API 以支持打开流程设计器
   ```typescript
   window['gspframeworkService'] = {
       'rtf': {
           'func': {
               'openMenu': (options: Record<string, any>) => {
                   // 处理打开流程设计器的逻辑
               }
           }
       }
   };
   ```

2. **扩展 `composition/use-logic-flow.ts`**
   - 修改 `getLogicFlows()` 方法以从正确的数据源获取流程数据
   - 实现 `createLogicFlow()` 方法以支持创建新流程

3. **更新类型定义**
   - 在 `composition/types.ts` 中更新 `UseLogicFlow` 接口

4. **注册组件**
   - 确保在 `component-registry.ts` 中已注册 `FAppLogicFlows` 组件

### 开发页面流设计器（扩展 Page-Flow）

要扩展 Page-Flow 组件，需要：

1. **修改 `page-flow.component.tsx`**
   - 实现页面流列表的展示逻辑
   - 实现 `openPageDesign()` 方法以支持打开页面流设计器
   - 使用 `postMessage` 与父窗口通信：
   ```typescript
   window.top?.postMessage({
       eventType: 'invoke',
       method: 'openUrl',
       params: [id, code, name, deployPath]
   });
   ```

2. **扩展 `composition/use-page-flow.ts`**
   - 修改 `getPageFlows()` 方法，确保正确过滤 `PageFlowMetadata` 类型的数据
   - 实现 `createPageFlow()` 方法以支持创建新页面流

3. **更新类型定义**
   - 在 `composition/types.ts` 中更新 `UsePageFlow` 接口

4. **注册组件**
   - 确保在 `component-registry.ts` 中已注册 `FAppPageFlows` 组件

### 通用扩展模式

所有组件的扩展都遵循以下通用模式：

1. **组件主文件（.component.tsx）**
   - 使用 Vue 3 Composition API
   - 实现 UI 渲染逻辑
   - 处理用户交互事件
   - 使用 `useFunctionInstance` 管理功能实例（多标签页）

2. **组合式函数（composition/use-*.ts）**
   - 封装业务逻辑
   - 提供数据获取和操作方法
   - 返回响应式数据和方法

3. **类型定义（types.ts / composition/types.ts）**
   - 定义 TypeScript 接口和类型
   - 确保类型安全

4. **Props 定义（*.props.ts）**
   - 定义组件的 Props 类型
   - 使用 Vue 的 `ExtractPropTypes` 提取类型

## 配置功能入口

本项目提供了功能入口配置文件，可以在以下配置文件中追加功能入口：

**配置文件位置：** `packages/workbench/public/assets/solo-functions.json`

## 注意事项

1. **代理配置**：确保开发环境的代理配置正确，指向正确的 inBuilder 服务地址
2. **组件注册**：新增组件需要在 `component-registry.ts` 中注册
3. **类型安全**：使用 TypeScript 确保类型安全，充分利用类型定义
4. **响应式数据**：使用 Vue 3 的 `ref` 和 `reactive` 管理响应式状态
5. **组合式函数**：将业务逻辑封装在组合式函数中，提高代码复用性

## 相关文档

- [Vue 3 官方文档](https://vuejs.org/)
- [Vite 官方文档](https://vitejs.dev/)
- [inBuilder 社区版文档](https://github.com/UBML/ubml)

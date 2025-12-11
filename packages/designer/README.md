# Designer 设计器组件

Designer 是一个基于 Vue 3 的表单设计器组件，支持 PC 端和移动端的可视化表单设计，提供拖拽式表单构建、代码视图编辑、视图模型设计等功能。

## 运行指南

### 环境要求

- Node.js >= 16.0.0
- pnpm >= 7.0.0

### 安装依赖

在项目根目录执行：

```bash
pnpm install
```

### 开发模式运行

在 `packages/designer` 目录下执行：

```bash
pnpm dev
```

开发服务器将在默认端口启动（通常是 `http://localhost:5173`）。

### 配置代理服务（可选）

如果需要与 inBuilder 社区版集成调试，可以在 `vite.config.dev.ts` 中配置代理：

```typescript
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

## Designer 核心组件目录结构

```
packages/designer/
├── src/
│   ├── components/                    # 核心组件目录
│   │   ├── components/                # 功能组件
│   │   │   ├── change-set/           # 变更集组件
│   │   │   ├── code-view/            # 代码视图组件
│   │   │   │   ├── components/       # 代码视图子组件
│   │   │   │   │   ├── code-tabs.component.tsx      # 代码标签页
│   │   │   │   │   ├── code-view.component.tsx      # 代码视图主组件
│   │   │   │   │   ├── editor-panels.component.tsx  # 编辑器面板
│   │   │   │   │   ├── fields-getter.component.tsx # 字段获取器
│   │   │   │   │   ├── nav-tree.component.tsx       # 导航树
│   │   │   │   │   └── view-iframe.component.tsx    # 视图iframe
│   │   │   │   └── composition/      # 代码视图组合式函数
│   │   │   ├── entity-tree-view/     # 实体树视图组件
│   │   │   ├── flow-designer/        # 流程设计器组件
│   │   │   ├── form-designer/        # 表单设计器组件
│   │   │   │   └── components/
│   │   │   │       ├── custom-class-editor/         # 自定义类编辑器
│   │   │   │       └── external-component-panel/    # 外部组件面板
│   │   │   ├── form-settings/        # 表单设置组件
│   │   │   ├── monaco-editor/        # Monaco编辑器组件
│   │   │   └── view-model-designer/  # 视图模型设计器组件
│   │   │       ├── method-manager/   # 方法管理器
│   │   │       └── variable-manager/ # 变量管理器
│   │   ├── composition/              # 组合式函数（核心业务逻辑）
│   │   │   ├── command/              # 命令相关
│   │   │   ├── command-builder.service.ts           # 命令构建服务
│   │   │   ├── command-builder-rtc.service.ts       # RTC命令构建服务
│   │   │   ├── command.service.tsx                   # 命令服务
│   │   │   ├── component-schema.service.ts          # 组件Schema服务
│   │   │   ├── control-creator/                     # 控件创建器
│   │   │   ├── control-property-changed.service.ts  # 控件属性变更服务
│   │   │   ├── design-viewmodel.service.ts          # 设计视图模型服务
│   │   │   ├── designer-context/                    # 设计器上下文
│   │   │   │   ├── use-designer-context.ts          # 设计器上下文基类
│   │   │   │   ├── use-mobile-designer-context.ts   # 移动端设计器上下文
│   │   │   │   ├── use-pc-designer-context.ts       # PC端设计器上下文
│   │   │   │   └── use-pc-rtc-designer-context.ts   # PC RTC设计器上下文
│   │   │   ├── events-editor-utils.ts               # 事件编辑器工具
│   │   │   ├── form-metadata-converter.ts           # 表单元数据转换器
│   │   │   ├── form-metadata-rtc.service.tsx        # RTC表单元数据服务
│   │   │   ├── form-metadata.service.ts             # 表单元数据服务
│   │   │   ├── metadata.service.ts                  # 元数据服务
│   │   │   ├── runtime/                             # 运行时相关
│   │   │   ├── schema-repository/                   # Schema仓库
│   │   │   ├── schema.service.ts                    # Schema服务
│   │   │   ├── use-component-provider.ts            # 组件提供者
│   │   │   ├── use-event-parameter-data.ts          # 事件参数数据
│   │   │   ├── use-events-editor.ts                 # 事件编辑器
│   │   │   ├── use-form-schema.ts                   # 表单Schema
│   │   │   ├── use-form-statemachine.ts             # 表单状态机
│   │   │   ├── use-form-validation.ts               # 表单验证
│   │   │   ├── use-location.ts                      # 位置工具
│   │   │   └── use-parameter-editor-data.ts         # 参数编辑器数据
│   │   ├── types/                    # 类型定义
│   │   │   ├── basic.ts              # 基础类型
│   │   │   ├── command.ts            # 命令类型
│   │   │   ├── const.ts              # 常量定义
│   │   │   ├── design-viewmodel.ts   # 设计视图模型类型
│   │   │   ├── designer-context.ts   # 设计器上下文类型
│   │   │   ├── entity-schema.ts      # 实体Schema类型
│   │   │   ├── enums.ts              # 枚举类型
│   │   │   ├── events-editor.ts      # 事件编辑器类型
│   │   │   ├── form-property-config.ts              # 表单属性配置类型
│   │   │   ├── metadata.ts           # 元数据类型
│   │   │   ├── view-model.ts         # 视图模型类型
│   │   │   └── toolbox/              # 工具箱配置
│   │   │       ├── mobile-toolbox.json              # 移动端工具箱
│   │   │       ├── pc-rtc-toolbox.json             # PC RTC工具箱
│   │   │       └── pc-toolbox.json                 # PC工具箱
│   │   ├── designer.component.tsx    # 设计器主组件
│   │   ├── designer.props.ts         # 设计器属性定义
│   │   ├── designer.scss             # 设计器样式
│   │   ├── preview.component.tsx     # 预览组件
│   │   ├── preview.scss              # 预览样式
│   │   └── index.ts                  # 组件导出入口
│   ├── main.ts                       # 应用入口文件
│   ├── App.vue                       # 根组件
│   └── app-providers.ts              # 应用提供者
├── public/                           # 静态资源目录
├── package.json                      # 项目配置
├── vite.config.dev.ts               # 开发环境配置
├── vite.config.build.ts             # 构建环境配置
├── farris.config.mjs                # Farris CLI配置
└── tsconfig.json                     # TypeScript配置
```

## Designer 技术实现原理

### 技术栈

- **框架**: Vue 3.2+ (Composition API)
- **构建工具**: Vite 4.4+
- **语言**: TypeScript 4.6+
- **UI框架**: @farris/ui-vue, @farris/mobile-ui-vue
- **代码编辑器**: Monaco Editor
- **状态管理**: Vue 3 Composition API (provide/inject)
- **拖拽库**: @farris/designer-dragula
- **工具库**: lodash-es, rxjs

### 核心架构

#### 1. 组件化设计

Designer 采用组件化架构，主要包含以下核心组件：

- **FDesigner**: 设计器主组件，负责整体布局和组件协调
- **FFormDesigner**: 表单设计器，提供拖拽式表单构建功能
- **FViewModelDesigner**: 视图模型设计器，管理表单的变量和方法
- **FCodeViewDesign**: 代码视图组件，提供代码编辑功能
- **FPreview**: 预览组件，用于实时预览设计效果

#### 2. 组合式函数（Composition API）

核心业务逻辑通过组合式函数实现，主要服务包括：

- **useFormSchema**: 表单Schema管理服务，维护表单的DOM结构和元数据
- **schemaService**: Schema操作服务，提供Schema的增删改查功能
- **formCommandService**: 命令服务，实现撤销/重做等操作
- **useFormMetadataService**: 表单元数据服务，处理与后端的元数据交互
- **designViewModelService**: 设计视图模型服务，管理设计时的ViewModel
- **commandBuilderService**: 命令构建服务，构建表单命令结构

#### 3. 设计器上下文（Designer Context）

通过上下文模式支持不同的设计器模式：

- **PC模式**: 标准PC端表单设计器
- **Mobile模式**: 移动端表单设计器
- **PC_RTC模式**: PC端运行时定制设计器

每种模式都有对应的上下文实现，提供不同的工具箱、控件创建器和命令构建逻辑。

#### 4. Schema管理

Designer 使用 Schema 来描述表单结构：

- **FormMetadaDataDom**: 表单元数据的DOM结构
- **FormSchema**: 表单Schema结构
- **FormComponent**: 表单组件定义
- **FormViewModel**: 表单视图模型

Schema 通过 `componentDomMap` 进行内存管理，支持快速查找和操作。

#### 5. 命令模式

采用命令模式实现操作的可撤销/重做：

- 所有设计操作都封装为命令对象
- 命令通过 `useFormStateMachine` 进行状态管理
- 支持命令的序列化和反序列化

#### 6. 事件系统

- 使用 RxJS 实现事件总线
- 支持设计器与代码视图之间的通信
- 通过 `eventBusId` 进行事件隔离

### 数据流

```
用户操作
  ↓
组件事件
  ↓
命令服务 (formCommandService)
  ↓
Schema服务 (schemaService)
  ↓
FormSchema更新
  ↓
视图更新
```

## 编译运行

### 开发环境编译

执行类型检查（不生成文件）：

```bash
pnpm build
```

该命令会执行 `vue-tsc --noEmit` 进行类型检查，然后使用 Vite 进行构建。

### 生产环境构建

构建 SystemJS 格式的模块（用于 inBuilder 集成）：

```bash
pnpm build:system
```

该命令使用 `farris-cli` 进行构建，输出 SystemJS 格式的模块文件。

### 构建输出

构建完成后，文件将输出到 `dist` 目录：

```
dist/
├── assets/              # 资源文件
│   ├── [name].js        # JavaScript文件
│   └── [name].[ext]     # 其他资源文件（CSS、图片等）
└── index.html           # 入口HTML文件（如果存在）
```

## 部署到 inBuilder 运行环境

### 部署步骤

1. **构建项目**

   在 `packages/designer` 目录下执行构建命令：

   ```bash
   pnpm build:system
   ```

2. **复制构建文件**

   将构建后的 `dist` 目录下的所有文件复制到 inBuilder 运行环境的以下目录：

   ```
   /web/platform/common/web/farris-designer/
   ```

   例如，如果 inBuilder 运行在 `D:\inBuilder\web\platform\common\web\` 目录下，则应该复制到：

   ```
   D:\inBuilder\web\platform\common\web\farris-designer\
   ```

3. **验证部署**

   启动 inBuilder 服务，访问包含设计器的页面，检查设计器是否正常加载和运行。

### 注意事项

- 确保 inBuilder 运行环境已正确配置
- 部署前建议备份原有的 `farris-designer` 目录
- 如果遇到资源加载问题，检查路径配置是否正确
- 确保 inBuilder 中引用的设计器路径与部署路径一致

### 运行时效果查看

部署完成后，可以通过以下方式查看运行时效果：

1. 启动 inBuilder 服务
2. 访问包含表单设计器的页面
3. 在设计器中可以：
   - 拖拽控件构建表单
   - 编辑控件属性
   - 管理视图模型（变量和方法）
   - 切换到代码视图进行代码编辑
   - 预览表单效果

## 开发建议

### 代码规范

- 使用 TypeScript 进行类型约束
- 遵循 Vue 3 Composition API 最佳实践
- 组件命名采用 PascalCase
- 组合式函数命名采用 camelCase，以 `use` 开头

### 调试技巧

- 使用 Vue DevTools 进行组件调试
- 在浏览器控制台查看 Schema 结构
- 使用 `console.log` 输出关键数据（生产环境会自动移除）

### 扩展开发

- 新增控件：在 `components/components/form-designer` 中添加控件定义
- 新增命令：在 `composition/command` 中添加命令类型
- 自定义设计器模式：实现新的 `UseDesignerContext` 接口

## 相关文档

- [Vue 3 官方文档](https://vuejs.org/)
- [Vite 官方文档](https://vitejs.dev/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)
- [Monaco Editor 文档](https://microsoft.github.io/monaco-editor/)


# AI 代码补全功能集成说明

## 概述

本目录包含将 VSCode 扩展中的 AI 代码补全功能集成到 Monaco Editor 的适配层和核心逻辑。

## 目录结构

```
ai-completion/
├── adapter/              # 适配层：Monaco API ↔ VSCode API 转换
│   ├── monaco-document-adapter.ts
│   ├── monaco-position-adapter.ts
│   ├── monaco-cancellation-token-adapter.ts
│   └── monaco-completion-provider.ts
├── core/                 # 核心逻辑（从 VSCode 扩展复制并修改）
│   ├── PredictCacheManager.ts
│   ├── PredictContext.ts
│   ├── PredictResultHolder.ts
│   ├── PredictCache.ts
│   └── CodeStore.ts
├── config/               # 配置管理
│   └── completion-config.ts
└── README.md
```

## 使用方式

### 1. 在 CodeEditor 组件中启用

```tsx
<FCodeEditor
  :modelValue="code"
  :language="'typescript'"
  :aiCompletion="{
    enabled: true,
    endpoint: 'https://api.example.com',
    auth: {
      token: 'your-token',
      uuid: 'user-uuid',
      machineId: 'machine-id'
    },
    projectRoot: '/path/to/project'
  }"
/>
```

### 2. 在代码中动态启用

```typescript
import { CompletionConfigManager } from './composition/ai-completion/config/completion-config';

const config = CompletionConfigManager.create({
  endpoint: 'https://api.example.com',
  enabled: true,
  // ... 其他配置
});

await editor.enableAICompletion(config);
```

## 实施步骤

### 步骤 1: 复制核心文件

从 VSCode 扩展的 `src/complete/` 目录复制以下文件到 `core/` 目录：

- `PredictCacheManager.ts`
- `PredictContext.ts`
- `PredictResultHolder.ts`
- `PredictCache.ts`
- `CodeStore.ts`
- `FileReference.ts`
- `completeManager.ts`

### 步骤 2: 修改核心文件

主要修改点：

1. **移除 VSCode 依赖**
   - 移除 `import * as vscode from "vscode"`
   - 使用适配后的接口替代 VSCode API

2. **HTTP 请求**
   - 将 `request-promise` 替换为 `axios`
   - 调整请求和响应处理

3. **错误处理**
   - 移除 VSCode 特定的消息提示
   - 使用回调或事件系统

### 步骤 3: 创建适配层

按照 `adapter/` 目录中的示例创建适配器。

### 步骤 4: 集成到 Editor

在 `CodeEditor` 类中添加补全功能支持（参考 `INTEGRATION_PLAN.md`）。

## API 差异说明

### 位置索引

- **Monaco**: `lineNumber` 和 `column` 从 1 开始
- **VSCode**: `line` 和 `character` 从 0 开始

使用 `MonacoPositionAdapter` 进行转换。

### 文档接口

- **Monaco**: `ITextModel` 接口
- **VSCode**: `TextDocument` 接口

使用 `MonacoDocumentAdapter` 进行适配。

### 取消令牌

- **Monaco**: `CancellationToken` 接口
- **VSCode**: `CancellationToken` 接口（略有不同）

使用 `MonacoCancellationTokenAdapter` 进行适配。

## 注意事项

1. **性能**: 确保补全请求有适当的防抖处理
2. **取消**: 及时取消过期的请求，避免资源浪费
3. **错误处理**: 优雅处理网络错误和认证错误
4. **缓存**: 利用本地缓存减少网络请求

## 测试

参考 `INTEGRATION_PLAN.md` 中的测试策略进行测试。

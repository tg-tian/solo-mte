/**
 * AI 补全功能统一导出
 */

// 适配层
export { MonacoDocumentAdapter } from './adapter/monaco-document-adapter';
export { MonacoPositionAdapter } from './adapter/monaco-position-adapter';
export { MonacoCancellationTokenAdapter } from './adapter/monaco-cancellation-token-adapter';
export { MonacoCompletionProvider } from './adapter/monaco-completion-provider';

// 核心逻辑
export { PredictContext } from './core/PredictContext';
export { PredictCacheManager, predictCacheManager } from './core/PredictCacheManager';
export { default as PredictResultHolder, predictResultHolder } from './core/PredictResultHolder';
export type { ResultType, PredictMode } from './core/PredictResultHolder';
export { predictCache } from './core/PredictCache';
export { default as CodeStore } from './core/CodeStore';

// 配置
export { CompletionConfigManager } from './config/completion-config';
export type { CompletionConfig } from './config/completion-config';

// 工具函数
export { reverseString, isCreateAfterEnter, base64Encode, md5Hash } from './core/utils';

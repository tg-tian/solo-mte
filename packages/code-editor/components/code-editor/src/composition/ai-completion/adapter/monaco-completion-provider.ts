/**
 * Monaco Inline Completion Provider 实现
 * 这是连接 Monaco Editor 和 AI 补全核心逻辑的桥梁
 */

// 使用 any 类型避免类型检查错误（Monaco Editor 类型定义可能不完整）
declare const monaco: any;

import { MonacoDocumentAdapter } from './monaco-document-adapter';
import { MonacoPositionAdapter } from './monaco-position-adapter';
import { MonacoCancellationTokenAdapter } from './monaco-cancellation-token-adapter';
import { CompletionConfig } from '../config/completion-config';
import { PredictCacheManager } from '../core/PredictCacheManager';
import { PredictContext } from '../core/PredictContext';
import { predictResultHolder, ResultType } from '../core/PredictResultHolder';

/**
 * Monaco Inline Completion Provider 实现
 */
export class MonacoCompletionProvider {
    private predictCacheManager: PredictCacheManager;
    private config: CompletionConfig;
    private activeRequests: Map<string, { cancel: () => void }> = new Map();
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private pollingTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(config: CompletionConfig) {
        this.config = config;
        this.predictCacheManager = new PredictCacheManager();
        this.predictCacheManager.setConfig(config);
    }

    /**
     * Monaco Inline Completion Provider 的核心方法
     */
    async provideInlineCompletions(
        model: any, // monaco.editor.ITextModel
        position: any, // monaco.Position
        context: any, // monaco.languages.InlineCompletionContext
        token: any // monaco.CancellationToken
    ): Promise<any> {
        // 检查是否启用
        if (!this.config.enabled) {
            return { items: [] };
        }

        // **关键修复**：检查普通代码补全的状态
        // Monaco Editor 的 inline completion 和普通代码补全可以共存：
        // - 普通代码补全显示在下拉菜单中（false, fetch, finally 等）
        // - AI inline completion 显示为光标处的灰色文本（ghost text）
        // 但是，如果用户正在选择普通补全项，我们暂时不显示 inline completion，避免干扰
        // 当普通补全菜单关闭后，inline completion 会自动显示
        if (context?.selectedSuggestionInfo && context?.triggerKind === 1) {
            // triggerKind === 1 表示用户正在主动选择补全项
            return { items: [] };
        }
        
        // 如果普通补全菜单存在但用户没有主动选择，仍然可以显示 inline completion
        // 这样两者可以共存，用户可以看到：
        // 1. 普通补全下拉菜单（false, fetch 等）
        // 2. AI 补全的灰色文本（在光标处）

        // 检查是否支持当前语言
        if (!this.shouldPredict(model)) {
            return { items: [] };
        }

        // 防抖处理
        return new Promise((resolve) => {
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
            }

            this.debounceTimer = setTimeout(async () => {
                try {
                    const result = await this.doProvideCompletions(model, position, context, token);
                    resolve(result);
                } catch (error) {
                    resolve({ items: [] });
                }
            }, this.config.debounceDelay);
        });
    }

    /**
     * 执行实际的补全逻辑
     */
    private async doProvideCompletions(
        model: any,
        position: any,
        context: any,
        token: any
    ): Promise<any> {
        // 创建请求 ID，用于取消管理
        const requestId = `${model.uri.toString()}-${position.lineNumber}-${position.column}-${Date.now()}`;
        
        // 创建适配的取消令牌
        const cancellationToken = new MonacoCancellationTokenAdapter(token);

        // 如果已经取消，直接返回
        if (cancellationToken.isCancellationRequested) {
            return { items: [] };
        }

        // 注册取消回调
        const cancelHandler = () => {
            this.activeRequests.delete(requestId);
        };
        cancellationToken.onCancellationRequested(cancelHandler);

        try {
            // 创建适配的文档和位置
            const documentAdapter = new MonacoDocumentAdapter(model);
            const vscodePosition = MonacoPositionAdapter.toVSCodePosition(position);
            
            // 适配 InlineCompletionContext
            const adaptedContext = this.adaptInlineCompletionContext(context);

            // 创建预测上下文
            const predictContext = new PredictContext(
                documentAdapter,
                vscodePosition,
                adaptedContext,
                cancellationToken,
                this.config.projectRoot,
                this.config.predictMode
            );

            // 再次检查取消
            if (cancellationToken.isCancellationRequested) {
                return { items: [] };
            }

            // 发起预测
            await this.predictCacheManager.startPredict(
                this.config.endpoint,
                predictContext
            );

            // 获取预测结果（支持流式输出）
            // 先快速获取一次结果（如果有中间结果，立即返回）
            let result = await this.predictCacheManager.getPredictResult(this.config.predictMode || 'full');

            // 检查取消和结果有效性
            if (cancellationToken.isCancellationRequested) {
                return { items: [] };
            }

            // 如果没有结果，返回空
            if (!result.text) {
                return { items: [] };
            }

            // 验证位置是否仍然有效（用户可能已经移动了光标）
            if (this.isPositionValid(model, position, result)) {
                // 构建 Monaco Inline Completion Item
                // 直接使用全局 monaco 对象，而不是通过 getMonaco 方法
                const monaco = (window as any).monaco || (globalThis as any).monaco;
                if (!monaco) {
                    return { items: [] };
                }
                
                // 处理 forword 和 backward，构建正确的 range
                let startLine = position.lineNumber;
                let startColumn = position.column;
                let endLine = position.lineNumber;
                let endColumn = position.column;
                
                // 处理 forword（向前替换，负数表示需要替换前面的字符）
                if (result.forword && result.forword < 0) {
                    const currentOffset = model.getOffsetAt(position);
                    const startOffset = Math.max(0, currentOffset + result.forword);
                    const startPos = model.getPositionAt(startOffset);
                    startLine = startPos.lineNumber;
                    startColumn = startPos.column;
                }
                
                // 处理 backward（向后替换，正数表示需要替换后面的字符）
                if (result.backward && result.backward > 0) {
                    const currentOffset = model.getOffsetAt(position);
                    const endOffset = currentOffset + result.backward;
                    const endPos = model.getPositionAt(endOffset);
                    endLine = endPos.lineNumber;
                    endColumn = endPos.column;
                } else {
                    // **关键修复**：如果没有 backward，end 应该等于 start（不替换任何内容）
                    // 这样 insertText 会插入到光标位置，而不是替换现有内容
                    endLine = startLine;
                    endColumn = startColumn;
                }
                
                // 确保所有值都是有效的数字
                startLine = Math.max(1, Math.floor(startLine));
                startColumn = Math.max(1, Math.floor(startColumn));
                endLine = Math.max(1, Math.floor(endLine));
                endColumn = Math.max(1, Math.floor(endColumn));
                
                // 确保 range 的有效性：start 必须在 end 之前或相同
                if (startLine > endLine || (startLine === endLine && startColumn > endColumn)) {
                    // 如果无效，使用当前位置作为 range
                    endLine = startLine;
                    endColumn = startColumn;
                }
                
                // 创建 IRange 对象（普通对象格式）
                // **关键修复**：Monaco Editor 的 inline completion 需要 IRange 格式的普通对象
                // 而不是 Range 实例，这样才能正确工作
                // IRange 接口：{ startLineNumber: number, startColumn: number, endLineNumber: number, endColumn: number }
                const range = {
                    startLineNumber: startLine,
                    startColumn: startColumn,
                    endLineNumber: endLine,
                    endColumn: endColumn
                };
                
                // 验证 range 是否有效
                if (!range || 
                    typeof range.startLineNumber !== 'number' || 
                    typeof range.startColumn !== 'number' ||
                    typeof range.endLineNumber !== 'number' ||
                    typeof range.endColumn !== 'number' ||
                    isNaN(range.startLineNumber) ||
                    isNaN(range.startColumn) ||
                    isNaN(range.endLineNumber) ||
                    isNaN(range.endColumn) ||
                    range.startLineNumber < 1 ||
                    range.startColumn < 1 ||
                    range.endLineNumber < 1 ||
                    range.endColumn < 1) {
                    return { items: [] };
                }
                
                // 验证 insertText 是否有效
                if (!result.text || typeof result.text !== 'string' || result.text.length === 0) {
                    return { items: [] };
                }
                
                // **关键修复**：直接使用 range 和 result.text，创建最简单的 completion item
                // 避免任何中间变量或转换，确保对象结构完全符合 Monaco Editor API
                
                // 最终验证：确保所有必需的值都存在
                if (!result.text || typeof result.text !== 'string' || result.text.length === 0) {
                    return { items: [] };
                }
                
                if (!range || 
                    typeof range.startLineNumber !== 'number' || 
                    typeof range.startColumn !== 'number' ||
                    typeof range.endLineNumber !== 'number' ||
                    typeof range.endColumn !== 'number') {
                    return { items: [] };
                }
                
                // 创建最终的 completion item（最简单的格式）
                // 直接使用原始值，不进行任何转换或包装
                const completionItem = {
                    insertText: result.text,
                    range: {
                        startLineNumber: range.startLineNumber,
                        startColumn: range.startColumn,
                        endLineNumber: range.endLineNumber,
                        endColumn: range.endColumn
                    }
                };
                
                return {
                    items: [completionItem]
                };
            }

            return { items: [] };
        } catch (error) {
            return { items: [] };
        } finally {
            this.activeRequests.delete(requestId);
        }
    }

    /**
     * 检查是否应该进行预测
     */
    private shouldPredict(model: any): boolean {
        const language = model.getLanguageId();
        return this.config.supportedLanguages.includes(language);
    }

    /**
     * 适配 Monaco InlineCompletionContext 到 VSCode 风格
     */
    private adaptInlineCompletionContext(
        context: any
    ): {
        selectedCompletionInfo?: {
            text: string;
            range: {
                start: { line: number; character: number };
                end: { line: number; character: number };
            };
        };
    } {
        // Monaco 的 InlineCompletionContext 可能包含 selectedSuggestionInfo
        if (context?.selectedSuggestionInfo) {
            const suggestionInfo = context.selectedSuggestionInfo;
            // 检查 range 和其 start/end 是否存在
            if (suggestionInfo.range?.start && suggestionInfo.range?.end) {
                try {
                    return {
                        selectedCompletionInfo: {
                            text: suggestionInfo.text || '',
                            range: {
                                start: MonacoPositionAdapter.toVSCodePosition(
                                    suggestionInfo.range.start
                                ),
                                end: MonacoPositionAdapter.toVSCodePosition(
                                    suggestionInfo.range.end
                                )
                            }
                        }
                    };
                } catch (error) {
                    return {};
                }
            }
        }
        return {};
    }

    /**
     * 验证位置是否仍然有效
     */
    private isPositionValid(
        model: any,
        originalPosition: any,
        result: any
    ): boolean {
        // 检查位置是否匹配
        // 这里可以添加更复杂的验证逻辑
        return true;
    }


    /**
     * Monaco Editor 要求的 freeInlineCompletions 方法
     * 用于释放 inline completion 资源
     */
    freeInlineCompletions(items: any[]): void {
        // Monaco Editor 会调用此方法来释放 completion items
        // 这里可以清理相关资源，但通常不需要特殊处理
    }

    /**
     * 清理资源
     */
    dispose(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        
        if (this.pollingTimer) {
            clearTimeout(this.pollingTimer);
            this.pollingTimer = null;
        }
        
        // 取消所有活跃的请求
        this.activeRequests.forEach(({ cancel }) => {
            try {
                cancel();
            } catch (e) {
                // 忽略取消错误
            }
        });
        this.activeRequests.clear();
    }
}

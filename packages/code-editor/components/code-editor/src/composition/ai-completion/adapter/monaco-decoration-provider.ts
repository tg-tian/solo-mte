/**
 * Monaco Editor Decoration-based AI Completion Provider
 * 使用 deltaDecorations API 显示灰色预览文本，替代 inline completion API
 * 这是一个更稳定、更兼容的实现方案
 */

import { CompletionConfig } from '../config/completion-config';
import { PredictCacheManager } from '../core/PredictCacheManager';
import { PredictContext } from '../core/PredictContext';
import { MonacoDocumentAdapter } from './monaco-document-adapter';
import { MonacoPositionAdapter } from './monaco-position-adapter';
import { MonacoCancellationTokenAdapter } from './monaco-cancellation-token-adapter';

/**
 * AI 补全装饰器提供者
 * 使用 Monaco Editor 的 deltaDecorations API 显示灰色预览文本
 */
export class MonacoDecorationProvider {
    private predictCacheManager: PredictCacheManager;
    private config: CompletionConfig;
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private pollingTimer: ReturnType<typeof setTimeout> | null = null;
    private currentDecorationIds: string[] = [];
    private currentSuggestion: string = '';
    private editorInstance: any = null; // Monaco Editor 实例
    private model: any = null; // Monaco Editor Model
    private disposeCallbacks: Array<() => void> = [];
    private isAfterEnter: boolean = false; // **修复**：标记是否是回车后的新行

    constructor(config: CompletionConfig, editorInstance: any, modelPromise: Promise<any>) {
        this.config = config;
        this.editorInstance = editorInstance;
        this.predictCacheManager = new PredictCacheManager();
        this.predictCacheManager.setConfig(config);
        
        // 等待 model 加载完成
        modelPromise.then((model) => {
            this.model = model;
        }).catch(() => {
            // 静默处理错误
        });
        
        // **任务 3**：优化事件监听，确保不影响 IntelliSense
        if (this.editorInstance) {
            const monaco = (window as any).monaco || (globalThis as any).monaco;
            
            // **修复**：监听内容变化，检测回车键，在回车后触发多行预测
            const contentChangeDisposable = this.editorInstance.onDidChangeModelContent((event: any) => {
                // **修复**：检测是否是回车键导致的内容变化
                // 检查变化是否包含换行符
                let hasNewLine = false;
                if (event.changes && event.changes.length > 0) {
                    for (const change of event.changes) {
                        if (change.text && (change.text.includes('\n') || change.text.includes('\r\n'))) {
                            hasNewLine = true;
                            break;
                        }
                    }
                }
                
                // **修复**：如果是回车导致的变化，标记为回车后的新行，并延迟触发预测
                // 确保回车键的默认行为（换行）先完成
                if (hasNewLine) {
                    this.isAfterEnter = true;
                    
                    // **修复**：清除建议
                    this.clearSuggestion();
                    
                    // **修复**：延迟触发预测，确保回车键的默认行为（换行）先完成
                    // 使用较短的延迟，确保换行已经完成，但不会影响用户体验
                    setTimeout(() => {
                        // 再次检查光标位置，确保换行已完成
                        const position = this.editorInstance.getPosition();
                        if (position) {
                            this.doCompletion();
                        }
                    }, 100); // 100ms 延迟，确保换行已完成
                    
                    // 不在这里触发 triggerCompletion，因为已经在 setTimeout 中调用了 doCompletion
                    return;
                }
                
                // **任务 3.1**：只清除 AI 补全建议，不影响 IntelliSense
                // 注意：clearSuggestion() 只清除装饰器，不会影响 suggest widget
                this.clearSuggestion();
                // **关键修复**：内容变化时触发新的补全请求（使用防抖）
                this.triggerCompletion();
            });
            this.disposeCallbacks.push(() => contentChangeDisposable.dispose());
            
            // 监听光标位置变化，触发新的补全请求
            const cursorChangeDisposable = this.editorInstance.onDidChangeCursorPosition(() => {
                // **任务 3.2**：只清除 AI 补全建议，不影响 IntelliSense
                this.clearSuggestion();
                // **关键修复**：光标位置变化时触发新的补全请求
                this.triggerCompletion();
            });
            this.disposeCallbacks.push(() => cursorChangeDisposable.dispose());
            
            // **任务 2**：优化 Tab 键处理，确保不影响 IntelliSense
            if (monaco && this.editorInstance.addCommand) {
                this.editorInstance.addCommand(monaco.KeyCode.Tab, () => {
                    // **任务 2.1**：检查 IntelliSense 下拉框是否已显示
                    // 如果 IntelliSense 下拉框已显示，应该优先使用 IntelliSense 的建议
                    if (this.isIntelliSenseWidgetVisible()) {
                        // IntelliSense 下拉框已显示，不拦截 Tab 键，让 IntelliSense 处理
                        return false;
                    }
                    
                    // **任务 2.2**：只在有 AI 补全建议时才拦截 Tab 键
                    if (this.currentSuggestion) {
                        this.acceptSuggestion();
                        return true; // 阻止默认行为
                    }
                    
                    // 没有 AI 补全建议，也不拦截 Tab 键
                    return false;
                });
            }
        }
    }

    /**
     * 触发补全请求（防抖处理）
     */
    private triggerCompletion(): void {
        // 清除之前的防抖定时器
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        // 防抖：延迟触发，避免频繁请求
        this.debounceTimer = setTimeout(() => {
            this.doCompletion();
        }, this.config.debounceDelay || 300);
    }

    /**
     * 执行补全请求
     */
    private async doCompletion(): Promise<void> {
        try {
            if (!this.editorInstance || !this.model) {
                return;
            }

            const position = this.editorInstance.getPosition();
            if (!position) {
                return;
            }

            const lineNumber = position.lineNumber;
            const column = position.column;

            // 获取当前行内容作为提示
            const lineContent = this.model.getLineContent(lineNumber);
            const prompt = lineContent.substring(0, column - 1);

            // **修复**：如果是回车后的新行，即使当前行为空，也应该触发预测（single_line: false）
            // 这样可以预测多行代码
            if (prompt.trim() === '' && !this.isAfterEnter) {
                this.clearSuggestion();
                return;
            }

            // 创建预测上下文
            const documentAdapter = new MonacoDocumentAdapter(this.model);
            const vscodePosition = MonacoPositionAdapter.toVSCodePosition(position);
            // 创建一个空的取消令牌（如果没有提供 Monaco token）
            const cancellationToken = new MonacoCancellationTokenAdapter(null);

            // **修复**：根据是否是回车后的新行来决定 predictMode
            // 正常输入时：single_line: true (使用 only_single_line 模式)
            // 按回车后：single_line: false (使用 full 模式，可以预测多行)
            let predictMode = this.config.predictMode || 'full';
            if (this.isAfterEnter) {
                // 回车后的新行，使用 full 模式（single_line: false）
                predictMode = 'full';
            } else {
                // 正常输入，使用 only_single_line 模式（single_line: true）
                predictMode = 'only_single_line';
            }

            const predictContext = new PredictContext(
                documentAdapter,
                vscodePosition,
                {},
                cancellationToken,
                this.config.projectRoot,
                predictMode
            );
            
            // **修复**：重置 isAfterEnter 标志，因为已经创建了新的预测上下文
            this.isAfterEnter = false;

            // 发起预测（这会调用 /predict 接口，然后启动 /get_results 轮询）
            await this.predictCacheManager.startPredict(
                this.config.endpoint,
                predictContext
            );

            // 等待一小段时间，确保 getResultsByContinuous 已经开始轮询
            await new Promise(resolve => setTimeout(resolve, 100));

            // 获取预测结果（这会等待 /get_results 轮询返回的结果）
            const result = await this.predictCacheManager.getPredictResult(
                this.config.predictMode || 'full'
            );

            if (result && result.text && result.text.length > 0) {
                this.showSuggestion(result.text, position);
            } else {
                this.clearSuggestion();
            }
        } catch (error) {
            // 静默处理错误
        }
    }

    /**
     * 开始 AI 补全轮询（保留用于初始启动，但主要依赖内容变化触发）
     */
    async startPolling(): Promise<void> {
        if (this.pollingTimer) {
            clearTimeout(this.pollingTimer);
        }

        // 等待 model 加载完成
        if (!this.model) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            if (!this.model) {
                setTimeout(() => this.startPolling(), 500);
                return;
            }
        }

        // 初始触发一次补全（如果编辑器有内容）
        // 注意：主要依赖内容变化事件触发，这里只是初始触发一次
        this.triggerCompletion();
    }

    /**
     * 显示 AI 补全建议（使用装饰器）
     */
    /**
     * **任务 3.3**：检查 IntelliSense 下拉框是否可见
     */
    private isIntelliSenseWidgetVisible(): boolean {
        try {
            const suggestController = this.editorInstance.getContribution('editor.contrib.suggestController');
            if (suggestController && (suggestController as any).widget) {
                const widget = (suggestController as any).widget.value;
                // Monaco Editor 的 suggest widget 状态：0=隐藏, 1=可见, 2=加载中
                return widget && widget.state === 1;
            }
        } catch (error) {
            // 如果获取失败，假设不可见
        }
        return false;
    }

    private showSuggestion(suggestion: string, position: any): void {
        if (!this.editorInstance || !this.model) {
            return;
        }

        // **任务 3.4**：如果 IntelliSense 下拉框已显示，不显示 AI 补全建议，避免冲突
        if (this.isIntelliSenseWidgetVisible()) {
            return;
        }

        // 清除之前的装饰
        this.clearSuggestion();

        const monaco = (window as any).monaco || (globalThis as any).monaco;
        if (!monaco) {
            return;
        }

        const lineNumber = position.lineNumber;
        const column = position.column;

        // **关键修复**：Monaco Editor 不支持 InjectedText 时，需要使用正确的方式
        // 检查 Monaco 版本是否支持 InjectedText
        const supportsInjectedText = monaco.editor && 
            typeof (monaco.editor as any).InjectedTextOptions !== 'undefined';
        
        let decoration: any;
        
        if (supportsInjectedText) {
            // 新版本：使用 after 选项（InjectedTextOptions）
            decoration = {
                range: new monaco.Range(lineNumber, column, lineNumber, column),
                options: {
                    after: {
                        content: suggestion,
                        inlineClassName: 'ai-suggestion-preview',
                        inlineClassNameAffectsLetterSpacing: true
                    },
                    hoverMessage: { value: `AI 补全: ${suggestion.substring(0, 50)}...` },
                    stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                }
            };
        } else {
            // **关键修复**：旧版本 Monaco 不支持 after 选项，需要使用 afterContentClassName
            // afterContentClassName 只是一个 CSS 类名，不能包含建议文本
            // 建议文本需要通过其他方式注入（如直接操作 DOM 或使用 overlayWidget）
            
            // 方案1：使用 afterContentClassName + 直接操作 DOM 注入文本
            decoration = {
                range: new monaco.Range(lineNumber, column, lineNumber, column),
                options: {
                    // afterContentClassName 只设置 CSS 类名
                    afterContentClassName: 'ai-suggestion-preview',
                    hoverMessage: { value: `AI 补全: ${suggestion.substring(0, 50)}...` },
                    stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                }
            };
            
            // 在装饰器应用后，直接操作 DOM 注入文本
            // 延迟执行，确保装饰器已渲染
            setTimeout(() => {
                try {
                    const container = this.editorInstance.getContainerDomNode();
                    const viewLines = container.querySelectorAll('.view-line');
                    const currentLineElement = viewLines[lineNumber - 1] as HTMLElement;
                    
                    if (currentLineElement) {
                        // 查找装饰器创建的 after 元素
                        const afterElements = currentLineElement.querySelectorAll('.ai-suggestion-preview');
                        
                        // 如果找到了装饰器元素，直接设置文本内容
                        if (afterElements.length > 0) {
                            afterElements.forEach((el: any) => {
                                if (el.textContent === '' || !el.textContent) {
                                    el.textContent = suggestion;
                                    el.setAttribute('data-ai-suggestion', suggestion);
                                }
                            });
                        } else {
                            // 如果没有找到，创建一个新的 span 元素
                            const suggestionSpan = document.createElement('span');
                            suggestionSpan.className = 'ai-suggestion-preview';
                            suggestionSpan.textContent = suggestion;
                            suggestionSpan.setAttribute('data-ai-suggestion', suggestion);
                            
                            // 找到光标位置对应的 DOM 节点并插入
                            const lineContent = this.model.getLineContent(lineNumber);
                            const beforeText = lineContent.substring(0, column - 1);
                            
                            // 尝试找到光标位置的文本节点
                            const textNodes = this.getTextNodesInLine(currentLineElement);
                            let inserted = false;
                            
                            for (const node of textNodes) {
                                const nodeText = node.textContent || '';
                                const nodeStart = nodeText.indexOf(beforeText);
                                if (nodeStart !== -1) {
                                    // 找到匹配位置，在之后插入
                                    const range = document.createRange();
                                    range.setStart(node, nodeStart + beforeText.length);
                                    range.setEnd(node, nodeStart + beforeText.length);
                                    range.insertNode(suggestionSpan);
                                    inserted = true;
                                    break;
                                }
                            }
                            
                            if (!inserted) {
                                // 如果找不到精确位置，追加到行末尾
                                currentLineElement.appendChild(suggestionSpan);
                            }
                        }
                    }
                } catch (error) {
                    // 静默处理错误
                }
            }, 50);
        }

        // 应用装饰器
        try {
            this.currentDecorationIds = this.editorInstance.deltaDecorations([], [decoration]);
            this.currentSuggestion = suggestion;
        } catch (error) {
            // 静默处理错误
        }
    }

    /**
     * 获取行中的所有文本节点（辅助方法）
     */
    private getTextNodesInLine(element: HTMLElement): Text[] {
        const textNodes: Text[] = [];
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null
        );
        
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node as Text);
        }
        
        return textNodes;
    }

    /**
     * 清除 AI 补全建议
     */
    private clearSuggestion(): void {
        // 清除装饰器
        if (this.currentDecorationIds.length > 0 && this.editorInstance) {
            this.editorInstance.deltaDecorations(this.currentDecorationIds, []);
            this.currentDecorationIds = [];
        }
        
        // 清除手动插入的 DOM 元素
        if (this.editorInstance) {
            try {
                const container = this.editorInstance.getContainerDomNode();
                const suggestionElements = container.querySelectorAll('.ai-suggestion-preview[data-ai-suggestion]');
                suggestionElements.forEach((el: any) => {
                    if (el.parentNode) {
                        el.parentNode.removeChild(el);
                    }
                });
            } catch (error) {
                // 静默处理错误
            }
        }
        
        this.currentSuggestion = '';
    }

    /**
     * 接受 AI 补全建议
     */
    private acceptSuggestion(): void {
        if (!this.currentSuggestion || !this.editorInstance) {
            return;
        }

        const position = this.editorInstance.getPosition();
        if (!position) {
            return;
        }

        const monaco = (window as any).monaco || (globalThis as any).monaco;
        if (!monaco) {
            return;
        }

        const lineNumber = position.lineNumber;
        const column = position.column;

        // 计算插入文本后的光标位置
        const lines = this.currentSuggestion.split('\n');
        const lastLine = lines[lines.length - 1];
        const newLineNumber = lineNumber + lines.length - 1;
        // **修复**：正确计算新列位置
        // 对于单行：column + lastLine.length（在插入文本的末尾）
        // 对于多行：lastLine.length + 1（新行的第一个字符位置，如果最后一行不为空）
        // 如果最后一行为空，应该是 1（行首）
        const newColumn = lines.length === 1 ? 
            column + lastLine.length : 
            (lastLine.length > 0 ? lastLine.length + 1 : 1);

        // 插入建议文本
        this.editorInstance.executeEdits('ai-suggestion', [{
            range: new monaco.Range(lineNumber, column, lineNumber, column),
            text: this.currentSuggestion
        }]);

        // **修复**：移动光标到插入文本末尾，并确保光标位置可见
        const newPosition = new monaco.Position(newLineNumber, newColumn);
        this.editorInstance.setPosition(newPosition);
        
        // 确保光标位置在视口中可见
        this.editorInstance.revealPositionInCenter(newPosition);

        // 清除建议显示
        this.clearSuggestion();
    }

    /**
     * 停止轮询
     */
    stopPolling(): void {
        if (this.pollingTimer) {
            clearTimeout(this.pollingTimer);
            this.pollingTimer = null;
        }
        this.clearSuggestion();
    }

    /**
     * 清理资源
     */
    dispose(): void {
        this.stopPolling();
        
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }

        // 执行所有清理回调
        this.disposeCallbacks.forEach(callback => {
            try {
                callback();
            } catch (e) {
                // 忽略清理错误
            }
        });
        this.disposeCallbacks = [];
    }
}

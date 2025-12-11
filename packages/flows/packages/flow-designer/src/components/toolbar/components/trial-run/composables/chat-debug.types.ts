// 聊天消息类型定义
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    content2?: MessageContent[];  // 结构化内容，用于流式渲染
    timestamp: number;
    isThinking?: boolean;         // 是否正在思考
    isComplete?: boolean;         // 是否完成
    canShowStopButton?: boolean;  // 是否显示停止按钮
    reqId?: string;              // 请求ID
    qsnId?: string;              // 问题ID
    menuInfo?: MenuInfo;         // 菜单信息
    reasoningContent?: ReasoningContent[];  // 推理内容
    reasoningComplete?: boolean;  // 推理是否完成
    docProgress?: DocumentProgress;  // 文档处理进度
    finishReason?: string;        // 完成原因
    errorInfo?: ErrorInfo;        // 错误信息
}

// 消息内容片段
export interface MessageContent {
    text: string;
    finish: boolean;
    menuQueryParamMap?: Record<string, MenuQueryParams>;  // 菜单查询参数映射
    contentType?: 'text' | 'markdown' | 'tool_call' | 'iframe' | 'image' | 'document';
}

// 推理内容
export interface ReasoningContent {
    text: string;
    finish: boolean;
}

// 文档处理进度
export interface DocumentProgress {
    processName: string;
    status: 'processing' | 'completed' | 'error';
    associatedContent?: AssociatedContent[];
}

// 关联内容
export interface AssociatedContent {
    type: 'document' | 'image' | 'link';
    content: {
        contentName: string;
        contentUrl: string;
        metadata?: any;
    };
}

// 菜单信息
export interface MenuInfo {
    menuId: string;
    dataId: string;
    action: string;
}

// 菜单查询参数
export interface MenuQueryParams {
    funcId: string;
    queryStringParams: Map<string, any>;
}

// 错误信息
export interface ErrorInfo {
    code?: number;
    message: string;
    type?: 'network' | 'api' | 'parsing' | 'unknown';
}

// 工具调用结果
export interface ToolCallResult {
    toolName: string;
    status: 'success' | 'error' | 'processing';
    result?: any;
    error?: string;
    menuType?: 'card' | 'list' | 'form' | 'custom';
    fields?: ToolCallField[];
    url?: string;
}

// 工具调用字段
export interface ToolCallField {
    name: string;
    value: any;
    type: 'text' | 'number' | 'date' | 'link' | 'image' | 'textarea';
    label?: string;
}

// SSE事件数据
export interface SSEEventData {
    request_id: string;
    questionId?: string;
    output: {
        content: string;
        finish_reason: string;
        reasoningContent?: any;
        text?: string;  // 工具调用时的文本数据
    };
    properties?: Array<{
        progress?: DocumentProgress;
    }>;
}

// 聊天配置
export interface ChatConfig {
    enableMarkdown?: boolean;
    enableToolCalls?: boolean;
    enableReasoning?: boolean;
    enableDocumentLinks?: boolean;
    enableCopy?: boolean;
    enableScroll?: boolean;
    maxMessageLength?: number;
    typingSpeed?: number;  // 打字机效果速度（毫秒）
}
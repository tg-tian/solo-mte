import type {
  ChatMessage,
  MessageContent,
  SSEEventData,
  ToolCallResult,
  ReasoningContent,
  ErrorInfo,
} from './chat-debug.types';

/**
 * SSE 数据处理器
 * 负责解析 SSE 事件数据并转换为 ChatMessage 格式
 */
export class SSEDataProcessor {
  private messageMap = new Map<string, ChatMessage>();
  private messageIdCounter = 0;

  /**
   * 处理 SSE 事件数据
   */
  processSSEEvent(event: MessageEvent): ChatMessage | null {
    try {
      let data = event.data;

      // 如果数据为空或是无效值，跳过处理
      if (!data || data.trim() === '' || data === 'null' || data === 'undefined') {
        return null;
      }

      // 尝试解析JSON数据
      let eventData: SSEEventData;
      try {
        eventData = JSON.parse(data);
      } catch (parseError) {
        // 如果JSON解析失败，检查是否是带前缀的数据
        const cleanData = this.extractJsonFromData(data);
        if (cleanData) {
          eventData = JSON.parse(cleanData);
        } else {
          // 如果无法解析为JSON，跳过这个事件
          console.warn('Unable to parse SSE data as JSON:', data);
          return null;
        }
      }

      const { request_id, questionId, output, properties } = eventData;

      if (!request_id) {
        console.warn('Missing request_id in SSE event:', eventData);
        return null;
      }

      // 查找或创建消息
      let message = this.messageMap.get(request_id);

      if (!message) {
        message = this.createNewMessage(eventData);
        this.messageMap.set(request_id, message);
      }

      // 更新消息内容
      this.updateMessage(message, eventData);

      return message;
    } catch (error) {
      console.error('SSE event processing error:', error);

      // 返回错误消息
      return this.createErrorMessage(error);
    }
  }

  /**
   * 从可能包含前缀的数据中提取JSON部分
   */
  private extractJsonFromData(data: string): string | null {
    // 移除常见的前缀，如 "1 result ", "data: " 等
    const patterns = [
      /^\d+\s+result\s+/,      // "1 result "
      /^data:\s*/,             // "data: "
      /^\w+\s*/,               // 单词前缀
    ];

    let cleanData = data.trim();

    for (const pattern of patterns) {
      cleanData = cleanData.replace(pattern, '');
    }

    // 尝试找到JSON的开始和结束
    const jsonStart = cleanData.indexOf('{');
    const jsonEnd = cleanData.lastIndexOf('}');

    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      return cleanData.substring(jsonStart, jsonEnd + 1);
    }

    return null;
  }

  /**
   * 创建新消息
   */
  private createNewMessage(eventData: SSEEventData): ChatMessage {
    const messageId = this.generateMessageId();
    const { request_id, questionId, output, properties } = eventData;

    const message: ChatMessage = {
      id: messageId,
      role: 'assistant',
      content: output?.text || output?.content || '',
      content2: [],
      timestamp: Date.now(),
      isThinking: false,
      isComplete: false,
      canShowStopButton: true,
      reqId: request_id,
      qsnId: questionId,
      reasoningContent: [],
      reasoningComplete: false,
      docProgress: properties?.[0]?.progress,
      finishReason: output?.finish_reason
    };

    // 初始化内容片段
    const textContent = output?.text || output?.content;
    if (textContent) {
      const contentSegment = this.createContentSegment({ ...output, content: textContent });
      message.content2 = [contentSegment];
    }

    return message;
  }

  /**
   * 更新消息内容
   */
  private updateMessage(message: ChatMessage, eventData: SSEEventData): void {
    const { output, properties } = eventData;

    if (!output) return;

    // 更新完成状态
    const isComplete = output.finish_reason === 'stop';
    const hasContent = !!(output?.text || output?.content);
    message.isComplete = isComplete;
    message.canShowStopButton = !isComplete;
    message.isThinking = !isComplete && !hasContent;

    // 更新推理内容
    if (output.reasoningContent) {
      const reasoningSegment: ReasoningContent = {
        text: output.reasoningContent,
        finish: !!output.content
      };
      message.reasoningContent = [...(message.reasoningContent || []), reasoningSegment];
      message.reasoningComplete = !output.reasoningContent && output.content ? true : false;
    }

    // 更新文档进度
    if (properties?.[0]?.progress && !message.docProgress) {
      message.docProgress = properties[0].progress;
    }

    // 更新主要内容
    const textContent = output?.text || output?.content;
    if (textContent) {
      message.content += textContent;

      // 更新结构化内容
      const contentSegment = this.createContentSegment({ ...output, content: textContent });

      if (message.content2 && message.content2.length > 0) {
        // 更新最后一个内容片段
        const lastSegment = message.content2[message.content2.length - 1];
        lastSegment.text += textContent;
        lastSegment.finish = isComplete;
      } else {
        message.content2 = [contentSegment];
      }
    }

    // 更新工具调用结果
    if (output.finish_reason === 'tool_calls' && output.text) {
      this.processToolCallResult(message, output.text);
    }

    // 更新完成原因
    message.finishReason = output.finish_reason;
  }

  /**
   * 创建内容片段
   */
  private createContentSegment(output: any): MessageContent {
    let contentType: MessageContent['contentType'] = 'text';
    let text = output.content;

    // 检测内容类型
    if (output.finish_reason === 'tool_calls') {
      contentType = 'tool_call';
    } else if (this.isMarkdownContent(text)) {
      contentType = 'markdown';
    } else if (this.isImageContent(text)) {
      contentType = 'image';
    } else if (this.isIframeContent(text)) {
      contentType = 'iframe';
    }

    return {
      text: text || '',
      finish: output.finish_reason === 'stop',
      contentType
    };
  }

  /**
   * 处理工具调用结果
   */
  private processToolCallResult(message: ChatMessage, toolCallText: string): void {
    try {
      const toolData: ToolCallResult = JSON.parse(toolCallText);

      // 创建工具调用内容片段
      const toolSegment: MessageContent = {
        text: toolCallText,
        finish: true,
        contentType: 'tool_call'
      };

      message.content2 = [...(message.content2 || []), toolSegment];
    } catch (error) {
      console.error('Tool call result parsing error:', error);
    }
  }

  /**
   * 检测是否为 Markdown 内容
   */
  private isMarkdownContent(text: string): boolean {
    const markdownPatterns = [
      /^#{1,6}\s+/,                      // 标题
      /^\*{1,2}[^*]+\*{1,2}/,             // 粗体/斜体
      /^\[([^\]]+)\]\(([^)]+)\)/,         // 链接
      /^[-*+]\s+/,                        // 无序列表
      /^\d+\.\s+/,                        // 有序列表
      /^```/,                             // 代码块
      /^`[^`]+`/,                         // 行内代码
      /^\|.*\|/,                          // 表格
      /^>\s/                              // 引用
    ];

    return markdownPatterns.some(pattern => pattern.test(text));
  }

  /**
   * 检测是否为图片内容
   */
  private isImageContent(text: string): boolean {
    return text.startsWith('data:image/') ||
           /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(text);
  }

  /**
   * 检测是否为 iframe 内容
   */
  private isIframeContent(text: string): boolean {
    return text.includes('<iframe') || text.startsWith('http');
  }

  /**
   * 创建错误消息
   */
  private createErrorMessage(error: any): ChatMessage {
    const errorInfo: ErrorInfo = {
      message: error.message || '处理响应数据时发生错误',
      type: 'parsing'
    };

    return {
      id: this.generateMessageId(),
      role: 'assistant',
      content: errorInfo.message,
      content2: [{
        text: errorInfo.message,
        finish: true,
        contentType: 'text'
      }],
      timestamp: Date.now(),
      isThinking: false,
      isComplete: true,
      canShowStopButton: false,
      errorInfo
    };
  }

  /**
   * 生成消息ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${this.messageIdCounter++}`;
  }

  /**
   * 获取所有消息
   */
  getAllMessages(): ChatMessage[] {
    return Array.from(this.messageMap.values());
  }

  /**
   * 清理完成的旧消息
   */
  cleanupCompletedMessages(maxAge: number = 5 * 60 * 1000): void { // 默认5分钟
    const now = Date.now();
    for (const [key, message] of this.messageMap.entries()) {
      if (message.isComplete && (now - message.timestamp) > maxAge) {
        this.messageMap.delete(key);
      }
    }
  }

  /**
   * 获取特定请求ID的消息
   */
  getMessage(requestId: string): ChatMessage | undefined {
    return this.messageMap.get(requestId);
  }

  /**
   * 重置处理器
   */
  reset(): void {
    this.messageMap.clear();
    this.messageIdCounter = 0;
  }
}

/**
 * SSE 数据处理工具函数
 */
export class SSEDataUtils {
  /**
   * 解析流式响应数据
   */
  static parseStreamData(data: string): SSEEventData[] {
    const events: SSEEventData[] = [];
    const lines = data.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const jsonData = line.slice(6);
          if (jsonData.trim() === '[DONE]') continue;

          const eventData: SSEEventData = JSON.parse(jsonData);
          events.push(eventData);
        } catch (error) {
          console.error('Stream data parsing error:', error, line);
        }
      }
    }

    return events;
  }

  /**
   * 检测内容类型
   */
  static detectContentType(content: string): MessageContent['contentType'] {
    if (content.startsWith('{') && content.includes('menuType')) {
      return 'tool_call';
    }
    if (content.startsWith('data:image/')) {
      return 'image';
    }
    if (content.includes('<iframe')) {
      return 'iframe';
    }
    if (SSEDataUtils.isMarkdownContent(content)) {
      return 'markdown';
    }
    return 'text';
  }

  /**
   * 检测 Markdown 内容
   */
  static isMarkdownContent(text: string): boolean {
    const markdownPatterns = [
      /^#{1,6}\s+/,
      /^\*{1,2}[^*]+\*{1,2}/,
      /^\[([^\]]+)\]\(([^)]+)\)/,
      /^[-*+]\s+/,
      /^\d+\.\s+/,
      /^```/,
      /^`[^`]+`/,
      /^\|.*\|/,
      /^>\s/
    ];

    return markdownPatterns.some(pattern => pattern.test(text));
  }

  /**
   * 格式化文件大小
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 生成唯一ID
   */
  static generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 安全解析 JSON
   */
  static safeParseJSON<T = any>(text: string, defaultValue: T = null as T): T {
    try {
      return JSON.parse(text);
    } catch {
      return defaultValue;
    }
  }
}
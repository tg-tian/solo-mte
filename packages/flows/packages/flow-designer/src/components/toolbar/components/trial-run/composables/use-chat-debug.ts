import { reactive } from 'vue';
import { useNotify } from '@farris/flow-devkit';
import type { ChatMessage } from './chat-debug.types';

interface ChatDebugState {
  messages: ChatMessage[];
  isLoading: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  settings: {
    showReasoning: boolean;
    showDocProgress: boolean;
    timeout: number;
    temperature: number;
    maxTokens: number;
  };
}

export function useChatDebug() {
  const notifyService = useNotify();

  // 状态管理
  const state = reactive<ChatDebugState>({
    messages: [],
    isLoading: false,
    connectionStatus: 'disconnected',
    settings: {
      showReasoning: true,
      showDocProgress: true,
      timeout: 30,
      temperature: 0.7,
      maxTokens: 2000
    }
  });

  // SSE连接相关
  let eventSource: EventSource | null = null;
  let currentMessageId: string | null = null;

  // 生成消息ID
  function generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 添加用户消息
  function addUserMessage(content: string): ChatMessage {
    const message: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content,
      // @ts-ignore
      timestamp: new Date()
    };
    state.messages.push(message);
    return message;
  }

  // 添加AI助手消息
  function addAssistantMessage(): ChatMessage {
    const message: ChatMessage = {
      id: generateMessageId(),
      role: 'assistant',
      content: '',
      // @ts-ignore
      timestamp: new Date(),
      isThinking: true
    };
    state.messages.push(message);
    currentMessageId = message.id;
    return message;
  }

  // 更新消息内容
  function updateMessage(messageId: string, updates: Partial<ChatMessage>) {
    const message = state.messages.find(msg => msg.id === messageId);
    if (message) {
      Object.assign(message, updates);
    }
  }

  // 获取当前消息
  function getCurrentMessage(): ChatMessage | undefined {
    if (!currentMessageId) return undefined;
    return state.messages.find(msg => msg.id === currentMessageId);
  }

  // 构建对话历史
  function buildConversationHistory(): any[] {
    return state.messages
      .filter(msg => msg.content.trim())
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));
  }

  // 连接SSE
  function connectSSE(conversationId: string, message: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        state.connectionStatus = 'connecting';

        // 构建请求数据
        const requestData = {
          conversationId,
          message,
          history: buildConversationHistory(),
          settings: state.settings,
          timestamp: new Date().toISOString()
        };

        // 构建SSE URL
        const sseUrl = `/api/ai/chatflow/v1.0/debug/stream?${new URLSearchParams({
          data: btoa(JSON.stringify(requestData))
        })}`;

        // 创建EventSource连接
        eventSource = new EventSource(sseUrl);

        // 处理连接打开
        eventSource.onopen = () => {
          console.log('SSE连接已建立');
          state.connectionStatus = 'connected';
          resolve();
        };

        // 处理消息接收
        eventSource.onmessage = (event) => {
          handleSSEMessage(event);
        };

        // 处理错误
        eventSource.onerror = (error) => {
          console.error('SSE连接错误:', error);
          state.connectionStatus = 'error';
          handleConnectionError();
          reject(new Error('SSE连接失败'));
        };

        // 设置超时
        const timeoutId = setTimeout(() => {
          if (state.connectionStatus === 'connecting') {
            eventSource?.close();
            state.connectionStatus = 'error';
            reject(new Error('连接超时'));
          }
        }, state.settings.timeout * 1000);

        eventSource.addEventListener('timeout', () => {
          clearTimeout(timeoutId);
          eventSource?.close();
          state.connectionStatus = 'error';
          reject(new Error('响应超时'));
        });

      } catch (error) {
        console.error('创建SSE连接失败:', error);
        state.connectionStatus = 'error';
        reject(error);
      }
    });
  }

  // 处理SSE消息
  function handleSSEMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      const currentMessage = getCurrentMessage();

      if (!currentMessage) return;

      switch (data.type) {
        case 'thinking':
          updateMessage(currentMessage.id, {
            isThinking: true,
            reasoningContent: state.settings.showReasoning ? data.content : undefined
          });
          break;

        case 'doc_progress':
          updateMessage(currentMessage.id, {
            docProgress: state.settings.showDocProgress ? data.content : undefined
          });
          break;

        case 'content':
          // 流式内容更新
          updateMessage(currentMessage.id, {
            isThinking: false,
            content: (currentMessage.content || '') + (data.content || '')
          });
          break;

        case 'complete':
          // 响应完成
          updateMessage(currentMessage.id, {
            isThinking: false,
            content: data.content || currentMessage.content
          });
          finishCurrentMessage();
          break;

        case 'error':
          // 处理错误
          updateMessage(currentMessage.id, {
            isThinking: false,
            content: `错误：${data.message || '未知错误'}`
          });
          finishCurrentMessage();
          notifyService.error(`对话流调试错误：${data.message || '未知错误'}`);
          break;

        default:
          console.log('未知消息类型:', data.type, data);
      }
    } catch (error) {
      console.error('解析SSE消息失败:', error);
      handleConnectionError();
    }
  }

  // 处理连接错误
  function handleConnectionError() {
    const currentMessage = getCurrentMessage();
    if (currentMessage && currentMessage.isThinking) {
      updateMessage(currentMessage.id, {
        isThinking: false,
        content: '连接失败，请检查网络连接后重试。'
      });
    }
    closeConnection();
  }

  // 完成当前消息
  function finishCurrentMessage() {
    state.isLoading = false;
    currentMessageId = null;
    closeConnection();
  }

  // 关闭连接
  function closeConnection() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    state.connectionStatus = 'disconnected';
  }

  // 发送消息
  async function sendMessage(content: string, conversationId?: string) {
    if (!content.trim()) {
      notifyService.warning('请输入消息内容');
      return;
    }

    if (state.isLoading) {
      notifyService.warning('请等待当前消息完成');
      return;
    }

    try {
      state.isLoading = true;

      // 添加用户消息
      addUserMessage(content);

      // 创建AI助手消息占位符
      addAssistantMessage();

      // 生成或使用现有的对话ID
      const convId = conversationId || generateMessageId();

      // 连接SSE并发送消息
      await connectSSE(convId, content);

    } catch (error) {
      console.error('发送消息失败:', error);
      state.isLoading = false;

      const errorMessage = error instanceof Error ? error.message : '发送失败';
      notifyService.error(`发送消息失败：${errorMessage}`);

      // 更新当前消息为错误状态
      const currentMessage = getCurrentMessage();
      if (currentMessage) {
        updateMessage(currentMessage.id, {
          isThinking: false,
          content: `发送失败：${errorMessage}`
        });
      }
    }
  }

  // 重新生成响应
  async function regenerateResponse(messageIndex: number) {
    // 找到对应的用户消息
    const userMessage = state.messages[messageIndex - 1];
    if (!userMessage || userMessage.role !== 'user') {
      notifyService.warning('无法重新生成：找不到对应的用户消息');
      return;
    }

    // 移除当前的AI回复
    state.messages.splice(messageIndex);

    // 重新发送用户消息
    await sendMessage(userMessage.content);
  }

  // 通用复制函数，支持生产环境兼容性
  async function copyToClipboard(text: string): Promise<boolean> {
    // 优先使用现代 Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        console.warn('Clipboard API failed, falling back to legacy method:', error);
      }
    }

    // 降级到传统方法
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (error) {
      console.error('Legacy copy method failed:', error);
      return false;
    }
  }

  // 复制消息内容
  async function copyMessage(messageId: string) {
    const message = state.messages.find(msg => msg.id === messageId);
    if (!message || !message.content) return;

    const success = await copyToClipboard(message.content);
    if (success) {
      notifyService.success('消息已复制到剪贴板');
    } else {
      notifyService.error('复制失败，请手动选择复制');
    }
  }

  // 清空对话历史
  function clearHistory() {
    state.messages = [];
    currentMessageId = null;
    closeConnection();
  }

  // 更新设置
  function updateSettings(newSettings: Partial<ChatDebugState['settings']>) {
    Object.assign(state.settings, newSettings);
  }

  // 导出对话历史
  function exportHistory(): string {
    const history = state.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      // @ts-ignore
      timestamp: msg.timestamp.toISOString()
    }));
    return JSON.stringify(history, null, 2);
  }

  // 清理资源
  function cleanup() {
    closeConnection();
    state.messages = [];
    state.isLoading = false;
    currentMessageId = null;
  }

  return {
    // 状态
    state,
    messages: state.messages,
    isLoading: state.isLoading,
    connectionStatus: state.connectionStatus,
    settings: state.settings,

    // 方法
    sendMessage,
    regenerateResponse,
    copyMessage,
    clearHistory,
    updateSettings,
    exportHistory,
    cleanup
  };
}

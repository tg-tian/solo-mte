<template>
  <div class="chat-debug-container">
    <!-- 对话展示区域 -->
    <div class="chat-display" ref="chatContainer">
      <div v-if="messages.length === 0" class="empty-state">
        <i class="f-icon f-icon-message"></i>
        <p>开始与对话流进行调试交互</p>
      </div>

      <!-- 增强的消息列表 -->
      <div v-for="message in messages" :key="message.id">
        <chat-message
          :message="message"
          :config="chatConfig"
          :show-reasoning="chatConfig.enableReasoning"
          :show-document-progress="chatConfig.enableDocumentLinks"
          @stop-generation="handleStopGeneration"
          @copy="handleCopyMessage"
          @open-menu="handleOpenMenu"
        />
      </div>

      <!-- 当前加载状态 -->
      <div v-if="isLoading" class="loading-container">
        <i class="f-icon f-icon-loading loading-icon"></i>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="input-area">
      <!-- 用户输入字段配置区域 -->
      <div v-if="inputParams && inputParams.length > 0" class="user-input-config">
        <div class="config-header" @click="toggleUserInputSection">
          <i class="f-icon f-icon-saturation config-icon"></i>
          <span class="config-title">对话流入参配置</span>
          <i
            class="f-icon config-toggle-icon"
            :class="showUserInputFields ? 'f-legend-collapse' : 'f-legend-show'"
          ></i>
        </div>
        <div v-show="showUserInputFields" class="config-content">
          <param-list
            :input-params="inputParams"
            @update-param="updateParamValue"
          />
        </div>
      </div>

      <!-- 已上传文件列表 -->
      <div v-if="uploadedFiles.length > 0" class="uploaded-files">
        <div class="files-header">
          <span class="files-title">已上传文件 ({{ uploadedFiles.length }})</span>
          <button class="clear-files-btn" @click="uploadedFiles = []; uploadedFileIds = [];" title="清空所有文件">
            <i class="f-icon f-icon-delete"></i>
          </button>
        </div>
        <div class="files-list">
          <div v-for="file in uploadedFiles" :key="file.id" class="file-item">
            <div class="file-info">
              <i class="f-icon f-icon-attachment file-icon"></i>
              <span class="file-name" :title="file.name">{{ file.name }}</span>
              <span class="file-size">({{ formatFileSize(file.size) }})</span>
            </div>
            <button class="remove-file-btn" @click="removeFile(file.id)" title="删除文件">
              <i class="f-icon f-icon-close"></i>
            </button>
          </div>
        </div>
      </div>

      <div class="input-container">
        <textarea
          ref="messageInput"
          v-model="inputMessage"
          class="message-input"
          placeholder="输入消息... (Shift+Enter换行, Enter发送)"
          rows="1"
          @keydown="handleKeyDown"
          @input="adjustTextareaHeight"
          autocomplete="off"
          spellcheck="false"
        ></textarea>
        <div class="input-actions">
          <!-- 文件上传按钮 -->
          <button class="file-btn" @click="triggerFileUpload" :disabled="isLoading || isUploading" title="上传文件">
            <i class="f-icon f-icon-attachment"></i>
          </button>
          <!-- 发送按钮 -->
          <button
            class="send-btn"
            :disabled="(!inputMessage.trim() && uploadedFiles.length === 0) || isLoading || isUploading"
            @click="sendUserMessage"
            title="发送消息"
          >
            <i class="f-icon f-icon-flip-vertical"></i>
          </button>
        </div>
        <!-- 隐藏的文件输入 -->
        <input
          ref="fileInput"
          type="file"
          style="display: none"
          @change="handleFileUpload"
          multiple
          :accept="getFileAcceptAttribute()"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue';
import { useNotify, type NodeData } from '@farris/flow-devkit';
import ChatMessage from './chat-message/chat-message.component.vue';
import ParamList from './param-list.vue';
import {
  uploadFile,
  isFileTypeAllowed,
  isFileSizeAllowed,
  isFileNameLengthAllowed,
  generateUUID,
  getFileSizeLimitMessage,
  getFileTypeLimitMessage,
  getFileAcceptAttribute
} from './file-upload-utils';
import { useChatflowApi } from './composables/use-chatflow-api';
import { useWorkflowApi } from './composables/use-workflow-api';
import { SSEDataProcessor, SSEDataUtils } from './composables/sse-data-processor';
import type { GspDocMetadata, InputParam} from './types';
import type { ChatMessage as EnhancedChatMessage, ChatConfig } from './composables/chat-debug.types';

// 为了避免类型冲突，创建一个扩展的ChatMessage接口
interface ChatMessage extends EnhancedChatMessage {
  // 可以添加额外的本地属性
}

// 定义组件属性
interface Props {
  inputParams?: InputParam[];
  startNodeData?: NodeData;
}

// 使用属性
const props = withDefaults(defineProps<Props>(), {
  inputParams: () => []
});

const emit = defineEmits<{
  close: [];
}>();

const notifyService = useNotify();

// 初始化对话流API和工作流API
const { callChatflowAPI, stopChatflowAPI } = useChatflowApi();
const { saveWorkflow } = useWorkflowApi();

// 聊天配置
const chatConfig: ChatConfig = {
  enableMarkdown: true,
  enableToolCalls: true,
  enableReasoning: true,
  enableDocumentLinks: true,
  enableCopy: true,
  enableScroll: true,
  maxMessageLength: 50000,
  typingSpeed: 50
};

// SSE 数据处理器
const sseProcessor = new SSEDataProcessor();

// 响应式数据
const messages = ref<ChatMessage[]>([]);
const inputMessage = ref('');
const isLoading = ref(false);
const loadingTimer = ref<number | null>(null);
const isUploading = ref(false); // 控制文件上传状态
const chatContainer = ref<HTMLElement>();
const messageInput = ref<HTMLTextAreaElement>();
const fileInput = ref<HTMLInputElement>();
const uploadedFileIds = ref<string[]>([]); // 保存上传文件的ID
const uploadedFiles = ref<Array<{
  id: string;
  name: string;
  size: number;
  type: string;
}>>([]); // 保存上传文件的详细信息

// 用户输入字段相关状态
const showUserInputFields = ref(true); // 默认展开用户输入字段

// 切换用户输入字段显示状态
function toggleUserInputSection() {
  showUserInputFields.value = !showUserInputFields.value;
}

// 更新输入参数值的函数
function updateParamValue(index: number, value: any) {
  if (props.inputParams && props.inputParams[index]) {
    props.inputParams[index].value = value;
  }
}

// 保存流程
async function saveFlowBeforeChat(assistantMessage: ChatMessage): Promise<boolean> {
  try {
    // 更新助手消息状态为正在保存
    assistantMessage.isThinking = true;
    assistantMessage.content = '正在保存流程...';

    // 调用保存流程API
    const saveSuccess = await saveWorkflow();

    if (!saveSuccess) {
      throw new Error('流程保存失败');
    }

    assistantMessage.content = '';
    return true;
  } catch (error) {
    console.error('保存流程失败:', error);
    throw new Error(error instanceof Error ? error.message : '流程保存失败，无法发送消息');
  }
}

// 处理消息停止生成
function handleStopGeneration() {
  // 停止SSE连接
  stopChatflowAPI();

  // 停止所有打字机效果
  // @ts-ignore
  for (const [messageId, timer] of sseProcessor.getAllMessages()) {
    if (timer) {
      clearTimeout(timer as any);
    }
  }

  // 将所有正在思考的消息的isThinking状态置为false
  messages.value.forEach((message, index) => {
    if (message.isThinking || message.canShowStopButton) {
      // 直接修改消息对象的属性
      message.isThinking = false;
      message.canShowStopButton = false;

      // 如果有content2，确保所有segment都标记为完成
      if (message.content2 && Array.isArray(message.content2)) {
        message.content2.forEach(segment => {
          segment.finish = true;
        });
      }

      // 强制触发响应式更新
      messages.value[index] = { ...message };
    }
  });

  isLoading.value = false;
  notifyService.info('已停止生成回复');

  // 清除超时定时器
  if (loadingTimer.value) {
    clearTimeout(loadingTimer.value);
    loadingTimer.value = null;
  }
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

// 处理消息复制
async function handleCopyMessage(content: string) {
  try {
    const success = await copyToClipboard(content);
    if (success) {
      notifyService.success('已复制到剪贴板');
    } else {
      notifyService.error('复制失败，请手动选择复制');
    }
  } catch (error) {
    console.error('复制失败:', error);
    notifyService.error('复制失败');
  }
}

// 处理菜单打开
function handleOpenMenu(menuInfo: any) {
  // 这里可以实现菜单打开逻辑
  console.log('打开菜单:', menuInfo);
  notifyService.info('菜单功能开发中...');
}

// 处理键盘事件
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    const hasShift = event.shiftKey;

    if (hasShift) {
      // Shift+Enter 换行
      // 不阻止默认行为，允许换行
      return;
    } else {
      // Enter 发送消息
      event.preventDefault();

      // 检查是否允许发送（不在上传或加载中）
      if (!isLoading.value && !isUploading.value) {
        sendUserMessage();
      }
    }
  }
}

// 调整文本框高度
function adjustTextareaHeight() {
  nextTick(() => {
    if (messageInput.value) {
      // 重置高度
      messageInput.value.style.height = 'auto';

      // 计算新高度，但不小于最小高度
      const scrollHeight = messageInput.value.scrollHeight;
      const newHeight = Math.max(scrollHeight, 24); // 最小高度24px
      const maxHeight = 120; // 最大高度120px

      messageInput.value.style.height = Math.min(newHeight, maxHeight) + 'px';
    }
  });
}

// 触发文件上传
function triggerFileUpload() {
  fileInput.value?.click();
}

// 处理文件上传
async function handleFileUpload(event: Event) {
  const files = (event.target as HTMLInputElement).files;
  if (!files || files.length === 0) return;

  // 设置上传状态
  isUploading.value = true;

  try {
    const validFiles: File[] = [];

    // 验证文件类型和大小（与file-upload.vue保持一致）
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // 检查文件名长度
      if (!isFileNameLengthAllowed(file.name)) {
        notifyService.error("文件名长度不能超过100个字符");
        continue;
      }

      // 检查文件类型
      if (!isFileTypeAllowed(file.name)) {
        notifyService.error(`不支持的文件类型: ${file.name}。${getFileTypeLimitMessage()}`);
        continue;
      }

      // 检查文件大小
      if (!isFileSizeAllowed(file.size)) {
        notifyService.error(`文件大小超出限制: ${file.name}。${getFileSizeLimitMessage()}`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // 逐个上传文件
    const newFileIds: string[] = [];
    const docDirectory = "workflow-root";

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      // 获取文件后缀名
      const fileExtension = file.name.includes(".")
        ? file.name.split(".").pop()?.toLowerCase()
        : "unknown";

      const metadata: GspDocMetadata = {
        id: generateUUID(),
        fileName: file.name,
        rootId: docDirectory,
        docType: fileExtension || "unknown",
        docSize: file.size.toString(),
      };

      try {
        const metadataId = await uploadFile(file, metadata);
        newFileIds.push(metadataId);

        // 保存文件详细信息
        uploadedFiles.value.push({
          id: metadataId,
          name: file.name,
          size: file.size,
          type: fileExtension || "unknown"
        });
      } catch (error) {
        console.error("文件上传失败:", error);
        notifyService.error("文件上传失败");
      }
    }

    // 保存文件ID
    uploadedFileIds.value = [...uploadedFileIds.value, ...newFileIds];

    // 不再更新上传消息

  } catch (error) {
    console.error("文件上传失败:", error);
    notifyService.error("文件上传失败");
  } finally {
    // 重置上传状态
    isUploading.value = false;
  }

  // 清空文件输入
  if (fileInput.value) {
    fileInput.value.value = '';
  }
}

// 删除文件
function removeFile(fileId: string) {
  const index = uploadedFiles.value.findIndex(file => file.id === fileId);
  if (index !== -1) {
    uploadedFiles.value.splice(index, 1);
  }

  const idIndex = uploadedFileIds.value.findIndex(id => id === fileId);
  if (idIndex !== -1) {
    uploadedFileIds.value.splice(idIndex, 1);
  }
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// 发送用户消息
function sendUserMessage() {
  const content = inputMessage.value.trim();
  if (!content && uploadedFiles.value.length === 0) return;
  if (isLoading.value || isUploading.value) return;

  // 如果有文本内容，添加用户消息
  if (content) {
    // 添加用户消息
    const userMessage: ChatMessage = {
      id: SSEDataUtils.generateId(),
      role: 'user',
      content,
      timestamp: Date.now(),
      isComplete: true
    };
    messages.value.push(userMessage);
  }

  // 清空输入框
  inputMessage.value = '';
  adjustTextareaHeight();

  // 发送到对话流
  sendToChatFlow(content);
}

// 发送到对话流（调用真实API - SSE流式响应）
async function sendToChatFlow(content: string) {
  isLoading.value = true;
    // 设置超时定时器，10秒后自动停止加载状态
    loadingTimer.value = setTimeout(() => {
      if (isLoading.value) {
        isLoading.value = false;
      }
    }, 10000);

  // 创建AI助手消息占位符
  const assistantMessage: ChatMessage = {
    id: `assistant_${Date.now()}`,
    role: 'assistant',
    content: '',
    content2: undefined,
    timestamp: Date.now(),
    isThinking: true,
    isComplete: false,
    canShowStopButton: true
  };
  messages.value.push(assistantMessage);

  try {
    await saveFlowBeforeChat(assistantMessage);

    // 获取USER_FILES参数值并构建inputs
    let userFilesParam: string[] = [];

    // 从start节点获取USER_FILES参数值
    const startNodeInfo = props.startNodeData;
    if (startNodeInfo?.inputParams) {
      const userFilesParamConfig = startNodeInfo.inputParams.find((param: any) => param.code === 'USER_FILES');
      if (userFilesParamConfig?.value) {
        // 如果USER_FILES有值，使用它；否则使用uploadedFileIds
        if (Array.isArray(userFilesParamConfig.value)) {
          userFilesParam = userFilesParamConfig.value.map((file: any) =>
            file.metadataId
          ).filter(Boolean);
        } else if (typeof userFilesParamConfig.value === 'string') {
          userFilesParam = [userFilesParamConfig.value];
        }
      }
    }

    // 如果start节点没有USER_FILES值，使用上传的文件ID
    if (userFilesParam.length === 0) {
      userFilesParam = uploadedFileIds.value;
    }

    const inputs = props.inputParams
      .reduce((acc: any, param) => {
        if(param.type === 'fileID'){
          acc[param.name] = param.multiple? param.value.map((file: any) => file.metadataId).filter(Boolean) : param.value.metadataId;
        } else {
          acc[param.name] = param.value;
        }
        return acc;
      }, {} as object);

    // 更新状态 - 不设置默认内容，等待SSE数据

    // 第三步：调用对话流API（SSE流式响应）
    let isFirstContent = true;  // 提前声明标志变量

    await callChatflowAPI(
      content,                    // userInput: 用户输入的内容
      userFilesParam,             // userFiles: 从USER_FILES参数或上传文件获取的文件ID数组
      inputs,                     // inputs: 用户输入字段的值
      // onMessage: 接收到文本内容时的回调
      (textContent: string) => {
        if (textContent && textContent.trim()) {
          // 确保textContent是字符串，防止对象混入
          let cleanText = textContent;
          if (typeof textContent !== 'string') {
            cleanText = String(textContent);
          }

  
          // 如果是第一个内容，替换而不是追加
          if (isFirstContent) {
            assistantMessage.content = cleanText;
            // 初始化content2用于Markdown渲染
            assistantMessage.content2 = [{
              text: cleanText,
              finish: false,
              contentType: 'markdown'
            }];
            isFirstContent = false;
          } else {
            assistantMessage.content += cleanText;
            // 更新content2 - 保持finish为false直到完成
            if (assistantMessage.content2 && assistantMessage.content2.length > 0) {
              const lastSegment = assistantMessage.content2[assistantMessage.content2.length - 1];
              lastSegment.text += cleanText;
              lastSegment.finish = false; // 确保在流式更新时finish为false
            }
          }
          assistantMessage.isThinking = false;

          // 强制触发响应式更新
          const messageIndex = messages.value.findIndex(m => m.id === assistantMessage.id);
          if (messageIndex !== -1) {
            // 创建新的消息对象确保响应式更新，包括content2的变化
            const updatedMessage = {
              ...assistantMessage,
              content2: assistantMessage.content2 ? [...assistantMessage.content2] : undefined
            };
            // 保留原有的canShowStopButton状态
            if (assistantMessage.canShowStopButton !== undefined) {
              updatedMessage.canShowStopButton = assistantMessage.canShowStopButton;
            }
            messages.value[messageIndex] = updatedMessage;
          }

          scrollToBottom();
        }
      },
      // onComplete: 当接收到finish_reason为stop时的回调
      () => {
        assistantMessage.isThinking = false;
        assistantMessage.isComplete = true;
        assistantMessage.canShowStopButton = false;

        // 如果消息内容为空，设置默认内容
        if (!assistantMessage.content) {
          assistantMessage.content = '对话流处理完成，但没有返回内容';
          assistantMessage.content2 = [{
            text: '对话流处理完成，但没有返回内容',
            finish: true,
            contentType: 'text'
          }];
        } else if (assistantMessage.content2 && assistantMessage.content2.length > 0) {
          // 标记content2中的内容为完成状态，确保光标消失
          assistantMessage.content2.forEach((segment) => {
            segment.finish = true;
          });
        } else {
          // 如果没有content2，创建一个以确保光标消失
          assistantMessage.content2 = [{
            text: assistantMessage.content || '',
            finish: true,
            contentType: 'text'
          }];
        }

        // 清除超时定时器
        if (loadingTimer.value) {
          clearTimeout(loadingTimer.value);
          loadingTimer.value = null;
        }
        isLoading.value = false;

        // 强制触发响应式更新
        const messageIndex = messages.value.findIndex(m => m.id === assistantMessage.id);
        if (messageIndex !== -1) {
          // 创建新的消息对象以确保响应式更新
          const updatedMessage = {
            ...assistantMessage,
            content2: assistantMessage.content2 ? [...assistantMessage.content2] : undefined
          };
          messages.value[messageIndex] = updatedMessage;
        }

        scrollToBottom();
      },
      // onError: 错误回调
      (error: Error) => {
        // 如果是AbortError（用户主动停止），不显示错误消息
        if (error.message?.includes('BodyStreamBuffer was aborted') || error.name === 'AbortError') {
          // 用户主动停止，静默处理
          assistantMessage.isThinking = false;
          assistantMessage.isComplete = false;
          assistantMessage.canShowStopButton = false;
          isLoading.value = false;

          // 强制触发响应式更新
          const messageIndex = messages.value.findIndex(m => m.id === assistantMessage.id);
          if (messageIndex !== -1) {
            messages.value[messageIndex] = { ...assistantMessage };
          }

          scrollToBottom();
          return;
        }

        assistantMessage.isThinking = false;
        assistantMessage.isComplete = true;
        assistantMessage.canShowStopButton = false;
        assistantMessage.content = `对话流调用失败：${error.message}`;
        assistantMessage.content2 = [{
          text: `对话流调用失败：${error.message}`,
          finish: true,
          contentType: 'text'
        }];

        // 清除超时定时器
        if (loadingTimer.value) {
          clearTimeout(loadingTimer.value);
          loadingTimer.value = null;
        }
        isLoading.value = false;

        // 强制触发响应式更新
        const messageIndex = messages.value.findIndex(m => m.id === assistantMessage.id);
        if (messageIndex !== -1) {
          messages.value[messageIndex] = { ...assistantMessage };
        }

        // 显示错误通知
        notifyService.error(`对话流调用失败：${error.message}`);
        scrollToBottom();
      }
    );

  } catch (error) {
    console.error('对话流调用失败:', error);

    // 如果是AbortError（用户主动停止），不显示错误消息
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    if (errorMessage.includes('BodyStreamBuffer was aborted') || (error instanceof Error && error.name === 'AbortError')) {
      // 用户主动停止，静默处理
      assistantMessage.isThinking = false;
      assistantMessage.canShowStopButton = false;
      isLoading.value = false;

      // 强制触发响应式更新
      const messageIndex = messages.value.findIndex(m => m.id === assistantMessage.id);
      if (messageIndex !== -1) {
        messages.value[messageIndex] = { ...assistantMessage };
      }

      scrollToBottom();
      return;
    }

    // 更新助手消息为错误状态
    assistantMessage.isThinking = false;
    assistantMessage.isComplete = true;
    assistantMessage.canShowStopButton = false;
    assistantMessage.content = `对话流调用失败：${errorMessage}`;
    assistantMessage.content2 = [{
      text: `对话流调用失败：${errorMessage}`,
      finish: true,
      contentType: 'text'
    }];

    // 显示错误通知
    notifyService.error(`对话流调用失败：${errorMessage}`);

    // 清除超时定时器
    if (loadingTimer.value) {
      clearTimeout(loadingTimer.value);
      loadingTimer.value = null;
    }
    isLoading.value = false;

    // 强制触发响应式更新
    const messageIndex = messages.value.findIndex(m => m.id === assistantMessage.id);
    if (messageIndex !== -1) {
      messages.value[messageIndex] = { ...assistantMessage };
    }
  }
}

// 滚动到底部
function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
}

// 平滑滚动到底部
function smoothScrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTo({
        top: chatContainer.value.scrollHeight,
        behavior: 'smooth'
      });
    }
  });
}

// 监听消息变化，自动滚动到底部
watch(messages, () => {
  scrollToBottom();
}, { deep: true });

// 组件挂载
onMounted(() => {
  nextTick(() => {
    messageInput.value?.focus();
  });
});
</script>

<style lang="scss" scoped>
.chat-debug-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
  position: relative;
  overflow: hidden;

  .chat-display {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    padding-bottom: 16px;
    display: flex;
    flex-direction: column;
    min-height: 200px; // 确保至少有一些对话空间

    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      color: #999;
      min-height: 200px; // 确保有足够的高度

      i {
        font-size: 48px;
        margin-bottom: 16px;
        color: #ddd;
      }

      p {
        font-size: 14px;
        margin: 0;
      }
    }

    .message {
      display: flex;
      margin-bottom: 16px;
      max-width: 100%;

      &.user {
        justify-content: flex-end;

        .message-content {
          background: #5b89fe;
          color: white;
          border-radius: 12px 12px 4px 12px;
        }

        .message-time {
          text-align: right;
          color: #999;
        }
      }

      &.assistant {
        justify-content: flex-start;

        .message-content {
          background: white;
          border: 1px solid #e8e8e8;
          border-radius: 12px 12px 12px 4px;
          color: #333;
        }

        .message-time {
          text-align: left;
          color: #999;
        }
      }

      .message-content {
        max-width: 70%;
        padding: 12px 16px;
        position: relative;

        .user-message,
        .response {
          word-wrap: break-word;
          line-height: 1.5;
        }

        .loading-container {
          display: flex;
          justify-content: center;
          padding: 16px;
          color: #666;

          .loading-icon {
            font-size: 20px;
            animation: spin 1s linear infinite;
          }
        }
      }

      .message-time {
        font-size: 12px;
        margin-top: 4px;
        padding: 0 8px;
      }
    }
  }

  .input-area {
    flex: none;
    background: white;
    border-top: 1px solid #e8e8e8;
    padding: 16px;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1); // 添加顶部阴影
    overflow-y: auto;
    max-height: 50vh; // 最大高度为视口高度的50%
    display: flex;
    flex-direction: column;

    .user-input-config {
      margin-bottom: 12px;
      background: white;
      border: 1px solid #e8e8e8;
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      flex: 1;

      .config-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        background: #f8f9fa;
        border-bottom: 1px solid #e8e8e8;
        cursor: pointer;
        transition: background-color 0.2s ease;

        &:hover {
          background: #e8f4ff;
        }

        .config-icon {
          font-size: 14px;
          color: #5b89fe;
        }

        .config-title {
          flex: 1;
          font-size: 13px;
          font-weight: 500;
          color: #333;
        }

        .config-toggle-icon {
          font-size: 12px;
          color: #666;
          transition: transform 0.3s ease, color 0.2s ease;
          transform-origin: center;

          &:hover {
            color: #5b89fe;
          }
        }
      }

      .config-content {
        padding: 12px;
        background: white;
        overflow-y: auto;
      }
    }

    .uploaded-files {
      margin-bottom: 12px;
      background: white;
      border: 1px solid #e8e8e8;
      border-radius: 8px;
      overflow: hidden;

      .files-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: #f8f9fa;
        border-bottom: 1px solid #e8e8e8;

        .files-title {
          font-size: 12px;
          color: #666;
          font-weight: 500;
        }

        .clear-files-btn {
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s ease;

          &:hover {
            background: #e8e8e8;
            color: #666;
          }

          i {
            font-size: 12px;
          }
        }
      }

      .files-list {
        max-height: 120px;
        overflow-y: auto;

        .file-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          border-bottom: 1px solid #f0f0f0;

          &:last-child {
            border-bottom: none;
          }

          &:hover {
            background: #f8f9fa;
          }

          .file-info {
            display: flex;
            align-items: center;
            flex: 1;
            min-width: 0;

            .file-icon {
              color: #999;
              margin-right: 8px;
              font-size: 14px;
              flex-shrink: 0;
            }

            .file-name {
              font-size: 13px;
              color: #333;
              margin-right: 8px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              flex: 1;
            }

            .file-size {
              font-size: 11px;
              color: #999;
              flex-shrink: 0;
            }
          }

          .remove-file-btn {
            background: none;
            border: none;
            color: #999;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            transition: all 0.2s ease;
            flex-shrink: 0;

            &:hover {
              background: #ff4d4f;
              color: white;
            }

            i {
              font-size: 12px;
            }
          }
        }
      }
    }

    .input-container {
      display: flex;
      align-items: center;
      background: #f8f9fa;
      border: 1px solid #e8e8e8;
      border-radius: 12px;
      padding: 12px;
      transition: border-color 0.2s ease;
      min-height: 48px;

      &:focus-within {
        border-color: #5b89fe;
        background: white;
      }

      .message-input {
        flex: 1;
        border: none;
        outline: none;
        background: transparent;
        resize: none;
        font-size: 14px;
        line-height: 1.5;
        color: #333;
        height: 24px;
        min-height: 24px;
        max-height: 120px;
        font-family: inherit;
        padding: 0;
        margin: 0;
        vertical-align: middle;
        box-sizing: border-box;

        &::placeholder {
          color: #999;
        }

        /* 重置默认样式 */
        &::-webkit-input-placeholder {
          line-height: 1.5;
        }
        &::-moz-placeholder {
          line-height: 1.5;
        }
      }

      .input-actions {
        display: flex;
        gap: 8px;
        margin-left: 8px;
        align-items: center;
        flex-shrink: 0;

        .file-btn,
        .send-btn {
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
          outline: none;

          &:focus {
            outline: none;
            box-shadow: none;
          }

          i {
            font-size: 16px;
          }
        }

        .file-btn {
          background: #f0f0f0;
          color: #666;

          &:hover {
            background: #e0e0e0;
            color: #333;
          }
        }

        .send-btn {
          background: #5b89fe;
          color: white;

          &:hover:not(:disabled) {
            background: #4a7ae8;
            transform: scale(1.05);
          }

          &:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: scale(1);
          }
        }
      }
    }
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
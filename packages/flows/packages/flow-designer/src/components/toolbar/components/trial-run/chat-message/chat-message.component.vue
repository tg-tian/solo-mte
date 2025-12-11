<template>
  <div class="chat-message-wrapper" :class="[`role-${message.role}`, { 'thinking': message.isThinking }]">
    <!-- 消息内容区域 -->
    <div class="message-content">
      <!-- 用户消息 -->
      <div v-if="message.role === 'user'" class="user-message">
        <div class="message-text">{{ message.content }}</div>
        <div class="message-time">{{ formatTime(message.timestamp) }}</div>
      </div>

      <!-- 助手消息 -->
      <div v-else class="assistant-message">
        <!-- 思考状态 -->
        <div v-if="message.isThinking" class="thinking-indicator">
          <div class="thinking-animation">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
          </div>
          <span class="thinking-text">正在思考中...</span>
        </div>

        <!-- 推理过程展示 -->
        <div v-if="showReasoning && message.reasoningContent" class="reasoning-section">
          <div class="reasoning-header" @click="toggleReasoning">
            <i class="icon" :class="message.reasoningComplete ? 'icon-check' : 'icon-loading'"></i>
            <span>{{ message.reasoningComplete ? '推理完成' : '正在推理' }}</span>
            <i class="toggle-icon" :class="{ 'expanded': isReasoningExpanded }">▼</i>
          </div>
          <div v-if="isReasoningExpanded" class="reasoning-content">
            <div v-for="(reason, index) in message.reasoningContent" :key="index" class="reasoning-text">
              <markdown-renderer :content="reason.text" />
            </div>
          </div>
        </div>

        <!-- 文档检索进度 -->
        <div v-if="showDocumentProgress && message.docProgress" class="document-progress">
          <div class="progress-header" @click="toggleDocumentProgress">
            <i class="icon" :class="getDocumentProgressIcon()"></i>
            <span>{{ message.docProgress.processName }}</span>
            <i class="toggle-icon" :class="{ 'expanded': isDocumentProgressExpanded }">▼</i>
          </div>
          <div v-if="isDocumentProgressExpanded && message.docProgress.associatedContent" class="associated-content">
            <div v-for="(doc, index) in message.docProgress.associatedContent" :key="index" class="document-item">
              <a :href="doc.content.contentUrl" target="_blank" class="document-link">
                <i class="icon-document"></i>
                {{ doc.content.contentName }}
              </a>
            </div>
          </div>
        </div>

        <!-- 主要内容 -->
        <div v-if="!message.isThinking" class="main-content">
          <div class="message-wrapper">
            <!-- 结构化内容渲染 -->
            <div v-if="message.content2 && message.content2.length > 0" class="structured-content">
              <div v-for="(content, index) in message.content2" :key="index" class="content-segment">
                <!-- Markdown 内容 -->
                <markdown-renderer
                  v-if="content.contentType === 'markdown' || !content.contentType"
                  :content="content.text"
                  :show-cursor="!content.finish"
                  @copy="handleCopy"
                />

                <!-- 工具调用结果 -->
                <tool-call-renderer
                  v-else-if="content.contentType === 'tool_call'"
                  :content="content.text"
                  :menu-params="content.menuQueryParamMap"
                  @open-menu="handleOpenMenu"
                />

                <!-- iframe 组件 -->
                <iframe-renderer
                  v-else-if="content.contentType === 'iframe'"
                  :content="content.text"
                />

                <!-- 图片内容 -->
                <image-renderer
                  v-else-if="content.contentType === 'image'"
                  :content="content.text"
                />

                <!-- 普通文本 -->
                <text-renderer
                  v-else
                  :content="content.text"
                  :show-cursor="!content.finish"
                />
              </div>
            </div>

            <!-- 简单内容渲染（向后兼容） -->
            <markdown-renderer
              v-else
              :content="message.content"
              @copy="handleCopy"
            />
          </div>

          <!-- 时间戳 -->
          <div class="message-time">{{ formatTime(message.timestamp) }}</div>
        </div>

        <!-- 按钮组 - 放在消息气泡外部右下角 -->
        <div class="message-external-actions">
          <!-- 停止按钮 -->
          <button
            v-if="message.canShowStopButton"
            class="action-btn stop-btn"
            @click="$emit('stop-generation')"
            title="停止生成"
          >
            <i class="f-icon f-icon-stop"></i>
            <span>停止生成</span>
          </button>

          <!-- 复制按钮 -->
          <button
            v-if="config.enableCopy && message.isComplete"
            class="action-btn copy-btn"
            @click="handleCopy(message.content)"
            title="复制"
          >
            <i class="f-icon f-icon-copy"></i>
            <span>复制</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { ChatMessage, ChatConfig } from '../composables/chat-debug.types';
import MarkdownRenderer from './renderers/markdown-renderer.vue';
import ToolCallRenderer from './renderers/tool-call-renderer.vue';
import IframeRenderer from './renderers/iframe-renderer.vue';
import ImageRenderer from './renderers/image-renderer.vue';
import TextRenderer from './renderers/text-renderer.vue';

interface Props {
  message: ChatMessage;
  config?: ChatConfig;
  showReasoning?: boolean;
  showDocumentProgress?: boolean;
}

interface Emits {
  (e: 'stop-generation'): void;
  (e: 'copy', content: string): void;
  (e: 'open-menu', menuInfo: any): void;
}

const props = withDefaults(defineProps<Props>(), {
  config: () => ({
    enableMarkdown: true,
    enableToolCalls: true,
    enableReasoning: true,
    enableDocumentLinks: true,
    enableCopy: true,
    enableScroll: true,
    maxMessageLength: 50000,
    typingSpeed: 50
  }),
  showReasoning: true,
  showDocumentProgress: true
});

const emit = defineEmits<Emits>();

// 展开状态
const isReasoningExpanded = ref(true);
const isDocumentProgressExpanded = ref(true);


// 方法
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function toggleReasoning() {
  isReasoningExpanded.value = !isReasoningExpanded.value;
}

function toggleDocumentProgress() {
  isDocumentProgressExpanded.value = !isDocumentProgressExpanded.value;
}

function getDocumentProgressIcon(): string {
  if (!props.message.docProgress) return '';

  switch (props.message.docProgress.status) {
    case 'completed': return 'icon-check';
    case 'error': return 'icon-error';
    default: return 'icon-loading';
  }
}

function handleCopy(content: string) {
  emit('copy', content);
}

function handleOpenMenu(menuInfo: any) {
  emit('open-menu', menuInfo);
}

</script>

<style scoped>
.chat-message-wrapper {
  display: flex;
  margin-bottom: 32px; /* 增加底部间距为外部按钮留空间 */
  padding: 0 12px;
  position: relative; /* 为外部按钮提供定位上下文 */
}

.chat-message-wrapper.role-user {
  flex-direction: row-reverse;
}

.chat-message-wrapper.role-assistant {
  flex-direction: row;
}

.message-content {
  flex: 1;
  max-width: 85%;
}

.user-message {
  background: #e3f2fd;
  border-radius: 12px 12px 12px 12px;
  padding: 12px;
  margin-left: auto;
  margin-bottom: 8px;
  max-width: fit-content;
  min-width: 60px;
  width: auto;
}

.assistant-message {
  background: #f5f5f5;
  border-radius: 12px 12px 12px 12px;
  padding: 12px;
  margin-bottom: 8px;
  position: relative; /* 为外部按钮提供定位上下文 */
}

.thinking-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
  font-size: 14px;
}

.thinking-animation {
  display: flex;
  gap: 4px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #666;
  animation: thinking 1.4s ease-in-out infinite both;
}

.dot:nth-child(1) { animation-delay: -0.32s; }
.dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes thinking {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.reasoning-section, .document-progress {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 12px;
  background: #fafafa;
}

.reasoning-header, .progress-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.reasoning-header:hover, .progress-header:hover {
  background: #f0f0f0;
}

.icon {
  font-size: 16px;
}

.icon-check { color: #4caf50; }
.icon-loading { color: #ff9800; animation: spin 1s linear infinite; }
.icon-error { color: #f44336; }

.toggle-icon {
  margin-left: auto;
  transition: transform 0.2s;
}

.toggle-icon.expanded {
  transform: rotate(180deg);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.reasoning-content {
  padding: 0 12px 12px;
  border-top: 1px solid #e0e0e0;
}

.associated-content {
  padding: 0 12px 12px;
  border-top: 1px solid #e0e0e0;
}

.document-item {
  margin-bottom: 8px;
}

.document-link {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1976d2;
  text-decoration: none;
  font-size: 14px;
}

.document-link:hover {
  text-decoration: underline;
}

.main-content {
  position: relative;
}

.structured-content {
  line-height: 1.6;
}

.content-segment {
  margin-bottom: 8px;
}

/* 外部按钮组样式 */
.message-external-actions {
  position: absolute;
  right: -8px; /* 稍微偏右，与消息气泡右边缘对齐 */
  bottom: -36px; /* 定位到消息气泡下方，留出适当间距 */
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 10; /* 确保按钮在最上层 */
}

.chat-message-wrapper:hover .message-external-actions {
  opacity: 1;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: white;
  color: #666;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  i {
    font-size: 12px;
  }

  span {
    white-space: nowrap;
  }
}

.action-btn:hover {
  border-color: #1976d2;
  color: #1976d2;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.stop-btn {
  border-color: #ff6b6b;
  color: #ff6b6b;
}

.stop-btn:hover {
  background: #ff6b6b;
  color: white;
  border-color: #ff6b6b;
}

.copy-btn:hover {
  background: #1976d2;
  color: white;
}

.message-time {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
  text-align: right;
}

.role-user .message-time {
  text-align: left;
}
</style>
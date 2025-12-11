<template>
  <div class="tool-call-renderer">
    <div v-if="toolCallData && toolCallData.menuType" class="tool-call-content">
      <!-- 卡片类型 -->
      <div v-if="toolCallData.menuType === 'card'" class="tool-card">
        <div class="card-header">
          <i class="icon-tool"></i>
          <span class="tool-name">{{ toolCallData.toolName || '工具调用结果' }}</span>
          <span :class="['status-badge', toolCallData.status]">
            {{ getStatusText(toolCallData.status) }}
          </span>
        </div>

        <div class="card-content">
          <div v-if="toolCallData.fields" class="field-list">
            <div v-for="(field, index) in toolCallData.fields" :key="index" class="field-item">
              <span class="field-label">{{ field.label || field.name }}:</span>
              <span class="field-value" :class="`field-type-${field.type}`">
                <template v-if="field.type === 'link'">
                  <a :href="field.value" target="_blank">{{ field.value }}</a>
                </template>
                <template v-else-if="field.type === 'image'">
                  <img :src="field.value" :alt="field.name" class="field-image" />
                </template>
                <template v-else>
                  {{ field.value }}
                </template>
              </span>
            </div>
          </div>

          <div v-else-if="toolCallData.result" class="result-content">
            <pre class="result-text">{{ formatResult(toolCallData.result) }}</pre>
          </div>

          <div v-else-if="toolCallData.error" class="error-content">
            <div class="error-message">
              <i class="icon-error"></i>
              {{ toolCallData.error }}
            </div>
          </div>
        </div>

        <div v-if="toolCallData.url" class="card-actions">
          <a :href="toolCallData.url" target="_blank" class="action-btn primary">
            查看详情
            <i class="icon-arrow-right"></i>
          </a>
        </div>
      </div>

      <!-- 列表类型 -->
      <div v-else-if="toolCallData.menuType === 'list'" class="tool-list">
        <div class="list-header">
          <i class="icon-list"></i>
          <span class="tool-name">{{ toolCallData.toolName || '工具调用结果' }}</span>
        </div>

        <div class="list-content">
          <div v-if="Array.isArray(toolCallData.result)" class="result-list">
            <div v-for="(item, index) in toolCallData.result" :key="index" class="list-item">
              <span class="item-index">{{ index + 1 }}.</span>
              <span class="item-content">{{ item }}</span>
            </div>
          </div>
          <div v-else class="result-text">{{ formatResult(toolCallData.result) }}</div>
        </div>
      </div>

      <!-- 表单类型 -->
      <div v-else-if="toolCallData.menuType === 'form'" class="tool-form">
        <div class="form-header">
          <i class="icon-form"></i>
          <span class="tool-name">{{ toolCallData.toolName || '表单数据' }}</span>
        </div>

        <div class="form-content">
          <div v-if="toolCallData.fields" class="form-fields">
            <div v-for="(field, index) in toolCallData.fields" :key="index" class="form-field">
              <label class="field-label">{{ field.label || field.name }}</label>
              <div class="field-value" :class="`field-type-${field.type}`">
                <input v-if="field.type === 'text' || field.type === 'number'"
                       :type="field.type"
                       :value="field.value"
                       readonly />
                <textarea v-else-if="field.type === 'textarea'"
                          :value="field.value"
                          readonly
                          rows="3"></textarea>
                <span v-else>{{ field.value }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- iframe 嵌入 -->
      <div v-else-if="toolCallData.menuType === 'custom' || isIframeContent" class="iframe-container">
        <iframe
          :src="iframeSrc"
          class="tool-iframe"
          frameborder="0"
          @load="handleIframeLoad"
          @error="handleIframeError">
        </iframe>
      </div>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="errorInfo" class="tool-error">
      <div class="error-content">
        <i class="icon-error"></i>
        <span class="error-message">{{ errorInfo.message || '工具调用失败' }}</span>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-else class="tool-loading">
      <div class="loading-spinner">
        <i class="icon-loading"></i>
      </div>
      <span class="loading-text">正在处理工具调用...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import type { ToolCallResult, ErrorInfo } from '../../composables/chat-debug.types';

interface Props {
  content: string;
  menuParams?: Record<string, any>;
}

interface Emits {
  (e: 'open-menu', menuInfo: any): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const toolCallData = ref<ToolCallResult | null>(null);
const errorInfo = ref<ErrorInfo | null>(null);
const isIframeLoaded = ref(false);
const isIframeError = ref(false);

// 计算属性
const isIframeContent = computed(() => {
  return props.content && props.content.includes('<iframe');
});

const iframeSrc = computed(() => {
  if (isIframeContent.value) {
    const match = props.content.match(/src="([^"]+)"/);
    return match ? match[1] : '';
  }
  return '';
});

// 监听内容变化
watch(() => props.content, () => {
  parseContent();
}, { immediate: true });

// 解析内容
function parseContent() {
  try {
    if (!props.content) {
      toolCallData.value = null;
      errorInfo.value = null;
      return;
    }

    // 尝试解析 JSON 内容
    if (props.content.startsWith('{') || props.content.startsWith('[')) {
      const parsed = JSON.parse(props.content);

      // 判断是否为工具调用结果
      if (parsed.toolName || parsed.menuType || parsed.fields) {
        toolCallData.value = parsed;
        errorInfo.value = null;
      } else {
        // 作为普通结果处理
        toolCallData.value = {
          toolName: '工具调用',
          status: 'success',
          result: parsed,
          menuType: 'card'
        };
      }
    } else if (isIframeContent.value) {
      // iframe 内容
      toolCallData.value = {
        toolName: '自定义组件',
        status: 'success',
        menuType: 'custom'
      };
    } else {
      // 普通文本内容
      toolCallData.value = {
        toolName: '工具调用',
        status: 'success',
        result: props.content,
        menuType: 'card'
      };
    }

    errorInfo.value = null;
  } catch (error: any) {
    console.error('Tool call content parsing error:', error);
    toolCallData.value = null;
    errorInfo.value = {
      message: `工具调用结果解析失败: ${error.message}`,
      type: 'parsing'
    };
  }
}

// 获取状态文本
function getStatusText(status: string): string {
  switch (status) {
    case 'success': return '成功';
    case 'error': return '失败';
    case 'processing': return '处理中';
    default: return status;
  }
}

// 格式化结果
function formatResult(result: any): string {
  if (typeof result === 'string') {
    return result;
  }
  return JSON.stringify(result, null, 2);
}

// iframe 事件处理
function handleIframeLoad() {
  isIframeLoaded.value = true;
  isIframeError.value = false;
}

function handleIframeError() {
  isIframeLoaded.value = false;
  isIframeError.value = true;
  errorInfo.value = {
    message: '组件加载失败',
    type: 'network'
  };
}
</script>

<style scoped>
.tool-call-renderer {
  margin: 12px 0;
  border-radius: 8px;
  overflow: hidden;
}

/* 通用卡片样式 */
.tool-card, .tool-list, .tool-form {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
}

.card-header, .list-header, .form-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #e9ecef;
  font-weight: 600;
  color: #333;
}

.icon-tool, .icon-list, .icon-form {
  width: 20px;
  height: 20px;
  background: #007bff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
}

.status-badge {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.success {
  background: #d4edda;
  color: #155724;
}

.status-badge.error {
  background: #f8d7da;
  color: #721c24;
}

.status-badge.processing {
  background: #fff3cd;
  color: #856404;
}

/* 卡片内容 */
.card-content {
  padding: 16px;
}

.field-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.field-label {
  font-weight: 500;
  color: #666;
  min-width: 100px;
  flex-shrink: 0;
}

.field-value {
  flex: 1;
  color: #333;
  word-break: break-all;
}

.field-value a {
  color: #007bff;
  text-decoration: none;
}

.field-value a:hover {
  text-decoration: underline;
}

.field-image {
  max-width: 200px;
  max-height: 150px;
  border-radius: 4px;
}

.result-content {
  background: #fff;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 12px;
}

.result-text {
  margin: 0;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}

.error-content {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  padding: 12px;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #721c24;
}

.icon-error {
  color: #dc3545;
}

/* 卡片操作 */
.card-actions {
  padding: 12px 16px;
  background: #fff;
  border-top: 1px solid #e9ecef;
  display: flex;
  justify-content: flex-end;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.primary {
  background: #007bff;
  color: white;
}

.action-btn.primary:hover {
  background: #0056b3;
}

.icon-arrow-right {
  transition: transform 0.2s;
}

.action-btn:hover .icon-arrow-right {
  transform: translateX(2px);
}

/* 列表样式 */
.list-content {
  padding: 16px;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.list-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #e9ecef;
}

.item-index {
  font-weight: 600;
  color: #007bff;
  flex-shrink: 0;
}

.item-content {
  flex: 1;
  color: #333;
}

/* 表单样式 */
.form-content {
  padding: 16px;
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-field .field-label {
  font-weight: 500;
  color: #333;
  min-width: auto;
}

.form-field .field-value input,
.form-field .field-value textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: #f8f9fa;
  resize: vertical;
}

/* iframe 样式 */
.iframe-container {
  width: 100%;
  min-height: 300px;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  overflow: hidden;
  background: #f8f9fa;
}

.tool-iframe {
  width: 100%;
  height: 100%;
  min-height: 300px;
  border: none;
}

/* 错误状态 */
.tool-error {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  padding: 16px;
}

.tool-error .error-content {
  background: transparent;
  border: none;
  padding: 0;
  color: #721c24;
}

/* 加载状态 */
.tool-loading {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  color: #666;
}

.loading-spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.icon-loading {
  width: 24px;
  height: 24px;
  border: 2px solid #e9ecef;
  border-top: 2px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 14px;
}
</style>
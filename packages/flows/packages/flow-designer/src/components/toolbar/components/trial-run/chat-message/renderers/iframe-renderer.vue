<template>
  <div class="iframe-renderer">
    <div v-if="errorInfo" class="iframe-error">
      <div class="error-content">
        <i class="icon-error"></i>
        <span class="error-message">{{ errorInfo.message }}</span>
      </div>
    </div>

    <div v-else-if="isLoading" class="iframe-loading">
      <div class="loading-spinner">
        <i class="icon-loading"></i>
      </div>
      <span class="loading-text">正在加载组件...</span>
    </div>

    <div v-else class="iframe-container">
      <iframe
        :src="iframeSrc"
        class="content-iframe"
        frameborder="0"
        @load="handleIframeLoad"
        @error="handleIframeError"
        ref="iframeRef">
      </iframe>

      <!-- iframe 加载失败时的备用显示 -->
      <div v-if="!isLoaded" class="iframe-fallback">
        <div class="fallback-content">
          <i class="icon-warning"></i>
          <p>组件加载中，请稍候...</p>
          <button v-if="retryCount < 3" @click="retryLoad" class="retry-btn">
            重试加载
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';

interface Props {
  content: string;
}

const props = defineProps<Props>();

const iframeRef = ref<HTMLIFrameElement>();
const isLoading = ref(true);
const isLoaded = ref(false);
const errorInfo = ref<any>(null);
const retryCount = ref(0);

// 计算属性
const iframeSrc = computed(() => {
  if (!props.content) return '';

  try {
    // 如果是完整的 iframe HTML
    if (props.content.includes('<iframe')) {
      const match = props.content.match(/src="([^"]+)"/);
      return match ? match[1] : '';
    }

    // 如果是 URL 或相对路径
    if (props.content.startsWith('http') || props.content.startsWith('/')) {
      return props.content;
    }

    // 如果是 JSON 数据，构建 iframe URL
    const parsed = JSON.parse(props.content);
    if (parsed.menuType) {
      return `/assets/tpl/card-tpl-${parsed.menuType}.html#${encodeURIComponent(props.content)}`;
    }

    return props.content;
  } catch (error) {
    console.error('Iframe src parsing error:', error);
    return '';
  }
});

// 监听内容变化
watch(() => props.content, () => {
  resetState();
}, { immediate: true });

// 重置状态
function resetState() {
  isLoading.value = true;
  isLoaded.value = false;
  errorInfo.value = null;
  retryCount.value = 0;
}

// iframe 加载成功
function handleIframeLoad() {
  isLoading.value = false;
  isLoaded.value = true;
  errorInfo.value = null;

  // 调整 iframe 高度
  adjustIframeHeight();
}

// iframe 加载失败
function handleIframeError() {
  isLoading.value = false;
  isLoaded.value = false;

  if (retryCount.value >= 3) {
    errorInfo.value = {
      message: '组件加载失败，请稍后重试',
      type: 'loading'
    };
  } else {
    // 自动重试
    setTimeout(() => {
      retryLoad();
    }, 1000);
  }
}

// 重试加载
function retryLoad() {
  if (retryCount.value >= 3) return;

  retryCount.value++;
  resetState();

  // 强制重新加载 iframe
  if (iframeRef.value) {
    iframeRef.value.src = iframeRef.value.src;
  }
}

// 调整 iframe 高度
function adjustIframeHeight() {
  if (!iframeRef.value || !isLoaded.value) return;

  try {
    const iframe = iframeRef.value;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

    if (iframeDoc) {
      // 获取 iframe 内容的实际高度
      const height = Math.max(
        iframeDoc.documentElement.scrollHeight,
        iframeDoc.body.scrollHeight,
        300 // 最小高度
      );

      iframe.style.height = `${height}px`;

      // 监听 iframe 内容变化
      const resizeObserver = new ResizeObserver(() => {
        const newHeight = Math.max(
          iframeDoc.documentElement.scrollHeight,
          iframeDoc.body.scrollHeight,
          300
        );
        iframe.style.height = `${newHeight}px`;
      });

      resizeObserver.observe(iframeDoc.body);
    }
  } catch (error) {
    // 跨域或其他安全限制，使用固定高度
    console.warn('Cannot adjust iframe height due to security restrictions:', error);
    if (iframeRef.value) {
      iframeRef.value.style.height = '400px';
    }
  }
}

// 发送消息到 iframe
function postMessageToIframe(message: any) {
  if (iframeRef.value?.contentWindow) {
    iframeRef.value.contentWindow.postMessage(message, '*');
  }
}

// 监听来自 iframe 的消息
function handleIframeMessage(event: MessageEvent) {
  // 这里可以处理来自 iframe 的消息
  // 例如：高度调整、错误报告等
  console.log('Message from iframe:', event.data);
}

onMounted(() => {
  // 监听 iframe 消息
  window.addEventListener('message', handleIframeMessage);
});
</script>

<style scoped>
.iframe-renderer {
  width: 100%;
  margin: 12px 0;
  border-radius: 8px;
  overflow: hidden;
  background: #f8f9fa;
}

.iframe-container {
  position: relative;
  width: 100%;
  min-height: 300px;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  overflow: hidden;
}

.content-iframe {
  width: 100%;
  height: 100%;
  min-height: 300px;
  border: none;
  background: white;
  transition: opacity 0.3s ease;
}

.iframe-fallback {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  z-index: 1;
}

.fallback-content {
  text-align: center;
  color: #666;
}

.icon-warning {
  font-size: 48px;
  color: #ffc107;
  margin-bottom: 16px;
}

.fallback-content p {
  margin: 8px 0 16px 0;
  font-size: 14px;
}

.retry-btn {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.retry-btn:hover {
  background: #0056b3;
}

/* 错误状态 */
.iframe-error {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.error-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #721c24;
}

.icon-error {
  font-size: 20px;
}

/* 加载状态 */
.iframe-loading {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 48px 24px;
  text-align: center;
  color: #666;
}

.loading-spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.icon-loading {
  width: 32px;
  height: 32px;
  border: 3px solid #e9ecef;
  border-top: 3px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 16px;
  color: #495057;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .iframe-container {
    min-height: 250px;
  }

  .content-iframe {
    min-height: 250px;
  }

  .iframe-loading {
    padding: 32px 16px;
  }

  .loading-text {
    font-size: 14px;
  }
}
</style>
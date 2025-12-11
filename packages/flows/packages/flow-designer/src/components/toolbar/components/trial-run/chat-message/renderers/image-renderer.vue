<template>
  <div class="image-renderer">
    <div v-if="errorInfo" class="image-error">
      <div class="error-content">
        <i class="icon-error"></i>
        <span class="error-message">{{ errorInfo.message }}</span>
      </div>
    </div>

    <div v-else-if="isLoading" class="image-loading">
      <div class="loading-spinner">
        <i class="icon-loading"></i>
      </div>
      <span class="loading-text">图片加载中...</span>
    </div>

    <div v-else class="image-container">
      <img
        :src="imageSrc"
        :alt="altText"
        :class="['content-image', { 'loading': !isLoaded }]"
        @load="handleImageLoad"
        @error="handleImageError"
        @click="handleImageClick"
        ref="imageRef"
      />

      <!-- 图片工具栏 -->
      <div v-if="showToolbar && isLoaded" class="image-toolbar">
        <button @click="downloadImage" class="toolbar-btn" title="下载">
          <i class="icon-download"></i>
        </button>
        <button @click="copyImage" class="toolbar-btn" title="复制图片">
          <i class="icon-copy"></i>
        </button>
        <button @click="openInNewTab" class="toolbar-btn" title="在新标签页打开">
          <i class="icon-external"></i>
        </button>
      </div>

      <!-- 图片信息 -->
      <div v-if="showInfo && imageInfo" class="image-info">
        <div class="info-item">
          <span class="info-label">尺寸:</span>
          <span class="info-value">{{ imageInfo.width }} × {{ imageInfo.height }}</span>
        </div>
        <div v-if="imageInfo.size" class="info-item">
          <span class="info-label">大小:</span>
          <span class="info-value">{{ formatFileSize(imageInfo.size) }}</span>
        </div>
        <div v-if="imageInfo.format" class="info-item">
          <span class="info-label">格式:</span>
          <span class="info-value">{{ imageInfo.format.toUpperCase() }}</span>
        </div>
      </div>

      <!-- 图片预览模态框 -->
      <div v-if="showPreview" class="image-preview-modal" @click="closePreview">
        <div class="preview-content" @click.stop>
          <img :src="imageSrc" :alt="altText" class="preview-image" />
          <button @click="closePreview" class="close-btn">
            <i class="icon-close"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

interface Props {
  content: string;
  alt?: string;
  showToolbar?: boolean;
  showInfo?: boolean;
  maxWidth?: number;
  maxHeight?: number;
}

interface ImageInfo {
  width: number;
  height: number;
  size: number;
  format: string;
}

const props = withDefaults(defineProps<Props>(), {
  alt: '图片',
  showToolbar: true,
  showInfo: false,
  maxWidth: 800,
  maxHeight: 600
});

const imageRef = ref<HTMLImageElement>();
const isLoading = ref(true);
const isLoaded = ref(false);
const errorInfo = ref<any>(null);
const showPreview = ref(false);
const imageInfo = ref<ImageInfo | null>(null);

// 计算属性
const imageSrc = computed(() => {
  if (!props.content) return '';

  // 如果是 Base64 图片
  if (props.content.startsWith('data:image/')) {
    return props.content;
  }

  // 如果是 URL
  if (props.content.startsWith('http') || props.content.startsWith('/')) {
    return props.content;
  }

  // 如果是相对路径，添加基础路径
  return props.content;
});

const altText = computed(() => {
  return props.alt || '图片';
});

// 监听内容变化
watch(() => props.content, () => {
  resetState();
  loadImage();
}, { immediate: true });

// 重置状态
function resetState() {
  isLoading.value = true;
  isLoaded.value = false;
  errorInfo.value = null;
  imageInfo.value = null;
}

// 加载图片
function loadImage() {
  if (!imageSrc.value) {
    errorInfo.value = {
      message: '无效的图片地址',
      type: 'invalid'
    };
    return;
  }

  // 创建临时图片对象来获取图片信息
  const tempImg = new Image();
  tempImg.onload = () => {
    imageInfo.value = {
      width: tempImg.width,
      height: tempImg.height,
      size: 0, // 无法直接获取文件大小
      format: getImageFormat(imageSrc.value)
    };
  };

  tempImg.onerror = () => {
    errorInfo.value = {
      message: '图片加载失败',
      type: 'loading'
    };
  };

  tempImg.src = imageSrc.value;
}

// 图片加载成功
function handleImageLoad(event: Event) {
  isLoading.value = false;
  isLoaded.value = true;
  errorInfo.value = null;

  const img = event.target as HTMLImageElement;

  // 获取图片尺寸
  if (!imageInfo.value) {
    imageInfo.value = {
      width: img.naturalWidth,
      height: img.naturalHeight,
      size: 0,
      format: getImageFormat(imageSrc.value)
    };
  }
}

// 图片加载失败
function handleImageError(event: Event) {
  isLoading.value = false;
  isLoaded.value = false;
  errorInfo.value = {
    message: '图片加载失败，请检查图片地址是否正确',
    type: 'loading'
  };
}

// 点击图片
function handleImageClick() {
  showPreview.value = true;
}

// 关闭预览
function closePreview() {
  showPreview.value = false;
}

// 下载图片
function downloadImage() {
  if (!imageSrc.value) return;

  try {
    const link = document.createElement('a');
    link.href = imageSrc.value;
    link.download = `image_${Date.now()}.${getImageFormat(imageSrc.value)}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Download image error:', error);
    // 复制图片链接作为备选方案
    copyToClipboard(imageSrc.value);
  }
}

// 复制图片
async function copyImage() {
  if (!imageSrc.value) return;

  try {
    // 尝试复制图片文件
    if (imageSrc.value.startsWith('data:')) {
      // Base64 图片
      await copyBase64Image(imageSrc.value);
    } else {
      // URL 图片，复制链接
      await copyToClipboard(imageSrc.value);
    }
  } catch (error) {
    console.error('Copy image error:', error);
  }
}

// 复制 Base64 图片
async function copyBase64Image(base64: string) {
  try {
    // 将 Base64 转换为 Blob
    const response = await fetch(base64);
    const blob = await response.blob();

    // 复制到剪贴板
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob })
    ]);
  } catch (error) {
    console.error('Copy base64 image error:', error);
    // 降级方案：复制 Base64 字符串
    await copyToClipboard(base64);
  }
}

// 复制到剪贴板
async function copyToClipboard(text: string) {
  // 优先使用现代 Clipboard API
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      console.log('图片已复制到剪贴板');
      return;
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

    if (successful) {
      console.log('图片已复制到剪贴板');
    } else {
      console.error('复制失败');
    }
  } catch (error) {
    console.error('Legacy copy method failed:', error);
  }
}

// 在新标签页打开
function openInNewTab() {
  if (imageSrc.value) {
    window.open(imageSrc.value, '_blank');
  }
}

// 获取图片格式
function getImageFormat(src: string): string {
  if (src.startsWith('data:image/')) {
    const match = src.match(/data:image\/(\w+);/);
    return match ? match[1] : 'unknown';
  }

  // 从 URL 获取格式
  const extension = src.split('.').pop()?.split('?')[0];
  return extension || 'unknown';
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
</script>

<style scoped>
.image-renderer {
  width: 100%;
  margin: 12px 0;
  border-radius: 8px;
  overflow: hidden;
  background: #f8f9fa;
}

.image-container {
  position: relative;
  display: inline-block;
  max-width: 100%;
}

.content-image {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.content-image:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.content-image.loading {
  opacity: 0.7;
}

/* 图片工具栏 */
.image-toolbar {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 6px;
  padding: 4px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.image-container:hover .image-toolbar {
  opacity: 1;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.toolbar-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* 图片信息 */
.image-info {
  margin-top: 8px;
  padding: 8px 12px;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  font-size: 12px;
  color: #666;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-label {
  font-weight: 500;
}

.info-value {
  color: #333;
}

/* 图片预览模态框 */
.image-preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  cursor: pointer;
}

.preview-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  cursor: default;
}

.preview-image {
  max-width: 100%;
  max-height: 90vh;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.close-btn {
  position: absolute;
  top: -40px;
  right: 0;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}

.close-btn:hover {
  background: white;
}

/* 错误状态 */
.image-error {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  color: #721c24;
}

.error-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.icon-error {
  font-size: 20px;
}

/* 加载状态 */
.image-loading {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 32px;
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
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .image-toolbar {
    opacity: 1; /* 移动端始终显示工具栏 */
  }

  .toolbar-btn {
    width: 28px;
    height: 28px;
  }

  .image-info {
    font-size: 11px;
  }

  .close-btn {
    top: -36px;
    width: 28px;
    height: 28px;
  }
}
</style>
<template>
  <div class="file-input-wrapper" :class="{ 'multiple-files': isMultiple }">
    <!-- 文件输入区域 -->
    <div v-if="currentFiles.length === 0" class="file-actions">
      <!-- 本地上传 -->
      <div class="upload-section">
        <button class="upload-btn" @click="triggerFileInput">
          <i class="f-icon f-icon-plus"></i>
          <span>{{ isMultiple ? '选择文件（可多选）' : '选择文件' }}</span>
        </button>
        <input
          ref="fileInputRef"
          type="file"
          :multiple="isMultiple"
          style="display: none"
          @change="onFileInputChange"
          :accept="getFileAcceptAttribute()"
        />
      </div>

      <!-- URL输入 - 暂时隐藏 -->
      <!--
      <div class="url-section">
        <input
          v-if="!isMultiple"
          ref="urlInputRef"
          v-model="urlInput"
          class="url-input"
          type="text"
          :placeholder="'请输入文件URL链接，如：https://example.com/file.pdf'"
          @input="handleUrlInput"
        />
        <textarea
          v-else
          ref="urlInputRef"
          v-model="urlInput"
          class="url-textarea"
          placeholder="请输入多个文件URL链接，每行一个URL地址&#10;例如：&#10;https://example.com/file1.pdf&#10;https://example.com/file2.pdf"
          rows="4"
        ></textarea>
      </div>
      -->
    </div>

    <!-- 已选择的文件列表 -->
    <div v-else class="files-container">
      <!-- 单文件显示 -->
      <div v-if="!isMultiple && currentFiles.length === 1" class="file-item">
        <div class="file-icon">
          <i v-if="currentFiles[0].source === 'upload'" class="f-icon f-icon-attachment"></i>
          <i v-else class="f-icon f-icon-link"></i>
        </div>
        <div class="file-info">
          <span class="file-name">{{ currentFiles[0].name }}</span>
          <span class="file-meta">
            <span class="file-size">{{ currentFiles[0].size }}</span>
            <span v-if="currentFiles[0].source === 'url'" class="file-source">URL</span>
            <span v-if="currentFiles[0].source === 'upload' && currentFiles[0].status"
                  :class="['upload-status', currentFiles[0].status]">
              {{ getStatusText(currentFiles[0].status) }}
            </span>
          </span>
        </div>
        <div class="delete-file-btn" @click="deleteFile()">
          <i class="f-icon f-icon-delete"></i>
        </div>
      </div>

      <!-- 多文件列表 -->
      <div v-else class="files-list">
        <div class="files-header">
          <span class="files-count">{{ currentFiles.length }} 个文件</span>
          <button class="clear-all-btn" @click="deleteFile()">
            <i class="f-icon f-icon-delete"></i>
            <span>清空</span>
          </button>
        </div>
        <div class="files-items">
          <div
            v-for="(file, index) in currentFiles"
            :key="`${file.name}-${index}`"
            class="file-item"
          >
            <div class="file-icon">
              <i v-if="file.source === 'upload'" class="f-icon f-icon-attachment"></i>
              <i v-else class="f-icon f-icon-link"></i>
            </div>
            <div class="file-info">
              <span class="file-name">{{ file.name }}</span>
              <span class="file-meta">
                <span class="file-size">{{ file.size }}</span>
                <span v-if="file.source === 'url'" class="file-source">URL</span>
                <span v-if="file.source === 'upload' && file.status"
                      :class="['upload-status', file.status]">
                  {{ getStatusText(file.status) }}
                </span>
              </span>
            </div>
            <div class="delete-file-btn" @click="deleteFile(index)">
              <i class="f-icon f-icon-delete"></i>
            </div>
          </div>
        </div>

        <!-- 添加更多文件按钮 -->
        <div class="add-more-section">
          <!-- 本地上传 -->
          <div class="upload-section">
            <button class="upload-btn compact" @click="triggerFileInput">
              <i class="f-icon f-icon-plus"></i>
              <span>添加更多文件</span>
            </button>
            <input
              ref="fileInputRef"
              type="file"
              :multiple="true"
              style="display: none"
              @change="onFileInputChange"
              :accept="getFileAcceptAttribute()"
            />
          </div>

          <!-- URL输入 - 暂时隐藏 -->
          <!--
          <div class="url-section">
            <textarea
              ref="urlInputRef"
              v-model="urlInput"
              class="url-textarea compact"
              placeholder="请输入多个文件URL链接，每行一个URL地址&#10;例如：&#10;https://example.com/file1.pdf&#10;https://example.com/file2.pdf"
              rows="3"
            ></textarea>
            <button class="add-urls-btn" @click="handleMultipleUrlsInput">
              <i class="f-icon f-icon-plus"></i>
              <span>添加URL文件</span>
            </button>
          </div>
          -->
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue';
import type { FileInfo, FileUploadState, GspDocMetadata } from './types';
import { type FNotifyService, F_NOTIFY_SERVICE_TOKEN } from '@farris/ui-vue';
import {
  MAX_FILE_COUNT,
  uploadFile,
  getFileTypeByExtension,
  formatFileSize,
  isFileTypeAllowed,
  isFileSizeAllowed,
  isFileNameLengthAllowed,
  generateUUID,
  getFileSizeLimitMessage,
  getFileTypeLimitMessage,
  getFileAcceptAttribute
} from './file-upload-utils';

interface Props {
  value: FileInfo | FileInfo[] | null;
  multiple?: boolean;
  onFileChange?: (metadataIds: string[]) => void;
}

interface Emits {
  (e: 'update', value: FileInfo | FileInfo[] | null): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const fileInputRef = ref<HTMLInputElement>();
// const urlInputRef = ref<HTMLInputElement | HTMLTextAreaElement>();
// const fileSource = ref<'upload' | 'url'>('upload');
// const urlInput = ref('');
const fileUploadStates = ref<FileUploadState[]>([]);
const filesValue = ref<string[]>([]);

// 注入通知服务
const notifyService = inject<FNotifyService>(F_NOTIFY_SERVICE_TOKEN);

// 通知消息函数
function notify(method: 'warning' | 'error' | 'success', message: string): void {
  if (notifyService) {
    notifyService.globalConfig.position = 'top-center';
    notifyService.globalConfig.showCloseButton = true;
    notifyService.globalConfig.timeout = 3000;
  }
  notifyService?.[method]({ message });
}

// 检查是否为多文件模式
const isMultiple = computed(() => props.multiple === true);

// 获取当前文件列表
const currentFiles = computed(() => {
  if (!props.value) return [];
  if (Array.isArray(props.value)) {
    return props.value;
  }
  return [props.value];
});

// 根据当前值确定文件来源 - 暂时只支持上传
// const currentSource = computed(() => {
//   if (currentFiles.value.length > 0) {
//     return currentFiles.value[0].source;
//   }
//   return 'upload'; // 暂时固定为上传模式
// });

function triggerFileInput() {
  console.log('triggerFileInput');
  fileInputRef.value?.click();
}

function onFileInputChange(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    handleFileChange(input.files);
    // 重置input，以便可以重复上传同一文件
    input.value = '';
  }
}

const handleFileChange = async (files: FileList) => {
  try {
    // 检查文件数量限制
    if (fileUploadStates.value.length + files.length > MAX_FILE_COUNT) {
      notify('error', `文件数量不能超过${MAX_FILE_COUNT}个`);
      return;
    }

    const validFiles: File[] = [];

    // 验证文件类型和大小
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // 检查文件名长度
      if (!isFileNameLengthAllowed(file.name)) {
        notify('error', "文件名长度不能超过100个字符");
        return;
      }

      // 检查文件类型
      if (!isFileTypeAllowed(file.name)) {
        notify('error', `不支持的文件类型: ${file.name}。${getFileTypeLimitMessage()}`);
        continue;
      }

      // 检查文件大小
      if (!isFileSizeAllowed(file.size)) {
        notify('error', `文件大小超出限制: ${file.name}。${getFileSizeLimitMessage()}`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    const newFiles = validFiles.map((file) => ({
      file,
      status: "uploading" as const,
      metadataId: generateUUID(),
      fileName: file.name,
      fileType: getFileTypeByExtension(file.name),
      size: formatFileSize(file.size),
    }));
    fileUploadStates.value = [...fileUploadStates.value, ...newFiles];

    const metadataIds: string[] = [];
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
        metadataIds.push(metadataId);
        // 更新上传状态
        const fileIndex = fileUploadStates.value.findIndex((f) => f.file === file);
        if (fileIndex !== -1) {
          fileUploadStates.value[fileIndex].status = "success";
          fileUploadStates.value[fileIndex].metadataId = metadataId;
        }
      } catch (error) {
        console.error("文件上传失败:", error);
        // 显示提示信息
        notify('error', "文件上传失败");

        // 从上传列表中删除失败的文件
        const fileIndex = fileUploadStates.value.findIndex((f) => f.file === file);
        if (fileIndex !== -1) {
          fileUploadStates.value.splice(fileIndex, 1);
        }
      }
    }

    filesValue.value = metadataIds;

    // 更新组件的值
    const newFileInfos: FileInfo[] = metadataIds.map((id, index) => {
      const uploadState = fileUploadStates.value.find(s => s.metadataId === id);
      const originalFile = validFiles[index];
      return {
        name: originalFile.name,
        size: formatFileSize(originalFile.size),
        type: getFileTypeByExtension(originalFile.name),
        file: originalFile,
        source: 'upload' as const,
        metadataId: id,
        status: uploadState?.status || 'success'
      };
    });

    if (isMultiple.value) {
      // 多文件模式：添加到现有文件列表
      const existingFiles = Array.isArray(props.value) ? props.value : (props.value ? [props.value] : []);
      emit('update', [...existingFiles, ...newFileInfos]);
    } else {
      // 单文件模式：只取第一个文件
      emit('update', newFileInfos[0]);
    }

    // 触发文件变更回调
    if (props.onFileChange) {
      props.onFileChange(metadataIds);
    }
  } catch (error) {
    console.error("文件上传失败:", error);
    notify('error', "文件上传失败");
  }
};

// URL相关函数 - 暂时隐藏
/*
function handleUrlInput() {
  const url = urlInput.value.trim();

  if (!url) {
    return; // 如果为空，直接返回，不清空现有数据
  }

  // 简单的URL验证
  if (!isValidUrl(url)) {
    return; // 不更新，等待用户输入完整URL
  }

  try {
    // 从URL中提取文件名
    const urlObj = new URL(url);
    const filename = urlObj.pathname.split('/').pop() || 'unknown_file';
    const extension = filename.split('.').pop() || '';

    const newFileInfo: FileInfo = {
      name: filename,
      size: '未知大小',
      type: extension ? `${extension.toUpperCase()} 文件` : '未知类型',
      url: url,
      source: 'url'
    };

    // 单文件模式：直接更新
    emit('update', newFileInfo);
  } catch (error) {
    // URL格式错误，不更新
    console.warn('URL格式错误:', error);
  }
}

function handleMultipleUrlsInput() {
  const text = urlInput.value.trim();

  if (!text) {
    return; // 如果为空，直接返回
  }

  try {
    // 按行分割URL，过滤空行
    const lines = text.split('\n').filter(line => line.trim());
    const newFileInfos: FileInfo[] = [];

    for (const url of lines) {
      const trimmedUrl = url.trim();

      // 简单的URL验证
      if (!isValidUrl(trimmedUrl)) {
        continue; // 跳过无效URL
      }

      try {
        // 从URL中提取文件名
        const urlObj = new URL(trimmedUrl);
        const filename = urlObj.pathname.split('/').pop() || 'unknown_file';
        const extension = filename.split('.').pop() || '';

        const fileInfo: FileInfo = {
          name: filename,
          size: '未知大小',
          type: extension ? `${extension.toUpperCase()} 文件` : '未知类型',
          url: trimmedUrl,
          source: 'url'
        };

        newFileInfos.push(fileInfo);
      } catch (error) {
        // 跳过格式错误的URL
        continue;
      }
    }

    if (newFileInfos.length > 0) {
      // 获取现有文件列表
      const existingFiles = Array.isArray(props.value) ? props.value : (props.value ? [props.value] : []);

      // 合并现有文件和新文件，避免重复
      const existingUrls = new Set(existingFiles.map(f => f.url).filter(Boolean));
      const uniqueNewFiles = newFileInfos.filter(f => !existingUrls.has(f.url));

      const newFilesList = [...existingFiles, ...uniqueNewFiles];
      emit('update', newFilesList);

      // 清空输入框，准备下一批输入
      urlInput.value = '';
    }
  } catch (error) {
    console.warn('处理多行URL时出错:', error);
  }
}

function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

function switchSource(source: 'upload' | 'url') {
  fileSource.value = source;
  if (source === 'upload') {
    urlInput.value = '';
  } else {
    // 如果切换到URL模式，且当前有上传的文件，需要清空
    if (currentFiles.value.length > 0 && currentFiles.value[0].source === 'upload') {
      emit('update', null);
    }
  }
}
*/

function deleteFile(index?: number) {
  if (isMultiple.value && typeof index === 'number') {
    // 多文件模式：删除指定索引的文件
    const currentFilesList = Array.isArray(props.value) ? props.value : (props.value ? [props.value] : []);
    const newFilesList = currentFilesList.filter((_, i) => i !== index);
    emit('update', newFilesList.length > 0 ? newFilesList : null);
  } else {
    // 单文件模式或清空所有文件
    emit('update', null);
  }
  // urlInput.value = ''; // 暂时注释掉URL相关逻辑
}

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    uploading: '上传中...',
    success: '上传成功',
    error: '上传失败'
  };
  return statusMap[status] || status;
}

// URL同步逻辑 - 暂时隐藏
/*
// 如果有URL值，同步到输入框（仅单文件模式）
watch(() => {
  // 只有在单文件模式下才同步URL
  if (!isMultiple.value && props.value && typeof props.value === 'object' && 'url' in props.value) {
    const fileInfo = props.value as FileInfo;
    if (fileInfo.url && fileInfo.url !== urlInput.value) {
      urlInput.value = fileInfo.url;
    }
  }
}, { immediate: true });
*/
</script>

<style lang="scss" scoped>
.file-input-wrapper {
  &.multiple-files {
    .file-item {
      margin-bottom: 8px;
      border-bottom: 1px solid #f0f0f0;
      padding-bottom: 12px;

      &:last-child {
        margin-bottom: 0;
        border-bottom: none;
        padding-bottom: 12px;
      }
    }
  }

  .source-switcher {
    display: flex;
    gap: 4px;
    margin-bottom: 12px;
    background: #f5f5f5;
    border-radius: 6px;
    padding: 2px;

    &.compact {
      margin-bottom: 8px;
      padding: 1px;
      background: transparent;
      border: none;

      .source-btn {
        padding: 6px 10px;
        font-size: 12px;
        border: 1px solid #d9d9d9;
        background: #fff;
        border-radius: 4px;
        color: #666666;
        outline: none;

        &.active {
          border-color: #5b89fe;
          color: #5b89fe;
          background: #fff;
          box-shadow: none;
        }

        &:hover {
          border-color: #5b89fe;
          color: #5b89fe;
        }

        &:active {
          outline: none;
        }

        &:focus {
          outline: none;
        }

        i {
          font-size: 12px;
        }
      }
    }

    .source-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 12px;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: #666666;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s ease;
      user-select: none;
      outline: none;

      i {
        font-size: 14px;
      }

      &:hover {
        color: #5b89fe;
      }

      &:active {
        outline: none;
      }

      &:focus {
        outline: none;
      }

      &.active {
        background: #fff;
        color: #5b89fe;
        font-weight: 500;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
    }
  }

  .file-actions {
    margin-bottom: 8px;

    .upload-section {
      .upload-btn {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 16px;
        border: 2px dashed #d9d9d9;
        border-radius: 6px;
        background: #fafafa;
        color: #666666;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s ease;
        user-select: none;
        outline: none;

        &.compact {
          padding: 8px 12px;
          font-size: 13px;
          border: 1px dashed #d9d9d9;
          background: #fff;
          color: #666666;
          box-shadow: none !important;
          outline: none !important;

          &:hover {
            border-color: #5b89fe;
            color: #5b89fe;
            background-color: rgba(91, 137, 254, 0.04);
          }

          &:active {
            outline: none !important;
            box-shadow: none !important;
          }

          &:focus {
            outline: none !important;
            box-shadow: none !important;
          }

          i {
            font-size: 14px;
          }
        }

        i {
          font-size: 16px;
        }

        &:hover {
          border-color: #5b89fe;
          color: #5b89fe;
          background-color: rgba(91, 137, 254, 0.04);
        }

        &:active {
          outline: none;
        }

        &:focus {
          outline: none;
        }
      }
    }

    .url-section {
      .url-input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #d9d9d9;
        border-radius: 4px;
        font-size: 14px;
        background-color: #fff;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;

        &.compact {
          padding: 6px 10px;
          font-size: 13px;
        }

        &:focus {
          outline: none;
          border-color: #5b89fe;
          background-color: #fff;
          box-shadow: 0 0 0 2px rgba(91, 137, 254, 0.1);
        }

        &:hover {
          border-color: #b8c8dc;
        }

        &::placeholder {
          color: #999999;
        }
      }

      .url-textarea {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #d9d9d9;
        border-radius: 4px;
        font-size: 14px;
        background-color: #fff;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
        resize: vertical;
        min-height: 80px;
        font-family: inherit;
        line-height: 1.5;

        &.compact {
          padding: 6px 10px;
          font-size: 13px;
          min-height: 60px;
        }

        &:focus {
          outline: none;
          border-color: #5b89fe;
          background-color: #fff;
          box-shadow: 0 0 0 2px rgba(91, 137, 254, 0.1);
        }

        &:hover {
          border-color: #b8c8dc;
        }

        &::placeholder {
          color: #999999;
          white-space: pre-line;
        }
      }

      .add-urls-btn {
        margin-top: 8px;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 6px 12px;
        border: 1px solid #d9d9d9;
        border-radius: 4px;
        background: #fff;
        color: #666666;
        cursor: pointer;
        font-size: 13px;
        transition: all 0.2s ease;
        user-select: none;

        &:hover {
          border-color: #5b89fe;
          color: #5b89fe;
          background-color: rgba(91, 137, 254, 0.04);
        }

        i {
          font-size: 14px;
        }
      }
    }
  }

  .files-container {
    .files-list {
      .files-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        padding: 8px 12px;
        background: #f8f9fa;
        border-radius: 4px;

        .files-count {
          font-size: 13px;
          color: #666666;
          font-weight: 500;
        }

        .clear-all-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border: none;
          border-radius: 4px;
          background: transparent;
          color: #ff4d4f;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s ease;
          user-select: none;

          i {
            font-size: 12px;
          }

          &:hover {
            background-color: rgba(255, 77, 79, 0.1);
          }
        }
      }

      .files-items {
        margin-bottom: 12px;
      }

      .add-more-section {
        padding-top: 16px;
        border-top: 1px solid #e8e8e8;
        margin-top: 16px;

        .source-switcher {
          margin-bottom: 12px;
        }

        .upload-section {
          padding: 12px;
          border: 1px solid #f0f0f0;
          border-radius: 6px;
          background: #fafbfc;

          .upload-btn {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 10px 16px;
            border: 1px dashed #d9d9d9;
            border-radius: 4px;
            background: #fff;
            color: #666666;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s ease;
            user-select: none;
            box-shadow: none !important;
            outline: none !important;

            &:hover {
              border-color: #5b89fe;
              color: #5b89fe;
              background-color: rgba(91, 137, 254, 0.04);
            }

            &:active {
              outline: none !important;
              box-shadow: none !important;
            }

            &:focus {
              outline: none !important;
              box-shadow: none !important;
            }

            i {
              font-size: 14px;
            }
          }
        }

        .url-section {
          padding: 12px;
          border: 1px solid #f0f0f0;
          border-radius: 6px;
          background: #fafbfc;

          .url-textarea {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #d9d9d9;
            border-radius: 4px;
            font-size: 13px;
            background-color: #fff;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
            resize: vertical;
            min-height: 60px;
            font-family: inherit;
            line-height: 1.5;

            &:focus {
              outline: none;
              border-color: #5b89fe;
              background-color: #fff;
              box-shadow: 0 0 0 2px rgba(91, 137, 254, 0.1);
            }

            &:hover {
              border-color: #b8c8dc;
            }

            &::placeholder {
              color: #999999;
              white-space: pre-line;
            }
          }

          .add-urls-btn {
            margin-top: 12px;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 8px 16px;
            border: 1px solid #d9d9d9;
            border-radius: 4px;
            background: #fff;
            color: #666666;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s ease;
            user-select: none;

            &:hover {
              border-color: #5b89fe;
              color: #5b89fe;
              background-color: rgba(91, 137, 254, 0.04);
            }

            i {
              font-size: 14px;
            }
          }
        }
      }
    }

    .file-item {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border: 1px solid #e8e8e8;
      border-radius: 8px;
      background: #fafafa;
      transition: all 0.2s ease;
      margin-bottom: 8px;

      &:hover {
        border-color: #d0d0d0;
        background: #f8f9fa;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      }

      .file-icon {
        width: 32px;
        height: 32px;
        margin-right: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f0f2f5;
        border-radius: 6px;
        color: #5b89fe;
        font-size: 16px;

        i {
          font-size: 18px;
        }
      }

      .file-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;

        .file-name {
          font-size: 14px;
          color: #333333;
          font-weight: 500;
          word-break: break-all;
          line-height: 1.4;
        }

        .file-meta {
          display: flex;
          align-items: center;
          gap: 8px;

          .file-size {
            font-size: 12px;
            color: #82849A;
          }

          .file-source {
            font-size: 11px;
            color: #5b89fe;
            background: rgba(91, 137, 254, 0.1);
            padding: 2px 6px;
            border-radius: 10px;
            font-weight: 500;
          }

          .upload-status {
            font-size: 11px;
            padding: 2px 6px;
            border-radius: 10px;
            font-weight: 500;

            &.uploading {
              color: #fa8c16;
              background: rgba(250, 140, 22, 0.1);
            }

            &.success {
              color: #52c41a;
              background: rgba(82, 196, 26, 0.1);
            }

            &.error {
              color: #ff4d4f;
              background: rgba(255, 77, 79, 0.1);
            }
          }
        }
      }

      .delete-file-btn {
        display: flex;
        overflow: hidden;
        justify-content: center;
        align-items: center;
        width: 24px;
        height: 24px;
        border-radius: 5px;
        user-select: none;
        cursor: pointer;
        border: none;
        background: transparent;

        &:hover {
          background-color: rgba(87, 104, 161, 0.08);
        }

        i {
          color: #82849A;
          font-size: 14px;
        }
      }
    }
  }
}
</style>
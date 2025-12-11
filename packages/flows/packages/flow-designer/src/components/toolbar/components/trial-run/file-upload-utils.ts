import type { GspDocMetadata } from './types';

/**
 * 生成简单的UUID
 * @returns UUID字符串
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 文件上传配置常量
export const MAX_FILE_COUNT = 5;
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_FILE_TYPES = [
  'txt', 'doc', 'docx', 'pdf', 'xls', 'xlsx',
  'ppt', 'pptx', 'png', 'jpg', 'jpeg', 'gif',
  'bmp', 'svg', 'zip', 'rar'
];

// 文件类型映射
const FILE_TYPE_MAP: Record<string, string> = {
  'txt': '文本文件',
  'doc': 'Word文档',
  'docx': 'Word文档',
  'pdf': 'PDF文档',
  'xls': 'Excel表格',
  'xlsx': 'Excel表格',
  'ppt': 'PowerPoint演示文稿',
  'pptx': 'PowerPoint演示文稿',
  'png': 'PNG图片',
  'jpg': 'JPEG图片',
  'jpeg': 'JPEG图片',
  'gif': 'GIF图片',
  'bmp': 'BMP图片',
  'svg': 'SVG图片',
  'zip': 'ZIP压缩包',
  'rar': 'RAR压缩包'
};

/**
 * 读取文件为Base64字符串
 * @param file 要读取的文件
 * @returns Promise<string> Base64字符串
 */
export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // 移除data:image/...;base64,前缀，只保留base64数据
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 上传文件到服务器
 * @param file 要上传的文件
 * @param metadata 文件元数据
 * @param mode 操作模式
 * @returns Promise<string> 元数据ID
 */
export async function uploadFile(
  file: File,
  metadata: GspDocMetadata,
  mode: 'Formal' | 'Temp' = 'Formal'
): Promise<string> {
  // 读取文件为Base64字符串
  const fileContent = await readFileAsBase64(file);

  const uploadEntity = {
    filePath: "workflow-root",
    metadata,
    fileContent,
    mode,
  };

  const response = await fetch("/api/runtime/dfs/v1.0/doc", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(uploadEntity),
  });

  if (!response.ok) {
    throw new Error(`File upload failed: ${response.statusText}`);
  }

  const metadataId = await response.text();
  return metadataId;
}

/**
 * 根据文件扩展名获取文件类型
 * @param fileName 文件名
 * @returns 文件类型字符串
 */
export function getFileTypeByExtension(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  return FILE_TYPE_MAP[extension] || '未知文件类型';
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的文件大小字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 验证文件类型是否允许
 * @param fileName 文件名
 * @returns 是否允许
 */
export function isFileTypeAllowed(fileName: string): boolean {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  return ALLOWED_FILE_TYPES.includes(extension);
}

/**
 * 验证文件大小是否在限制范围内
 * @param fileSize 文件大小（字节）
 * @returns 是否允许
 */
export function isFileSizeAllowed(fileSize: number): boolean {
  return fileSize <= MAX_FILE_SIZE;
}

/**
 * 验证文件名长度是否在限制范围内
 * @param fileName 文件名
 * @returns 是否允许
 */
export function isFileNameLengthAllowed(fileName: string): boolean {
  return fileName.length <= 100;
}

/**
 * 获取文件大小限制的提示信息
 * @returns 提示信息
 */
export function getFileSizeLimitMessage(): string {
  return `文件大小不能超过 ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB`;
}

/**
 * 获取允许的文件类型提示信息
 * @returns 提示信息
 */
export function getFileTypeLimitMessage(): string {
  const commonTypes = ['txt', 'doc', 'docx', 'pdf', 'png', 'jpg', 'jpeg'];
  const typeCount = ALLOWED_FILE_TYPES.length;
  return `支持 ${typeCount} 种常见文件类型，包括：${commonTypes.map(t => '.' + t).join(', ')} 等`;
}

/**
 * 获取文件选择器的 accept 属性值
 * @returns accept 属性值字符串
 */
export function getFileAcceptAttribute(): string {
  // 将文件扩展名转换为 MIME 类型和扩展名的组合
  const mimeTypes = new Map<string, string[]>([
    ['txt', ['text/plain']],
    ['doc', ['application/msword']],
    ['docx', ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']],
    ['pdf', ['application/pdf']],
    ['xls', ['application/vnd.ms-excel']],
    ['xlsx', ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']],
    ['ppt', ['application/vnd.ms-powerpoint']],
    ['pptx', ['application/vnd.openxmlformats-officedocument.presentationml.presentation']],
    ['png', ['image/png']],
    ['jpg', ['image/jpeg']],
    ['jpeg', ['image/jpeg']],
    ['gif', ['image/gif']],
    ['bmp', ['image/bmp']],
    ['svg', ['image/svg+xml']],
    ['zip', ['application/zip']],
    ['rar', ['application/x-rar-compressed']]
  ]);

  const acceptList: string[] = [];

  ALLOWED_FILE_TYPES.forEach(extension => {
    // 添加扩展名
    acceptList.push(`.${extension}`);

    // 添加对应的 MIME 类型
    const mimes = mimeTypes.get(extension);
    if (mimes) {
      acceptList.push(...mimes);
    }
  });

  return acceptList.join(',');
}

import type { DebugParam, DebugParamType } from '@farris/flow-devkit';

// 参数输入类型
export type ParamType = DebugParamType;

// 输入参数定义
export type InputParam = DebugParam;

// 文件信息
export interface FileInfo {
  name: string;
  size: string;
  type: string;
  file?: File;
  url?: string;
  source: 'upload' | 'url'; // 文件来源：上传或URL
  metadataId?: string; // 上传后的元数据ID
  status?: 'uploading' | 'success' | 'error'; // 上传状态
}

// 文件上传状态
export interface FileUploadState {
  file: File;
  status: 'uploading' | 'success' | 'error';
  metadataId: string;
  fileName: string;
  fileType: string;
  size: string;
}

// GSP文档元数据
export interface GspDocMetadata {
  id: string;
  fileName: string;
  rootId: string;
  docType: string;
  docSize: string;
}

// GSP文档操作模式
export enum GspDocOperatingModes {
  Formal = 'Formal',
  Temp = 'Temp'
}

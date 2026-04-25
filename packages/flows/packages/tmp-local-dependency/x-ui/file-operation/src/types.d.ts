/** 文件操作摘要 */
export interface FileOperationSummary {
    explored: number;
    searched: number;
}
/** 文件操作详情 - 文本类型 */
export interface FileOperationDetailText {
    title: string;
    text: string;
}
/** 文件操作详情 - 文件类型 */
export interface FileOperationDetailFile {
    icon: string;
    file: string;
    path: string;
}
/** 文件操作详情 */
export type FileOperationDetail = FileOperationDetailText | FileOperationDetailFile;
/** 单条文件操作 */
export interface FileOperationItem {
    type: string;
    message: string;
    details?: FileOperationDetail[];
}
/** 文件操作类型消息内容 */
export interface MessageContentFileOperation {
    type: 'FileOperation';
    summary?: FileOperationSummary;
    operations: FileOperationItem[];
}

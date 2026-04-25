/** 附件预览配置 */
export interface AttachmentPreviewConfig {
    /** 附件预览 URL */
    url?: string;
    /** 附件名称 */
    name: string;
    /** 附件类型，如 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'image', 'video', 'audio' 等 */
    type: string;
    /** 附件大小，单位字节 */
    size?: number;
    /** 附件图标 */
    icon?: string;
    /** 缩略图 URL */
    thumbnailUrl?: string;
}
/** 附件预览消息类型内容 */
export interface MessageContentAttachmentPreview {
    type: 'AttachmentPreview';
    /** 提示消息 */
    message?: string;
    /** 附件预览配置列表 */
    attachments: AttachmentPreviewConfig[];
    /** 创建时间 */
    createdDatetime?: string;
}

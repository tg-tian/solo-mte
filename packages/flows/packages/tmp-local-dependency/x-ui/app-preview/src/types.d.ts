/** 预览配置 */
export type PreviewMode = 'splitScreen' | 'fullScreen';
export interface PreviewConfig {
    /** 直接预览 URL（优先级最高，设置后忽略其它拼接字段） */
    url?: string;
    /** 预览内容（用于 markdown 等内容直接渲染） */
    content?: string;
    /** 内容类型（当设置 content 时生效） */
    contentType?: 'markdown' | 'text';
    previewMode?: PreviewMode;
    baseUri?: string;
    metadataPath?: string;
    projectPath?: string;
    baseMetadataId?: string;
}
export interface AppConfig {
    appPath: string;
    appObjectId: string;
    appBuilderUri?: string;
    ws?: string;
}
/** 应用预览消息类型内容 */
export interface MessageContentAppPreview {
    type: 'AppPreview';
    message: string;
    appIcon: string;
    appName: string;
    appConfig: AppConfig;
    previewConfig: PreviewConfig;
    createdDatetime: string;
}

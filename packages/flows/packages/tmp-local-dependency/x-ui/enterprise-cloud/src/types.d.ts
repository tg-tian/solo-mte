/**
 * 企业云「智能消息标准」相关 content 变体（阶段 A）。
 * standardType：可选，便于与未来 wire 上的 type 枚举对账。
 */
export interface MessageContentAgentThinking {
    type: 'AgentThinking';
    standardType?: 'agent/thinking';
    streamStatus?: 'start' | 'continue' | 'end';
    text: string;
    sources?: string[];
}
export interface ReferenceSourceItem {
    title: string;
    url: string;
}
export interface MessageContentReferenceSources {
    type: 'ReferenceSources';
    standardType?: 'agent/reference' | string;
    items: ReferenceSourceItem[];
}
export interface MessageContentInputRecommend {
    type: 'InputRecommend';
    standardType?: 'agent/suggestions' | string;
    title?: string;
    suggestions: string[];
}
export interface UserAuthOption {
    optionId: string;
    name: string;
    message?: string;
}
export interface MessageContentUserAuth {
    type: 'UserAuth';
    standardType?: 'agent/request-run' | string;
    /** 《智能消息1.0》§5.3.3 content.requestId */
    requestId?: string;
    description: string;
    options: UserAuthOption[];
}
export interface MessageContentErrorReminder {
    type: 'ErrorReminder';
    standardType?: 'agent/error' | string;
    errorLevel: 0 | 1 | 2;
    errorText: string;
    errorLink?: string;
}
export interface LinkRelatedItem {
    title: string;
    url: string;
    poster?: string;
}
export interface MessageContentLinkCard {
    type: 'LinkCard';
    standardType?: 'card/url' | string;
    poster?: string;
    title: string;
    subtitle?: string;
    url: string;
    relatedLinks?: LinkRelatedItem[];
}
export interface MessageContentUnknownEnterprise {
    type: 'UnknownEnterprise';
    standardType?: 'unknown' | string;
    /** Gateway body.type，阶段 C 登记、便于与标准对账 */
    wireType?: string;
    hint?: string;
}
/** 企业云「文件」类资源消息（附件）：对应文档中 category/name/size/media */
export interface MessageContentAttachmentFile {
    type: 'AttachmentFile';
    standardType?: 'resource/file' | string;
    category: string;
    name: string;
    size: number;
    /** 云盘或下载路径 id / URL，演示可写占位 */
    media: string;
}
export type EnterpriseCloudMessageContent = MessageContentAgentThinking | MessageContentReferenceSources | MessageContentInputRecommend | MessageContentUserAuth | MessageContentErrorReminder | MessageContentLinkCard | MessageContentUnknownEnterprise | MessageContentAttachmentFile;

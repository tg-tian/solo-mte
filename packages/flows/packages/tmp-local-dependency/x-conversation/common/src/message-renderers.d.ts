import { VNode } from 'vue';
import { Message } from '../../conversation/src/conversation.props';
import { MessageContent } from '../../conversation/src/composition/types';
import { PreviewConfig, ThinkControl, ThoughtChainControl, AttachmentPreviewConfig } from '@farris/x-ui';

export type { MessageContent } from '../../conversation/src/composition/types';
/** 将 content 规范为 MessageContent 对象 */
export declare function normalizeMessageContent(content: string | MessageContent): MessageContent;
/** 消息渲染上下文 */
export interface MessageRenderContext {
    onAppPreviewClick?: (config: PreviewConfig) => void;
    onAttachmentPreviewClick?: (config: AttachmentPreviewConfig) => void;
    onRecommendPick?: (text: string) => void;
    onLoadThink?: (control: ThinkControl, messageId: string) => void;
    onLoadThoughtChain?: (control: ThoughtChainControl, messageId: string) => void;
    onUserAuthConfirm?: (optionId: string, name: string, message: string, messageId: string) => void;
    /** 为 true 时 FXBubble 不显示左侧头像（尾部子块等场景） */
    inAssistantTurnGroup?: boolean;
}
/** 根据消息类型获取消息内容区域的渲染函数 */
export type MessageRenderer = (content: MessageContent, message: Message, context?: MessageRenderContext) => VNode;
/**
 * 是否使用 FXBubble 作为主壳（与 `conversation` 中 `shouldShowBubble` 对齐）。
 * 含网关常见的 Thinking / 思维链（含 Todo 规划）/ 附件。
 */
export declare function messageUsesInnerBubbleShell(content: string | MessageContent): boolean;
/** 消息组件工厂：根据 content.type 获取对应渲染器并绘制消息区域 */
export declare function renderMessageContent(message: Message, context?: MessageRenderContext): VNode;

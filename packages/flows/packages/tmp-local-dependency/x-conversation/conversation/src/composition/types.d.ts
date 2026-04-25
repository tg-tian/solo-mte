import { VNode } from 'vue';
import { BubbleContent, MessageContentFileOperation, MessageContentTodo, MessageContentStartedToDo, MessageContentCoding, MessageContentAppPreview, MessageContentMarkdown, EnterpriseCloudMessageContent, MessageContentAttachmentPreview } from '@farris/x-ui';

/**
 * 同一 `roundId` 下多条网关片段合并为 **一条**助手消息；`blocks` 按到达顺序排列。
 * 不支持嵌套 AssistantComposite。
 */
export interface MessageContentAssistantComposite {
    type: 'AssistantComposite';
    roundId: string;
    blocks: Array<{
        id: string;
        content: MessageContent;
    }>;
}
/** 消息内容：支持多种类型，缺省为 text */
export type MessageContent = BubbleContent | MessageContentFileOperation | MessageContentTodo | MessageContentStartedToDo | MessageContentCoding | MessageContentAppPreview | MessageContentMarkdown | EnterpriseCloudMessageContent | MessageContentAttachmentPreview | MessageContentAssistantComposite;
/** 布局策略：紧凑模式 vs 正常模式 */
export interface LayoutStrategy {
    isCompact: boolean;
    renderContentArea: (ctx: ContentAreaContext) => VNode;
    renderFloatContentArea?: (ctx: FloatingContentAreaContext) => VNode | null;
}
export interface ContentAreaContext {
    hasMessages: boolean;
    renderHeader: () => VNode;
    renderMessages: () => VNode;
    /** 输入框上方扩展区（如「待处理任务」），无插槽时可不实现 */
    renderAboveInput?: () => VNode | null;
    renderInput: () => VNode;
    renderSkills: () => VNode;
    renderBottom: () => VNode | VNode[] | null;
}
export interface FloatingContentAreaContext {
    renderFloatingInput: () => VNode;
    renderFloatingInputIcon: () => VNode;
    renderFloatingMessages: () => VNode | null;
}

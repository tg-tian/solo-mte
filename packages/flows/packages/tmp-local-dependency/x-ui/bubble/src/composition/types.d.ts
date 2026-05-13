import { VNode } from 'vue';
import { DetailViewMode, TodoItemStatus, TodoWorkItem } from '../../../todo';
import { MessageContentUserAuth } from '../../../enterprise-cloud/src/types';
import { MessageContentAppPreview } from '../../../app-preview/src/types';

/** 复合气泡内、与正文同壳的按钮 /预览块（按网关块顺序追加） */
export type BubbleCompositeInlineBlock = {
    kind: 'userAuth';
    content: MessageContentUserAuth;
} | {
    kind: 'appPreview';
    content: MessageContentAppPreview;
};
/** 文本类型消息内容 */
export interface BubbleContent {
    type?: 'text';
    text: string;
    /**
     * 正文为 Markdown 时使用 FXMarkdown 渲染（与独立 markdown 消息一致）。
     * AssistantComposite 合并多段 dynamic-markdown 时应设为 `markdown`。
     */
    textFormat?: 'plain' | 'markdown';
    /** 正文与 footer 之间按序渲染的网关块（如 request-run 按钮、app-preview） */
    compositeInlineBlocks?: BubbleCompositeInlineBlock[];
    avatar?: string;
    sender?: string;
    /** 一级标题 */
    title?: string;
    /** 二级标题 */
    subtitle?: string;
    /** 思维链 */
    startedTodo?: ThoughtChainContent;
    /** 思考过程 */
    thinkingContent?: ThinkContent;
    /** 结构化维度内容 */
    structuredContent?: StructuredContent;
    /** 底部内容 */
    footerContent?: EmbeddedContent;
}
/** 消息嵌入式内容类型 */
export type EmbeddedContentType = 'page' | 'file' | 'template';
/** 消息嵌入式内容 */
export interface EmbeddedContent {
    /** 内容类型 */
    type: EmbeddedContentType;
    /** 展示外挂页面 */
    pageUrl?: string;
    /** 展示附件 */
    fileContent?: Attachment;
    /** 展示自定义模板 */
    template?: () => VNode | null;
    /** 支持固定值（如 "200px"）或百分比（如 "80%"） */
    width?: string;
    height?: number;
}
/** 结构化维度内容 */
export interface StructuredContent {
    /** 维度列表 */
    sections: BubbleSection[];
    /** 是否显示分割线 */
    showDivider?: boolean;
    /** 分割线下方区域的内容（VNode 模式） */
    footerTemplate?: (show: boolean) => VNode;
    /** 外部 HTML URL（iframe 模式），优先级高于 footerTemplate */
    footerUrl?: string;
    /** iframe 高度，仅 footerUrl 模式有效 */
    footerHeight?: number;
    /** Markdown 文件信息 */
    footerFile?: Attachment;
    /** Footer 区域宽度，支持固定值（如 "200px"）或百分比（如 "80%"） */
    footerWidth?: string;
}
/** 维度（Section） */
export interface BubbleSection {
    /** 维度标题 */
    title?: string;
    /** 标题左侧 icon 图片地址或类名 */
    icon?: string;
    /** icon 样式（内联样式） */
    iconStyle?: string;
    /** 次级项列表 */
    items?: BubbleSectionItem[];
    /** 是否显示上下分割线 */
    showDivider?: boolean;
}
/** 维度次级项 */
export interface BubbleSectionItem {
    /** 次级项标签，content为string时有效 */
    label?: string;
    /** 次级项内容（文本或单个嵌入式内容） */
    content?: string | EmbeddedContent;
}
/** 思维链 */
export interface ThoughtChainContent {
    status: TodoItemStatus;
    message: string;
    doneMessage?: string;
    todoList: TodoWorkItem[];
    detailViewMode: DetailViewMode;
    /**
     * 为 true 时保留 `todoList` 各项的 `status`（服务端快照），不强行改为 Working。
     * 用于网关 `StartedToDo` 在 FXBubble 内展示。
     */
    preserveStatuses?: boolean;
    /**
     * 为 false 时首行标题旁不展示状态圆点（`StatusIcon`）。
     * 用于 `Todo` 规划标题：`message` 仅为文案，与 `taskList` 根任务状态无关，避免 `NotStart` 被画成「未完成任务」。
     */
    showHeaderStatusIcon?: boolean;
}
/** 思维链控制 API */
export interface ThoughtChainControl {
    /** 当前思维链数据（用于渲染） */
    localStartedTodo: ThoughtChainContent | null;
    /** 思维链状态 */
    thoughtChainState: TodoItemStatus;
    /** 将思维链置为 Done 状态 */
    setThoughtChainDone: () => void;
    /** 将某个 todoWorkItem 置为 Done 状态 */
    setTodoWorkItemDone: (path: string) => void;
    /** 向 todoList 添加新的 todoWorkItem */
    addTodoWorkItems: (items: TodoWorkItem[]) => void;
    /** 向指定 todoWorkItem 添加子项 */
    addChildTodoWorkItems: (path: string, children: TodoWorkItem[]) => void;
}
/** 思考过程 */
export interface ThinkContent {
    /** 思考中状态的文本 */
    thinkingText?: string;
    /** 思考完成后的文本 */
    doneText?: string;
    /** 思考内容分段列表 */
    segments?: ThinkingSegment[];
    /**
     * 为 true 时初始即为完成态（如 `AgentThinking.streamStatus === 'end'`），用于网关快照在 FXBubble 内展示。
     */
    completed?: boolean;
}
/** 思考内容分段 */
export interface ThinkingSegment {
    /** 分段标题 */
    title?: string;
    /** 分段内容 */
    content: string;
}
export type ThinkState = 'pending' | 'completed';
/** 思考过程控制 API */
export interface ThinkControl {
    /** 当前思考过程内容 */
    localThinkContent: ThinkContent | null;
    /** 思考过程状态 */
    state: ThinkState;
    /** 添加思考过程内容分段 */
    addSegments: (segments: ThinkingSegment[]) => void;
    /** 将思考过程状态置为完成 */
    completeThink: () => void;
}
/** 附件信息 */
export interface Attachment {
    /** 附件类型，如 'pdf', 'doc', 'xls', 'ppt', 'txt', 'md' 等 */
    type: string;
    /** 附件名称 */
    name: string;
    /** 附件大小，单位字节 */
    size?: number;
    /** 预览附件，可外挂页面展示自定义内容 */
    url?: string;
    /** 附件为md文件时，支持预览 */
    content?: string;
    /** 是否显示预览按钮 */
    showPreview?: boolean;
}
export type AppearanceType = "root" | "header" | "content" | "footer";

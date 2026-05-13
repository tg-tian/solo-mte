import { ExtractPropTypes, PropType, VNode } from 'vue';
import { MessageContent } from './composition/types';

export type { MessageContent } from './composition/types';
export type { MessageContentTodo, TodoWorkItem, TodoItemStatus, MessageContentStartedToDo, MessageContentCoding, CodingCode, MessageContentAppPreview, PreviewConfig, MessageContentMarkdown } from '@farris/x-ui';
/** 消息类型 */
export type Message = {
    id: string;
    name: string;
    role: 'user' | 'assistant';
    /** 消息内容：字符串视为 { type: 'text', text }，对象需含 type（缺省 text） */
    content: string | MessageContent;
    timestamp: number;
    agentId: string;
};
/** 内置技能详情 */
export interface AgentBuiltinSkill {
    name: string;
    tag?: string;
    description: string;
    icon?: string;
}
/** 智能体类型 */
export interface ChatAgent {
    id: string;
    name: string;
    skills: string[];
    /** 专家职称/角色 */
    title?: string;
    /** 专家所属分类 */
    category?: string;
    /** 专家简介 */
    description?: string;
    /** 头像 URL */
    avatar?: string;
    /** 浏览次数 */
    views?: number;
    /** 点赞次数 */
    likes?: number;
    /** 派生次数 */
    forkCount?: number;
    /** 创建者 */
    creator?: string;
    /** 创建日期 */
    createdDate?: string;
    /** 详细能力说明 / 系统提示词 */
    systemPrompt?: string;
    /** 内置技能详情 */
    builtinSkills?: AgentBuiltinSkill[];
    icon?: string;
}
/** 对话类型（页签模式） */
export interface ConversationData {
    id: string;
    title: string;
    /** 已显示在界面上的消息 */
    messages: Message[];
    /** 待显示队列；发送时将队首移入 messages */
    pendingMessages: Message[];
}
/** 历史对话项类型 */
export interface HistoryItem {
    id?: string;
    title: string;
    timestamp: number;
    icon?: string;
    onClick?: () => void;
}
/** 导航动作项类型 */
export interface NavActionItem {
    id: number | string;
    icon: string;
    label: string;
    fixed?: boolean;
    onClick?: () => void;
}
/** 插槽填词配置 */
export interface SlotConfig {
    type: 'text' | 'input' | 'select';
    key?: string;
    value?: string;
    props?: {
        label?: string;
        onlyShowLabel?: boolean;
        defaultValue: string;
        currentValue?: string;
        options?: string[];
        placeholder?: string;
        width?: number;
        formatResult?: (value: string[]) => VNode;
    };
}
/** 辅助工具类型 */
export interface AssistiveTool {
    id: number | string;
    /** 图片 URL 或相对路径，或图标 CSS class（如 `f-icon f-icon-image`） */
    icon: string;
    label: string;
    configs: SlotConfig[];
}
/** 判断 assistiveTools[].icon 是否为图片资源路径或 URL（与 CSS class 字符串区分，避免误请求 404） */
export declare function isAssistiveToolIconImageSource(icon: string): boolean;
export declare const conversationProps: {
    /** 面板位置：left | right | center */
    chatPanePosition: {
        type: () => "left" | "right" | "center";
        default: string;
    };
    /** 单个对话数据（由外层 WorkbenchContent 传入） */
    conversation: {
        type: PropType<ConversationData>;
        default: undefined;
    };
    /** 智能体成员列表（由外部传入） */
    agents: {
        type: PropType<ChatAgent[]>;
        default: () => never[];
    };
    /** 技能选项（由外部传入，默认空数组） */
    skillOptions: {
        type: PropType<string[]>;
        default: () => never[];
    };
    /** 紧凑模式宽度阈值，小于此值进入紧凑模式 */
    compactModeThreshold: {
        type: NumberConstructor;
        default: number;
    };
    /** 左侧导航栏是否默认收起 */
    navPaneCollapsed: {
        type: BooleanConstructor;
        default: boolean;
    };
    /** 进入对话模式时是否默认显示预览区域 */
    defaultShowPreview: {
        type: BooleanConstructor;
        default: boolean;
    };
    /** 预览相关配置（缺省配置，当无 AppPreview 消息选中时使用） */
    previewConfig: {
        type: PropType<import('@farris/x-ui/components/app-preview').PreviewConfig>;
        default: () => {};
    };
    assistiveTools: {
        type: PropType<AssistiveTool[]>;
        default: () => never[];
    };
    /** 当前智能体ID */
    currentAgentId: {
        type: PropType<string | null>;
        default: null;
    };
    /** 当前话题ID */
    currentTopicId: {
        type: PropType<string | null>;
        default: null;
    };
    /** 当前会话ID */
    currentSessionId: {
        type: PropType<string | null>;
        default: null;
    };
    /**
     * 文件上传回调
     * @param file 待上传的文件对象
     * @param onProgress 上传进度回调（0-100）
     */
    onFileUpload: {
        type: PropType<(file: File, onProgress?: (progress: number) => void) => Promise<void>>;
        default: undefined;
    };
};
export type ConversationProps = ExtractPropTypes<typeof conversationProps>;

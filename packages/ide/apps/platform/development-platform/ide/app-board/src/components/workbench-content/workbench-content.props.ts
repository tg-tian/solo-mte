import type { ExtractPropTypes, PropType } from "vue";

export type ContentItemType = 'conversation' | 'page';

export interface WorkbenchContentItem {
    id: string;
    title: string;
    type: ContentItemType;
    /** conversation 类型时为 ConversationData；page 类型时为页面自定义数据 */
    data: any;
}

export const workbenchContentProps = {
    items: {
        type: Array as PropType<WorkbenchContentItem[]>,
        default: () => [],
    },
    activeItemId: {
        type: String as PropType<string | null>,
        default: null,
    },
    chatTitle: {
        type: String,
        default: 'Hi，开启一天的工作吧~',
    },
    chatSubtitle: {
        type: String,
        default: '',
    },
    agents: {
        type: Array as PropType<any[]>,
        default: () => [],
    },
    assistiveTools: {
        type: Array as PropType<any[]>,
        default: () => [],
    },
    skillOptions: {
        type: Array as PropType<string[]>,
        default: () => [],
    },
    navPaneCollapsed: {
        type: Boolean,
        default: false,
    },
    agentHubOpen: {
        type: Boolean,
        default: false,
    },
    currentAgentId: {
        type: String as PropType<string | null>,
        default: null,
    },
};

export type WorkbenchContentProps = ExtractPropTypes<typeof workbenchContentProps>;

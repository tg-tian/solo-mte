import type { ExtractPropTypes, PropType } from "vue";

export interface NavPanelUserInfo {
    avatar?: string;
    name: string;
}

export const navPanelProps = {
    navTitle: {
        type: String,
        default: "海岳企业AI",
    },
    navActions: {
        type: Array as PropType<any[]>,
        default: () => [] as any[],
    },
    agents: {
        type: Array as PropType<any[]>,
        default: () => [] as any[],
    },
    historyItems: {
        type: Array as PropType<any[]>,
        default: () => [] as any[],
    },
    historyGroups: {
        type: Array as PropType<any[]>,
        default: () => [] as any[],
    },
    searchPlaceholder: {
        type: String,
        default: "搜索 (⌘+F)",
    },
    userInfo: {
        type: Object as PropType<NavPanelUserInfo | null>,
        default: null,
    },
    showCollapse: {
        type: Boolean,
        default: true,
    },
    primaryActionId: {
        type: [String, Number] as PropType<string | number | null>,
        default: null,
    },
    activeNavId: {
        type: [String, Number] as PropType<string | number | null>,
        default: null,
    },
    collapsed: {
        type: Boolean,
        default: false,
    },
    navWidth: {
        type: Number,
        default: 260,
    },
    onNavigate: {
        type: Function as PropType<(id: string) => void>,
        default: null,
    },
};

export type NavPanelProps = ExtractPropTypes<typeof navPanelProps>;

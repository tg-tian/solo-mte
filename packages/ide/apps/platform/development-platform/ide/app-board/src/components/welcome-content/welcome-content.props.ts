import type { ExtractPropTypes, PropType } from "vue";
import type { ChatAgent, AssistiveTool } from "@farris/x-conversation";

export const welcomeContentProps = {
    chatTitle: {
        type: String,
        default: 'Hi，开启一天的工作吧~',
    },
    chatSubtitle: {
        type: String,
        default: '',
    },
    agents: {
        type: Array as PropType<ChatAgent[]>,
        default: () => [],
    },
    assistiveTools: {
        type: Array as PropType<AssistiveTool[]>,
        default: () => [],
    },
    skillOptions: {
        type: Array as PropType<string[]>,
        default: () => [],
    },
    currentAgentId: {
        type: String as PropType<string | null>,
        default: null,
    },
};

export type WelcomeContentProps = ExtractPropTypes<typeof welcomeContentProps>;

import { ChatAgent, AssistiveTool } from './conversation.props';
import { PreviewConfig } from '@farris/x-ui';

declare const _default: import('vue').DefineComponent<{
    previewConfig: PreviewConfig;
    chatPanePosition: "left" | "right" | "center";
    agents: ChatAgent[];
    skillOptions: string[];
    compactModeThreshold: number;
    navPaneCollapsed: boolean;
    defaultShowPreview: boolean;
    assistiveTools: AssistiveTool[];
    currentAgentId: string | null;
    currentTopicId: string | null;
    currentSessionId: string | null;
    conversation?: import('./conversation.props').ConversationData | undefined;
    onFileUpload?: ((file: File, onProgress?: (progress: number) => void) => Promise<void>) | undefined;
}, () => import("vue/jsx-runtime").JSX.Element, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, ("sendMessage" | "userAuthConfirm" | "collapseNav" | "expandNav" | "compactModeChange")[], "sendMessage" | "userAuthConfirm" | "collapseNav" | "expandNav" | "compactModeChange", import('vue').PublicProps, Readonly<{
    previewConfig: PreviewConfig;
    chatPanePosition: "left" | "right" | "center";
    agents: ChatAgent[];
    skillOptions: string[];
    compactModeThreshold: number;
    navPaneCollapsed: boolean;
    defaultShowPreview: boolean;
    assistiveTools: AssistiveTool[];
    currentAgentId: string | null;
    currentTopicId: string | null;
    currentSessionId: string | null;
    conversation?: import('./conversation.props').ConversationData | undefined;
    onFileUpload?: ((file: File, onProgress?: (progress: number) => void) => Promise<void>) | undefined;
}> & Readonly<{
    onUserAuthConfirm?: ((...args: any[]) => any) | undefined;
    onSendMessage?: ((...args: any[]) => any) | undefined;
    onCollapseNav?: ((...args: any[]) => any) | undefined;
    onExpandNav?: ((...args: any[]) => any) | undefined;
    onCompactModeChange?: ((...args: any[]) => any) | undefined;
}>, {
    previewConfig: PreviewConfig;
    chatPanePosition: "left" | "right" | "center";
    conversation: import('./conversation.props').ConversationData;
    agents: ChatAgent[];
    skillOptions: string[];
    compactModeThreshold: number;
    navPaneCollapsed: boolean;
    defaultShowPreview: boolean;
    assistiveTools: AssistiveTool[];
    currentAgentId: string | null;
    currentTopicId: string | null;
    currentSessionId: string | null;
    onFileUpload: (file: File, onProgress?: (progress: number) => void) => Promise<void>;
}, {}, {}, {}, string, import('vue').ComponentProvideOptions, true, {}, any>;
export default _default;

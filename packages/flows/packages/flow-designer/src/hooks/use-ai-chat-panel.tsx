import { ref } from "vue";
import type { JSX } from "vue/jsx-runtime";
import { FXConversation } from '@farris/x-conversation';
import type { ConversationData, Message } from '@farris/x-conversation';
import type { MessageContentUserAuth, MessageContentAgentThinking } from '@farris/x-ui';
import { useVueFlow } from '@vue-flow/core';
import { uuid } from '@farris/flow-devkit';
import type { FlowMetadata } from '@farris/flow-devkit';
import type { SimplifiedFlowData } from './simplified-flow-data-types';
import { useVueFlowDataConverter } from './use-vue-flow-data-converter';
import { useSimplifiedFlowDataConverter } from './use-simplified-flow-data-converter';
import { useFlowGenerator } from './use-flow-generator';
import type { UserAuthConfirmEvent } from '@flow-designer/types';
import '@farris/x-ui/index.css';
import '@farris/x-conversation/index.css';
import css from './ai-chat-panel.module.scss';

interface UseAiChatPanel {
    openAiChatPanel: () => void;
    closeAiChatPanel: () => void;
    renderAiChatPanel: () => JSX.Element;
}

let aiChatPanelInstance: UseAiChatPanel;

export function useAiChatPanel(afterReloadFlow?: (() => void)): UseAiChatPanel {
    if (aiChatPanelInstance) {
        return aiChatPanelInstance;
    }

    const showAiChatPanel = ref(false);

    const conversationData = ref<ConversationData>({
        id: 'ai-chat-flow',
        title: 'AI 助手',
        messages: [],
        pendingMessages: [],
    });

    /** 待用户确认后应用的流程数据 */
    const pendingFlowData = ref<SimplifiedFlowData | null>(null);

    /** 正在等待接口返回时的消息 ID，用于替换而非追加新消息 */
    const loadingMessageId = ref<string | null>(null);

    const { setNodes, setEdges } = useVueFlow();
    const { convertFlowMetadata2VueFlowData } = useVueFlowDataConverter();
    const { convertSimplifiedToOriginal } = useSimplifiedFlowDataConverter();
    const { generateFlow } = useFlowGenerator();

    function openAiChatPanel() {
        showAiChatPanel.value = true;
    }

    function closeAiChatPanel() {
        showAiChatPanel.value = false;
    }

    /**
     * 将简化版流程数据应用到设计器画布
     */
    function applySimplifiedFlowData(simplifiedData: SimplifiedFlowData) {
        const { nodes, edges } = convertSimplifiedToOriginal(simplifiedData);
        const flowMetadata: FlowMetadata = {
            id: uuid(),
            kind: 'eventflow',
            code: '',
            name: '',
            description: '',
            version: '',
            nodes,
            edges,
            extension: {},
        };
        const vueFlowData = convertFlowMetadata2VueFlowData(flowMetadata);
        setNodes(vueFlowData.nodes);
        setEdges(vueFlowData.edges);
        afterReloadFlow?.();
    }

    /**
     * 处理用户点击"应用"按钮
     */
    function handleUserAuthConfirm(event: UserAuthConfirmEvent) {
        if (event.optionId === 'apply' && pendingFlowData.value) {
            applySimplifiedFlowData(pendingFlowData.value);
            pendingFlowData.value = null;

            const confirmMessage: Message = {
                id: `agent-${Date.now()}`,
                name: 'AI 助手',
                role: 'assistant',
                content: '已应用',
                timestamp: Date.now(),
                agentId: '',
            };
            conversationData.value = {
                ...conversationData.value,
                messages: [...conversationData.value.messages, confirmMessage],
            };
        }
    }

    function handleSendMessage(content: string) {
        if (!content || typeof content !== 'string' || !content.trim()) {
            return;
        }
        // 正在等待回复时，禁止再次发送
        if (loadingMessageId.value !== null) {
            return;
        }

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            name: '我',
            role: 'user',
            content,
            timestamp: Date.now(),
            agentId: '',
        };
        conversationData.value = {
            ...conversationData.value,
            messages: [...conversationData.value.messages, userMessage],
        };

        // 立即显示"思考中..."加载消息
        loadingMessageId.value = `agent-${Date.now()}`;
        const loadingMessage: Message = {
            id: loadingMessageId.value,
            name: 'AI 助手',
            role: 'assistant',
            content: {
                type: 'AgentThinking',
                streamStatus: 'start',
                text: ''
            } as MessageContentAgentThinking,
            timestamp: Date.now(),
            agentId: '',
        };
        conversationData.value = {
            ...conversationData.value,
            messages: [...conversationData.value.messages, loadingMessage],
        };

        // 调用接口生成流程
        generateFlow(content).then(({ data, description }) => {
            pendingFlowData.value = data;

            const userAuthContent: MessageContentUserAuth = {
                type: 'UserAuth',
                standardType: 'agent/request-run',
                description: description
                    ? `已生成流程：${description}，是否应用到画布？`
                    : '已生成流程，是否应用到画布？',
                options: [
                    { optionId: 'apply', name: '应用', message: '用户确认应用流程' }
                ]
            };

            // 替换加载消息为实际内容
            const updatedMessages = conversationData.value.messages.map(msg =>
                msg.id === loadingMessageId.value
                    ? { ...msg, content: userAuthContent }
                    : msg
            );
            conversationData.value = {
                ...conversationData.value,
                messages: updatedMessages,
            };
            loadingMessageId.value = null;
        }).catch((error: Error) => {
            // 替换为错误消息
            const errorMessages = conversationData.value.messages.map(msg =>
                msg.id === loadingMessageId.value
                    ? {
                        ...msg,
                        content: `生成流程失败：${error.message}` as unknown as MessageContentUserAuth
                    }
                    : msg
            );
            conversationData.value = {
                ...conversationData.value,
                messages: errorMessages,
            };
            loadingMessageId.value = null;
        });
    }

    function renderAiChatPanel() {
        if (!showAiChatPanel.value) {
            return <></>;
        }
        return (
            <div class={css['ai-chat-panel']}>
                <div class={css['ai-chat-panel-header']}>
                    <span>AI 助手</span>
                    <span class={css['close-btn']} onClick={closeAiChatPanel}>✕</span>
                </div>
                <div class={[css['ai-chat-panel-body'], 'f-chat']}>
                    <FXConversation
                        chatPanePosition="right"
                        conversation={conversationData.value}
                        onSendMessage={handleSendMessage}
                        onUserAuthConfirm={handleUserAuthConfirm}
                    />
                </div>
            </div>
        );
    }

    aiChatPanelInstance = { openAiChatPanel, closeAiChatPanel, renderAiChatPanel };
    return aiChatPanelInstance;
}
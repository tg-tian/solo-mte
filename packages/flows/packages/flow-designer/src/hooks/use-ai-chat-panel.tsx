import { ref } from "vue";
import type { JSX } from "vue/jsx-runtime";
import { FXConversation } from '@farris/x-conversation';
import type { ConversationData, Message } from '@farris/x-conversation';
import type { MessageContentUserAuth } from '@farris/x-ui';
import { useVueFlow } from '@vue-flow/core';
import { uuid } from '@farris/flow-devkit';
import type { FlowMetadata } from '@farris/flow-devkit';
import type { SimplifiedFlowData } from './simplified-flow-data-types';
import { useVueFlowDataConverter } from './use-vue-flow-data-converter';
import { useSimplifiedFlowDataConverter } from './use-simplified-flow-data-converter';
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

/** Mock 简化版流程数据，模拟大模型返回 */
const MOCK_SIMPLIFIED_FLOW_DATA: SimplifiedFlowData = {
    nodes: [
        {
            id: "event_1",
            type: "deviceEventListen",
            name: "咖啡完成事件",
            position: { x: 0, y: 260 },
            deviceModelId: "coffeeMaker",
            deviceEvent: "coffeeComplete",
            outputParams: [
                { code: "duration", type: "string" },
                { code: "start_time", type: "string" },
                { code: "coffee_type", type: "string" }
            ]
        },
        {
            id: "selector_1",
            type: "selector",
            name: "判断咖啡类型",
            position: { x: 400, y: 260 },
            branches: [
                {
                    logicOperator: "and",
                    conditions: [
                        {
                            left: { nodeId: "event_1", variablePath: "coffee_type" },
                            operator: "equal",
                            right: { literal: "Cappuccino" }
                        }
                    ],
                    port: "cappuccino"
                },
                {
                    logicOperator: null,
                    conditions: [],
                    port: "else"
                }
            ]
        },
        {
            id: "device_call_cool",
            type: "device",
            name: "空调制冷",
            position: { x: 700, y: 160 },
            deviceModelId: "AC",
            deviceId: "",
            deviceAction: "setMode",
            inputParams: [{ code: "mode", value: { literal: "cool" } }]
        },
        {
            id: "device_call_heat",
            type: "device",
            name: "空调制热",
            position: { x: 700, y: 360 },
            deviceModelId: "AC",
            deviceId: "",
            deviceAction: "setMode",
            inputParams: [{ code: "mode", value: { literal: "heat" } }]
        }
    ],
    edges: [
        { sourceNodeId: "event_1", targetNodeId: "selector_1" },
        {
            sourceNodeId: "selector_1",
            sourcePort: "cappuccino",
            targetNodeId: "device_call_cool"
        },
        {
            sourceNodeId: "selector_1",
            sourcePort: "else",
            targetNodeId: "device_call_heat"
        }
    ]
};

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

    const { setNodes, setEdges } = useVueFlow();
    const { convertFlowMetadata2VueFlowData } = useVueFlowDataConverter();
    const { convertSimplifiedToOriginal } = useSimplifiedFlowDataConverter();

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
        if (event.optionId === 'apply') {
            // 应用流程数据到画布
            applySimplifiedFlowData(MOCK_SIMPLIFIED_FLOW_DATA);

            // 追加"已应用"消息
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

        // Mock: 模拟大模型返回，询问是否应用流程
        // TODO: 替换为实际的大模型 API 调用
        setTimeout(() => {
            const userAuthContent: MessageContentUserAuth = {
                type: 'UserAuth',
                standardType: 'agent/request-run',
                description: '已根据您的描述生成流程，是否应用到画布？',
                options: [
                    { optionId: 'apply', name: '应用', message: '用户确认应用流程' }
                ]
            };
            const agentMessage: Message = {
                id: `agent-${Date.now()}`,
                name: 'AI 助手',
                role: 'assistant',
                content: userAuthContent,
                timestamp: Date.now(),
                agentId: '',
            };
            conversationData.value = {
                ...conversationData.value,
                messages: [...conversationData.value.messages, agentMessage],
            };
        }, 1000);
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

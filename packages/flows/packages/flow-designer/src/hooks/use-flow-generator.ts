import axios from 'axios';
import type { SimplifiedFlowData } from './simplified-flow-data-types';

/** 调试开关：true 使用 mock 数据，false 调用真实接口 */
const USE_MOCK = false;

const FLOW_API_URL = 'http://101.201.65.66:8081/api/v1/workflow/generate';

export interface FlowGeneratorResult {
    data: SimplifiedFlowData;
    description: string;
}

export interface UseFlowGenerator {
    generateFlow: (query: string) => Promise<FlowGeneratorResult>;
}

let flowGeneratorInstance: UseFlowGenerator | null = null;

/** Mock 数据：咖啡机事件流程 */
const MOCK_COFFEE_FLOW_DATA: SimplifiedFlowData = {
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

/**
 * 根据用户输入返回对应的 mock 流程数据
 */
function getMockFlowData(query: string): FlowGeneratorResult {
    return {
        data: MOCK_COFFEE_FLOW_DATA,
        description: '咖啡机事件流程：监听咖啡完成事件，根据咖啡类型判断是卡布奇诺还是其他，决定空调制冷或制热。'
    };
}

/**
 * 调用后端接口生成流程
 */
async function callRealApi(query: string): Promise<FlowGeneratorResult> {
    const response = await axios.post(FLOW_API_URL, { query });
    if (response.data.code === 200) {
        return {
            data: JSON.parse(response.data.data),
            description: response.data.description || '',
        };
    }
    throw new Error(response.data.message || '生成流程失败');
}

/**
 * 流程生成 hook
 * - USE_MOCK = true: 使用本地 mock 数据，方便调试
 * - USE_MOCK = false: 调用真实后端接口
 */
export function useFlowGenerator(): UseFlowGenerator {
    if (flowGeneratorInstance) {
        return flowGeneratorInstance;
    }

    async function generateFlow(query: string): Promise<FlowGeneratorResult> {
        if (USE_MOCK) {
            // 模拟网络延迟
            await new Promise(resolve => setTimeout(resolve, 3000));
            return getMockFlowData(query);
        }
        return callRealApi(query);
    }

    flowGeneratorInstance = { generateFlow };
    return flowGeneratorInstance;
}

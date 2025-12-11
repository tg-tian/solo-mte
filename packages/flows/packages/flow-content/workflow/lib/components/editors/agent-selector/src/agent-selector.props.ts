import type { PropType, ExtractPropTypes } from 'vue';
import { createPropsResolver } from '@farris/ui-vue';
import agentSelectorSchema from './schema/agent-selector.schema.json';
import type { NodeData } from '@farris/flow-devkit';

export interface AgentInfo {
    agentId: string;
    agentName: string;
}

export const agentSelectorProps = {
    /** 绑定值，智能体ID数组 */
    modelValue: {
        type: Array as PropType<Array<AgentInfo>>,
        default: () => []
    },
    /** 节点数据 */
    nodeData: {
        type: Object as PropType<NodeData>,
        required: true
    }
} as const;

export type AgentSelectorProps = ExtractPropTypes<typeof agentSelectorProps>;

export const propsResolver = createPropsResolver(agentSelectorProps, agentSelectorSchema);
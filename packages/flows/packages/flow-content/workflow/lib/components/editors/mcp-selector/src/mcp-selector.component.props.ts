import type { PropType, ExtractPropTypes } from 'vue';
import { createPropsResolver } from '@farris/ui-vue';
import mcpSelectorSchema from './schema/mcp-selector.schema.json';
import type { NodeData } from '@farris/flow-devkit';

export const mcpSelectorProps = {
    /** 绑定值，MCP工具ID */
    modelValue: {
        type: String as PropType<string>,
        default: ''
    },
    nodeData: { type: Object as PropType<NodeData>, required: true },
} as const;

export type McpSelectorProps = ExtractPropTypes<typeof mcpSelectorProps>;

export const propsResolver = createPropsResolver(mcpSelectorProps, mcpSelectorSchema);
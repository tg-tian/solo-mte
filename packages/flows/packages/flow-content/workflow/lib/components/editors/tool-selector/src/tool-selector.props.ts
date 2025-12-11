import type { PropType, ExtractPropTypes } from 'vue';
import { createPropsResolver } from '@farris/ui-vue';
import toolSelectorSchema from './schema/tool-selector.schema.json';
import type { NodeData } from '@farris/flow-devkit';

export interface ToolParam {
    toolId: string;
    toolName: string;
}

export const toolSelectorProps = {
    /** 绑定值，工具ID */
    modelValue: {
        type: String as PropType<string>,
        default: ''
    },
  nodeData: { type: Object as PropType<NodeData>, required: true },
} as const;

export type ToolSelectorProps = ExtractPropTypes<typeof toolSelectorProps>;

export const propsResolver = createPropsResolver(toolSelectorProps, toolSelectorSchema);

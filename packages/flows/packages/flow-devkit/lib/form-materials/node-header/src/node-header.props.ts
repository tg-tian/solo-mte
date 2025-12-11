import type { PropType, ExtractPropTypes } from 'vue';
import { createPropsResolver } from '@farris/ui-vue';
import nodeHeaderSchema from './schema/node-header.schema.json';
import type { NodeData } from '@farris/flow-devkit/types';

export const nodeHeaderProps = {

    /** 绑定值，节点名称 */
    modelValue: { type: String },

    /** 节点数据 */
    nodeData: { type: Object as PropType<NodeData>, required: true },
};

export type NodeHeaderProps = ExtractPropTypes<typeof nodeHeaderProps>;

export const propsResolver = createPropsResolver(nodeHeaderProps, nodeHeaderSchema);

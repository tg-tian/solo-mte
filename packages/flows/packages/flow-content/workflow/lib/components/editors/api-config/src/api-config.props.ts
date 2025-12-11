import type { PropType, ExtractPropTypes } from 'vue';
import { createPropsResolver } from '@farris/ui-vue';
import apiConfigSchema from './schema/api-config.schema.json';
import type { NodeData } from '@farris/flow-devkit';

export const apiConfigProps = {

    /** 绑定值，API配置 */
    modelValue: { type: Object as PropType<any> },

    /** 节点数据 */
    nodeData: { type: Object as PropType<NodeData>, required: true },
};

export type ApiConfigProps = ExtractPropTypes<typeof apiConfigProps>;

export const propsResolver = createPropsResolver(apiConfigProps, apiConfigSchema);
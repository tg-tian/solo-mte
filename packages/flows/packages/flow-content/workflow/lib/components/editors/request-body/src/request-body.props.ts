import { type PropType, type ExtractPropTypes } from 'vue';
import { createPropsResolver } from '@farris/ui-vue';
import type { NodeData } from '@farris/flow-devkit';
import requestBodySchema from './schema/request-body.schema.json';

export const requestBodyProps = {

    /** 绑定值，请求体内容 */
    modelValue: {
        type: [Array, Object, String] as PropType<any>,
        default: null
    },

    /** 节点数据 */
    nodeData: { type: Object as PropType<any>, required: true },
};

export type RequestBodyProps = ExtractPropTypes<typeof requestBodyProps>;

export const propsResolver = createPropsResolver(requestBodyProps, requestBodySchema);

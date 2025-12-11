import type { PropType, ExtractPropTypes } from 'vue';
import { createPropsResolver } from '@farris/ui-vue';
import requestParamsSchema from './schema/request-params.schema.json';
import type { Parameter } from '@farris/flow-devkit';

export const requestParamsProps = {

    /** 绑定值，参数列表 */
    modelValue: { type: Array as PropType<Parameter[]> },

    /** 节点数据 */
    nodeData: { type: Object as PropType<any> },
};

export type RequestParamsProps = ExtractPropTypes<typeof requestParamsProps>;

export const propsResolver = createPropsResolver(requestParamsProps, requestParamsSchema);

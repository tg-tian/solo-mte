import type { PropType, ExtractPropTypes } from 'vue';
import { createPropsResolver } from '@farris/ui-vue';
import httpParamsSchema from './schema/http-params.schema.json';
import type { HttpParameter } from './types';

export const httpParamsProps = {

    /** 绑定值，参数列表 */
    modelValue: { type: Array as PropType<HttpParameter[]> },

    /** 节点数据 */
    nodeData: { type: Object as PropType<any>, required: true },

    /** 目标字段名，用于区分操作restFulService中的哪个属性 */
    targetField: { type: String as PropType<string>, required: true, default: 'params' },
};

export type HttpParamsProps = ExtractPropTypes<typeof httpParamsProps>;

export const propsResolver = createPropsResolver(httpParamsProps, httpParamsSchema);

import type { PropType, ExtractPropTypes } from 'vue';
import { createPropsResolver } from '@farris/ui-vue';
import inputParamsSchema from './schema/input-params.schema.json';
import type { Parameter, TypeRefer, ParamValidateOptions, ParamOperationOptions } from '@farris/flow-devkit/types';

export const inputParamsProps = {

    /** 绑定值，参数列表 */
    modelValue: { type: Array as PropType<Parameter[]> },

    /**
     * 是否固定结构
     * @description 如果启用，则参数名和参数类型只读，无法新增或删除参数
     */
    isFixedSchema: { type: Boolean, default: false },

    /** 类型过滤器函数 - 用于过滤可选的节点参数类型 */
    typeFilter: { type: Function as PropType<(paramType: TypeRefer) => boolean> },

    /** 参数名的列标题 */
    paramCodeColumnTitle: { type: String },

    /** 类型的列标题 */
    paramTypeColumnTitle: { type: String },

    /** 参数值的列标题 */
    paramValueColumnTitle: { type: String },

    /** 校验选项 */
    validateOptions: { type: Object as PropType<ParamValidateOptions> },

    /** 操作控制选项 */
    operationOptions: { type: Object as PropType<ParamOperationOptions> },
};

export type InputParamsProps = ExtractPropTypes<typeof inputParamsProps>;

export const propsResolver = createPropsResolver(inputParamsProps, inputParamsSchema);

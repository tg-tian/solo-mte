import type { PropType, ExtractPropTypes, Ref } from 'vue';
import { createPropsResolver } from '@farris/ui-vue';
import valueExpressionInputSchema from './schema/value-expression-input.schema.json';
import type { ValueExpress, TypeRefer, ParamValueValidateOptions } from '@farris/flow-devkit/types';
import { type NodeVariables } from '@farris/flow-devkit/composition';

export const VALUE_EXPRESSION_INPUT_NAME = 'FvfValueExpressionInput';

export const valueExpressionInputProps = {

    /** 参数值 */
    modelValue: {
        type: [Object, String] as PropType<ValueExpress | string>,
        default: undefined
    },

    /** 参数类型 */
    paramType: { type: Object as PropType<TypeRefer> },

    /** 占位文本 */
    placeholder: { type: String },

    /** 仅允许选择变量或表达式 */
    onlyAllowVariable: { type: Boolean, default: false },

    /** 仅允许选择可写入的变量 */
    onlyAllowWritableVariable: { type: Boolean, default: false },

    /** 仅允许选择或输入数组类型 */
    onlyAllowArrayType: { type: Boolean, default: false },

    /** 类型过滤器函数 - 用于过滤可选的节点参数类型 */
    typeFilter: { type: Function as PropType<(paramType: TypeRefer) => boolean> },

    /** 校验选项 */
    validateOptions: { type: Object as PropType<ParamValueValidateOptions> },

    nodeVariables: { type: Object as PropType<Ref<NodeVariables[]>> },
    writableNodeVariables: { type: Object as PropType<Ref<NodeVariables[]>> },
};

export type ValueExpressionInputProps = ExtractPropTypes<typeof valueExpressionInputProps>;

export const propsResolver = createPropsResolver(valueExpressionInputProps, valueExpressionInputSchema);

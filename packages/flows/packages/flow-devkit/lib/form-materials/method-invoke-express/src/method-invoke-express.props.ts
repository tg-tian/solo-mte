import type { ExtractPropTypes, PropType, Ref } from 'vue';
import { createPropsResolver } from '@farris/ui-vue';
import methodInvokeExpressSchema from './schema/method-invoke-express.schema.json';
import type { ValueExpress } from '@farris/flow-devkit/types';
import type { NodeVariables } from '@farris/flow-devkit/composition';

export const METHOD_INVOKE_EXPRESS_NAME = 'FvfMethodInvokeExpress';

export const methodInvokeExpressProps = {
    /** 当前值 */
    modelValue: { type: Object as PropType<ValueExpress>, default: undefined },
    /** 仅允许选择或输入数组类型 */
    onlyAllowArrayType: { type: Boolean, default: false },

    nodeVariables: { type: Object as PropType<Ref<NodeVariables[]>> },
    writableNodeVariables: { type: Object as PropType<Ref<NodeVariables[]>> },
};

export type MethodInvokeExpressProps = ExtractPropTypes<typeof methodInvokeExpressProps>;

export const propsResolver = createPropsResolver(methodInvokeExpressProps, methodInvokeExpressSchema);

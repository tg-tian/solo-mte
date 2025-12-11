import type { PropType, ExtractPropTypes } from 'vue';
import type { CompareExpr } from '@farris/flow-devkit/types';

export const conditionRowProps = {

    /** 绑定值，比较条件表达式 */
    modelValue: { type: Object as PropType<CompareExpr> },
};

export type ConditionRowProps = ExtractPropTypes<typeof conditionRowProps>;

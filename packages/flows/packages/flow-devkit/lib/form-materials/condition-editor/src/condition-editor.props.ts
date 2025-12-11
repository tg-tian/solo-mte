import type { PropType, ExtractPropTypes } from 'vue';
import type { LogicExpr } from '@farris/flow-devkit/types';

export const conditionEditorProps = {

    /** 绑定值，逻辑表达式 */
    modelValue: { type: Object as PropType<LogicExpr> },

    /** 是否显示删除按钮 */
    canDelete: { type: Boolean, default: true },
};

export type ConditionEditorProps = ExtractPropTypes<typeof conditionEditorProps>;

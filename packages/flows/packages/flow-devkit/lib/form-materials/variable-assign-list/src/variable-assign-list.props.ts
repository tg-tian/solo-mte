import type { PropType, ExtractPropTypes } from 'vue';
import type { AssignValueExpr } from '@farris/flow-devkit/types';

export const variableAssignListProps = {

    /** 变量赋值表达式的列表 */
    expresses: { type: Array as PropType<AssignValueExpr[]>, default: () => [] },
};

export type VariableAssignListProps = ExtractPropTypes<typeof variableAssignListProps>;

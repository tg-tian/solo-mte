import type { PropType, ExtractPropTypes } from 'vue';
import { createPropsResolver } from '@farris/ui-vue';
import variableAssignEditorSchema from './schema/variable-assign-editor.schema.json';
import type { AssignValueExpr } from '@farris/flow-devkit/types';

export const variableAssignEditorProps = {

    /** 绑定值，变量赋值表达式的列表 */
    modelValue: { type: Array as PropType<AssignValueExpr[]>, default: () => [] },
};

export type VariableAssignEditorProps = ExtractPropTypes<typeof variableAssignEditorProps>;

export const propsResolver = createPropsResolver(variableAssignEditorProps, variableAssignEditorSchema);

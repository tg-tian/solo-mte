import type { PropType, ExtractPropTypes } from 'vue';
import { createPropsResolver } from '@farris/ui-vue';
import branchEditorSchema from './schema/branch-editor.schema.json';
import type { SelectorBranch } from '@farris/flow-devkit/types';

export const branchEditorProps = {

    /** 绑定值，条件分支列表 */
    modelValue: { type: Array as PropType<SelectorBranch[]> },
};

export type BranchEditorProps = ExtractPropTypes<typeof branchEditorProps>;

export const propsResolver = createPropsResolver(branchEditorProps, branchEditorSchema);

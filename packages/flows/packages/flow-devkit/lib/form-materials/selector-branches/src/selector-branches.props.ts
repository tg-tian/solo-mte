import type { PropType, ExtractPropTypes } from 'vue';
import type { SelectorBranch } from '@farris/flow-devkit/types';

export const selectorBranchesProps = {

    /** 条件分支列表 */
    branches: { type: Array as PropType<SelectorBranch[]> },
};

export type SelectorBranchesProps = ExtractPropTypes<typeof selectorBranchesProps>;

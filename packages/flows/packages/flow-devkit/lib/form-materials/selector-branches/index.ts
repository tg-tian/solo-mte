import SelectorBranchesInstallless from './src/selector-branches.component';
import { withInstall } from '@farris/flow-devkit/types';
import { useCompareOperator } from './src/composition/use-compare-operator';

const SelectorBranches = withInstall(SelectorBranchesInstallless);

export {
    SelectorBranches,
    useCompareOperator,
};
export default SelectorBranches;

import BranchEditorInstallless from './src/branch-editor.component';
import { propsResolver } from './src/branch-editor.props';
import { withInstall, withRegister } from '@farris/flow-devkit/types';

const COMPONENT_NAME = 'fvf-branch-editor';

const BranchEditor = withInstall(BranchEditorInstallless);
withRegister(BranchEditor, { name: COMPONENT_NAME, propsResolver });

export { BranchEditor };
export default BranchEditor;

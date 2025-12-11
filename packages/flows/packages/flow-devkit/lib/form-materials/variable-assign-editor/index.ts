import VariableAssignEditorInstallless from './src/variable-assign-editor.component';
import { propsResolver } from './src/variable-assign-editor.props';
import { withInstall, withRegister } from '@farris/flow-devkit/types';

const COMPONENT_NAME = 'fvf-variable-assign-editor';

const VariableAssignEditor = withInstall(VariableAssignEditorInstallless);
withRegister(VariableAssignEditor, { name: COMPONENT_NAME, propsResolver });

export { VariableAssignEditor };
export default VariableAssignEditor;

import ConditionEditorInstallless from './src/condition-editor.component';
import { withInstall } from '@farris/flow-devkit/types';

const ConditionEditor = withInstall(ConditionEditorInstallless);

export { ConditionEditor };
export default ConditionEditor;

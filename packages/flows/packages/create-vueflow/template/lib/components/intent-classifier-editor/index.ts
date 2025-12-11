import IntentClassifierInstallless from './src/intent-classifier-editor.component';
import { propsResolver } from './src/intent-classifier-editor.props';
import { withInstall, withRegister } from '@farris/flow-devkit';

const INTENT_CLASSIFIER_NAME = 'demo-intent-classifier-editor';

const IntentClassifierEditor = withInstall(IntentClassifierInstallless);
withRegister(IntentClassifierEditor, { name: INTENT_CLASSIFIER_NAME, propsResolver });

export { IntentClassifierEditor };
export default IntentClassifierEditor;

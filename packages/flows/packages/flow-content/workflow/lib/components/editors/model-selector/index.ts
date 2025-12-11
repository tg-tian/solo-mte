import ModelSelectorInstallless from './src/model-selector.component';
import { propsResolver } from './src/model-selector.props';
import { withInstall, withRegister } from '@farris/flow-devkit';

const MODEL_SELECTOR_NAME = 'model-selector';

const ModelSelector = withInstall(ModelSelectorInstallless);
withRegister(ModelSelector, { name: MODEL_SELECTOR_NAME, propsResolver });

export { ModelSelector };
export default ModelSelector;

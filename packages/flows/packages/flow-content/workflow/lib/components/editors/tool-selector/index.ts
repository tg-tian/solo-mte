import ToolSelectorInstallless from './src/tool-selector.component';
import { propsResolver } from './src/tool-selector.props';
import { withInstall, withRegister } from '@farris/flow-devkit';

const COMPONENT_NAME = 'tool-selector';

const ToolSelector = withInstall(ToolSelectorInstallless);
withRegister(ToolSelector, { name: COMPONENT_NAME, propsResolver });

export { ToolSelector };
export default ToolSelector;
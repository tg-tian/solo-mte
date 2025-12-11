import McpSelectorInstallless from './src/mcp-selector.component';
import { propsResolver } from './src/mcp-selector.component.props';
import { withInstall, withRegister } from '@farris/flow-devkit';

const COMPONENT_NAME = 'mcp-selector';

const McpSelector = withInstall(McpSelectorInstallless);
withRegister(McpSelector, { name: COMPONENT_NAME, propsResolver });

export { McpSelector };
export default McpSelector;

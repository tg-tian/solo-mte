import AgentSelectorInstallless from './src/agent-selector.component';
import { propsResolver } from './src/agent-selector.props';
import { withInstall, withRegister } from '@farris/flow-devkit';

const COMPONENT_NAME = 'agent-selector';

const AgentSelector = withInstall(AgentSelectorInstallless);
withRegister(AgentSelector, { name: COMPONENT_NAME, propsResolver });

export { AgentSelector };
export default AgentSelector;
import RpcSelectorInstallless from './src/rpc-selector.component';
import { propsResolver } from './src/rpc-selector.props';
import { withInstall, withRegister } from '@farris/flow-devkit';

const COMPONENT_NAME = 'rpc-selector';

const RpcSelector = withInstall(RpcSelectorInstallless);
withRegister(RpcSelector, { name: COMPONENT_NAME, propsResolver });

export { RpcSelector };
export default RpcSelector;
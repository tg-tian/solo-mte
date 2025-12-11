import RpcSelectorInstallless from './rpc-selector.component';
import { propsResolver } from './rpc-selector.props';
import { withInstall, withRegister } from '@farris/flow-devkit';

const RPC_SELECTOR_NAME = 'rpc-selector';

const RpcSelector = withInstall(RpcSelectorInstallless);
withRegister(RpcSelector, { name: RPC_SELECTOR_NAME, propsResolver });

export { RpcSelector };
export default RpcSelector;
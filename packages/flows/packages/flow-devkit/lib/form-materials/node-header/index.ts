import NodeHeaderInstallless from './src/node-header.component';
import { propsResolver } from './src/node-header.props';
import { withInstall, withRegister } from '@farris/flow-devkit/types';

const NODE_HEADER_NAME = 'fvf-node-header';

const NodeHeader = withInstall(NodeHeaderInstallless);
withRegister(NodeHeader, { name: NODE_HEADER_NAME, propsResolver });

export { NodeHeader };
export default NodeHeader;

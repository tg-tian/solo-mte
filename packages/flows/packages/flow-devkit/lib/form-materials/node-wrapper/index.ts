import NodeWrapperInstallless from './src/node-wrapper.component';
import { withInstall } from '@farris/flow-devkit/types';

const NodeWrapper = withInstall(NodeWrapperInstallless);

export { NodeWrapper };
export default NodeWrapper;

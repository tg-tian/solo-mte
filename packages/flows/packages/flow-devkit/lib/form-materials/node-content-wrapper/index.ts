import NodeContentWrapperInstallless from './src/node-content-wrapper.component';
import { withInstall } from '@farris/flow-devkit/types';

const NodeContentWrapper = withInstall(NodeContentWrapperInstallless);

export { NodeContentWrapper };
export default NodeContentWrapper;

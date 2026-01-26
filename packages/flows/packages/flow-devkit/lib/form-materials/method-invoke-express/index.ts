import MethodInvokeExpressInstallless from './src/method-invoke-express.component';
import { withInstall, withRegister } from '@farris/flow-devkit/types';
import { propsResolver } from './src/method-invoke-express.props';

const COMPONENT_NAME = 'fvf-method-invoke-express';

const MethodInvokeExpress = withInstall(MethodInvokeExpressInstallless);
withRegister(MethodInvokeExpress, { name: COMPONENT_NAME, propsResolver });

export {
    MethodInvokeExpress,
};
export default MethodInvokeExpress;

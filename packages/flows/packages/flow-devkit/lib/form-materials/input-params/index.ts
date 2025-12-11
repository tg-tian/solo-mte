import InputParamsInstallless from './src/input-params.component';
import { propsResolver } from './src/input-params.props';
import { withInstall, withRegister } from '@farris/flow-devkit/types';

const COMPONENT_NAME = 'fvf-input-params';

const InputParams = withInstall(InputParamsInstallless);
withRegister(InputParams, { name: COMPONENT_NAME, propsResolver });

export { InputParams };
export default InputParams;

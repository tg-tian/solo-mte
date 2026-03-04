import ExpressInputParamsInstallless from './src/express-input-params.component.tsx';
import { propsResolver } from './src/express-input-params.props.ts';
import { withInstall, withRegister } from '@farris/flow-devkit';

const COMPONENT_NAME = 'express-input-params';

const ExpressInputParams = withInstall(ExpressInputParamsInstallless);
withRegister(ExpressInputParams, { name: COMPONENT_NAME, propsResolver });

export { ExpressInputParams };
export default ExpressInputParams;

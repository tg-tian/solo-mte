import RequestParamsInstallless from './src/request-params.component';
import { propsResolver } from './src/request-params.props';
import { withInstall, withRegister } from '@farris/flow-devkit';

const REQUEST_PARAMS_NAME = 'request-params';

const RequestParams = withInstall(RequestParamsInstallless);
withRegister(RequestParams, { name: REQUEST_PARAMS_NAME, propsResolver });

export { RequestParams };
export default RequestParams;

import HttpParamsInstallless from './src/http-params.component';
import { propsResolver } from './src/http-params.props';
import { withInstall, withRegister } from '@farris/flow-devkit';

const HTTP_PARAMS_NAME = 'http-params';

const HttpParams = withInstall(HttpParamsInstallless);
withRegister(HttpParams, { name: HTTP_PARAMS_NAME, propsResolver });

export { HttpParams };
export default HttpParams;
import ApiConfigInstallless from './src/api-config.component';
import { propsResolver } from './src/api-config.props';
import { withInstall, withRegister } from '@farris/flow-devkit';

const API_CONFIG_NAME = 'api-config';

const ApiConfig = withInstall(ApiConfigInstallless);
withRegister(ApiConfig, { name: API_CONFIG_NAME, propsResolver });

export { ApiConfig };
export default ApiConfig;
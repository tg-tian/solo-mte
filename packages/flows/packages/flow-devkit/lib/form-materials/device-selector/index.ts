import DeviceSelectorInstallless from './src/device-selector.component';
import { propsResolver } from './src/device-selector.props';
import { withInstall, withRegister } from '@farris/flow-devkit/types';

const DEVICE_SELECTOR_NAME = 'fvf-device-selector';

const DeviceSelector = withInstall(DeviceSelectorInstallless);
withRegister(DeviceSelector, { name: DEVICE_SELECTOR_NAME, propsResolver });

export { DeviceSelector };
export default DeviceSelector;

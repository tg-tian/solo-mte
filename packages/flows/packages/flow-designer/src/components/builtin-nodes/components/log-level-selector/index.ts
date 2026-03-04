import LogLevelSelectorInstallless from './src/log-level-selector.tsx';
import { propsResolver } from './src/log-level-selector.props.ts';
import { withInstall, withRegister } from '@farris/flow-devkit';

const LEVEL_SELECTOR_NAME = 'log-level-selector';

const LogLevelSelector = withInstall(LogLevelSelectorInstallless);
withRegister(LogLevelSelector, { name: LEVEL_SELECTOR_NAME, propsResolver });

export { LogLevelSelector };
export default LogLevelSelector;

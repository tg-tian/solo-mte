import ExceptionLevelSelectorInstallless from './src/exception-level-selector.tsx';
import { propsResolver } from './src/exception-level-selector.props.ts';
import { withInstall, withRegister } from '@farris/flow-devkit';

const LEVEL_SELECTOR_NAME = 'exception-level-selector';

const ExceptionLevelSelector = withInstall(ExceptionLevelSelectorInstallless);
withRegister(ExceptionLevelSelector, { name: LEVEL_SELECTOR_NAME, propsResolver });

export { ExceptionLevelSelector };
export default ExceptionLevelSelector;

import { registerCustomComponents } from '@farris/flow-devkit'
import { LogLevelSelector } from './log-level-selector'
import { ExceptionLevelSelector } from './exception-level-selector'
import { ExpressInputParams } from './express-input-params'

/**
 * @description
 * 对于需要在属性面板中作为属性编辑器使用的组件，需要在此处注册
 */
registerCustomComponents([
  LogLevelSelector,
  ExceptionLevelSelector,
  ExpressInputParams
]);

export {
  LogLevelSelector,
  ExceptionLevelSelector,
  ExpressInputParams
};

export * from './log-level-selector';
export * from './exception-level-selector';
export * from './express-input-params';

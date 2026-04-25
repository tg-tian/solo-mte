import { Plugin } from 'vue';
import { default as FXWelcome } from './src/welcome.component';

export * from './src/welcome.props';
export { FXWelcome };
declare const _default: typeof FXWelcome & Plugin;
export default _default;

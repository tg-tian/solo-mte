import { Plugin } from 'vue';
import { default as FXCoding } from './src/coding.component';

export * from './src/coding.props';
export * from './src/types';
export { FXCoding };
declare const _default: typeof FXCoding & Plugin;
export default _default;

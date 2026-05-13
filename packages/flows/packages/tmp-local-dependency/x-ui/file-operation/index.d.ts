import { Plugin } from 'vue';
import { default as FXFileOperation } from './src/file-operation.component';

export * from './src/file-operation.props';
export * from './src/types';
export { FXFileOperation };
declare const _default: typeof FXFileOperation & Plugin;
export default _default;

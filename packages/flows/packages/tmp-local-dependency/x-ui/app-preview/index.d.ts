import { Plugin } from 'vue';
import { default as FXAppPreview } from './src/app-preview.component';

export * from './src/app-preview.props';
export * from './src/types';
export { FXAppPreview };
declare const _default: typeof FXAppPreview & Plugin;
export default _default;

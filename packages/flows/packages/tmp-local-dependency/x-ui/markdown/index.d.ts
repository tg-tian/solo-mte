import { Plugin } from 'vue';
import { default as FXMarkdown } from './src/markdown.component';

export * from './src/markdown.props';
export * from './src/types';
export { FXMarkdown };
declare const _default: typeof FXMarkdown & Plugin;
export default _default;

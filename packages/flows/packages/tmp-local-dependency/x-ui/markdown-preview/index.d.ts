import { Plugin } from 'vue';
import { default as FXMarkdownPreview } from './src/markdown-preview.component';

export * from './src/markdown-preview.props';
export { FXMarkdownPreview };
declare const _default: typeof FXMarkdownPreview & Plugin;
export default _default;

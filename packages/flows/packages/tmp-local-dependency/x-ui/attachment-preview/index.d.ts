import { Plugin } from 'vue';
import { default as FXAttachmentPreview } from './src/attachment-preview.component';

export * from './src/attachment-preview.props';
export * from './src/types';
export { FXAttachmentPreview };
declare const _default: typeof FXAttachmentPreview & Plugin;
export default _default;

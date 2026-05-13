import { Plugin } from 'vue';
import { default as FXChatPreview } from './src/chat-preview.component';

export * from './src/chat-preview.props';
export { FXChatPreview };
declare const _default: typeof FXChatPreview & Plugin;
export default _default;

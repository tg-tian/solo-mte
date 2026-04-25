import { Plugin } from 'vue';
import { default as FXConversation } from './src/conversation.component';

export * from './src/conversation.props';
export * from './src/composition/types';
export { FXConversation };
declare const _default: typeof FXConversation & Plugin;
export default _default;

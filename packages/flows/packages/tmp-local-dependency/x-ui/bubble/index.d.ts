import { Plugin } from 'vue';
import { default as FXBubble } from './src/bubble.component';
import { default as FXBubbleAction } from './src/components/action/bubble-action.component';

export * from './src/bubble.props';
export * from './src/components/action/bubble-action.props';
export * from './src/composition/types';
export { FXBubble, FXBubbleAction };
declare const _default: typeof FXBubble & Plugin;
export default _default;

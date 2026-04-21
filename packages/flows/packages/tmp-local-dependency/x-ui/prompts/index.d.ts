import { Plugin } from 'vue';
import { default as FXPrompts } from './src/prompts.component';
import { default as FXPrompt } from './src/components/prompt.component';

export * from './src/prompts.props';
export * from './src/components/prompt.props';
export { FXPrompts, FXPrompt };
declare const _default: typeof FXPrompts & Plugin;
export default _default;

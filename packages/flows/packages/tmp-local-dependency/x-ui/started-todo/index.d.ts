import { Plugin } from 'vue';
import { default as FXStartedTodo } from './src/started-todo.component';

export * from './src/started-todo.props';
export * from './src/types';
export { FXStartedTodo };
declare const _default: typeof FXStartedTodo & Plugin;
export default _default;

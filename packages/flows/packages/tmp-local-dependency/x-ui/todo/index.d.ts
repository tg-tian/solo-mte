import { Plugin } from 'vue';
import { default as FXTodo } from './src/todo.component';
import { default as FXTodoListView } from './src/components/todo-list-view';
import { default as FXTodoListItemView } from './src/components/todo-list-item-view.component';

export * from './src/todo.props';
export * from './src/components/todo-list-view.props';
export * from './src/components/todo-list-item-view.props';
export * from './src/composition/type';
export { FXTodo, FXTodoListView, FXTodoListItemView };
declare const _default: typeof FXTodo & Plugin;
export default _default;

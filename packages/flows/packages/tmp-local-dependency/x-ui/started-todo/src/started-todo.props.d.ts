import { ExtractPropTypes, PropType, VNode } from 'vue';
import { TodoItemStatus, TodoWorkItem, DetailViewMode } from '../../todo';

export declare const startedTodoProps: {
    type: {
        type: PropType<TodoItemStatus>;
        default: string;
    };
    status: {
        type: PropType<TodoItemStatus>;
        default: TodoItemStatus;
    };
    message: {
        type: StringConstructor;
        default: string;
    };
    todoList: {
        type: PropType<TodoWorkItem[]>;
        default: never[];
    };
    detailViewMode: {
        type: PropType<DetailViewMode>;
        default: string;
    };
    initExpanded: {
        type: BooleanConstructor;
        default: boolean;
    };
    showLoading: {
        type: BooleanConstructor;
        default: boolean;
    };
    showLabel: {
        type: BooleanConstructor;
        default: boolean;
    };
    loading: PropType<VNode>;
    shimmer: {
        type: BooleanConstructor;
        default: boolean;
    };
};
export type StartedTodoProps = ExtractPropTypes<typeof startedTodoProps>;

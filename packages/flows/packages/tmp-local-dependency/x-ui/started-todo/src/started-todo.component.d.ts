import { TodoItemStatus, TodoWorkItem } from '../../todo';

declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<{
    type: {
        type: import('vue').PropType<TodoItemStatus>;
        default: string;
    };
    status: {
        type: import('vue').PropType<TodoItemStatus>;
        default: TodoItemStatus;
    };
    message: {
        type: StringConstructor;
        default: string;
    };
    todoList: {
        type: import('vue').PropType<TodoWorkItem[]>;
        default: never[];
    };
    detailViewMode: {
        type: import('vue').PropType<import('../..').DetailViewMode>;
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
    loading: import('vue').PropType<import('vue').VNode>;
    shimmer: {
        type: BooleanConstructor;
        default: boolean;
    };
}>, () => import("vue/jsx-runtime").JSX.Element, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<{
    type: {
        type: import('vue').PropType<TodoItemStatus>;
        default: string;
    };
    status: {
        type: import('vue').PropType<TodoItemStatus>;
        default: TodoItemStatus;
    };
    message: {
        type: StringConstructor;
        default: string;
    };
    todoList: {
        type: import('vue').PropType<TodoWorkItem[]>;
        default: never[];
    };
    detailViewMode: {
        type: import('vue').PropType<import('../..').DetailViewMode>;
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
    loading: import('vue').PropType<import('vue').VNode>;
    shimmer: {
        type: BooleanConstructor;
        default: boolean;
    };
}>> & Readonly<{}>, {
    type: TodoItemStatus;
    message: string;
    status: TodoItemStatus;
    todoList: TodoWorkItem[];
    detailViewMode: import('../..').DetailViewMode;
    initExpanded: boolean;
    showLoading: boolean;
    showLabel: boolean;
    shimmer: boolean;
}, {}, {}, {}, string, import('vue').ComponentProvideOptions, true, {}, any>;
export default _default;

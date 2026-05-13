declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<{
    id: {
        type: NumberConstructor;
        default: number;
    };
    status: {
        type: import('vue').PropType<import('../..').TodoItemStatus>;
    };
    task: {
        type: StringConstructor;
        default: string;
    };
    todoList: {
        type: import('vue').PropType<import('../..').TodoWorkItem[]>;
        default: never[];
    };
    detailViewMode: {
        type: import('vue').PropType<import('../..').DetailViewMode>;
        default: import('../..').DetailViewMode;
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
    shimmer: {
        type: BooleanConstructor;
        default: boolean;
    };
    title: {
        type: StringConstructor;
        default: string;
    };
    outputMode: {
        type: import('vue').PropType<import('../../..').OutputMode>;
        default: string;
    };
}>, () => import("vue/jsx-runtime").JSX.Element, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, "click"[], "click", import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<{
    id: {
        type: NumberConstructor;
        default: number;
    };
    status: {
        type: import('vue').PropType<import('../..').TodoItemStatus>;
    };
    task: {
        type: StringConstructor;
        default: string;
    };
    todoList: {
        type: import('vue').PropType<import('../..').TodoWorkItem[]>;
        default: never[];
    };
    detailViewMode: {
        type: import('vue').PropType<import('../..').DetailViewMode>;
        default: import('../..').DetailViewMode;
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
    shimmer: {
        type: BooleanConstructor;
        default: boolean;
    };
    title: {
        type: StringConstructor;
        default: string;
    };
    outputMode: {
        type: import('vue').PropType<import('../../..').OutputMode>;
        default: string;
    };
}>> & Readonly<{
    onClick?: ((...args: any[]) => any) | undefined;
}>, {
    title: string;
    id: number;
    task: string;
    todoList: import('../..').TodoWorkItem[];
    detailViewMode: import('../..').DetailViewMode;
    initExpanded: boolean;
    showLoading: boolean;
    showLabel: boolean;
    shimmer: boolean;
    outputMode: import('../../..').OutputMode;
}, {}, {}, {}, string, import('vue').ComponentProvideOptions, true, {}, any>;
export default _default;

import { ExtractPropTypes, PropType } from 'vue';
import { TodoItemStatus, TodoWorkItem, DetailViewMode } from '../composition/type';
import { OutputMode } from '../../../common';

export declare const todoListItemProps: {
    /** 索引 */
    id: {
        type: NumberConstructor;
        default: number;
    };
    status: {
        type: PropType<TodoItemStatus>;
    };
    task: {
        type: StringConstructor;
        default: string;
    };
    todoList: {
        type: PropType<TodoWorkItem[]>;
        default: never[];
    };
    detailViewMode: {
        type: PropType<DetailViewMode>;
        default: DetailViewMode;
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
    /** 输出模式 */
    outputMode: {
        type: PropType<OutputMode>;
        default: string;
    };
};
export type TodoListItemProps = ExtractPropTypes<typeof todoListItemProps>;

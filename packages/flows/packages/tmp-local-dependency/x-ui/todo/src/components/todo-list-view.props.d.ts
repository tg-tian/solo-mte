import { ExtractPropTypes, PropType } from 'vue';
import { TodoWorkItem } from '../composition/type';

export declare const todoListViewProps: {
    /** 待办事项列表 */
    items: {
        type: PropType<TodoWorkItem[]>;
        default: () => never[];
    };
};
export type TodoListViewProps = ExtractPropTypes<typeof todoListViewProps>;

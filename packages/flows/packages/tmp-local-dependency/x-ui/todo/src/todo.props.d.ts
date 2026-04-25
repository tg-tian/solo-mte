import { ExtractPropTypes, PropType } from 'vue';
import { TodoItemStatus, TodoWorkItem } from './composition/type';

export declare const todoProps: {
    type: {
        type: PropType<TodoItemStatus>;
        default: string;
    };
    /** 消息标题，显示在列表外部 */
    message: {
        type: StringConstructor;
        default: string;
    };
    /** 待办事项列表 */
    items: {
        type: PropType<TodoWorkItem[]>;
        default: never[];
    };
    customClass: {
        type: StringConstructor;
        default: string;
    };
};
export type TodoProps = ExtractPropTypes<typeof todoProps>;

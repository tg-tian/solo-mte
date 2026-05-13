import { Ref } from 'vue';
import { ThoughtChainContent } from './types';
import { TodoItemStatus, TodoWorkItem } from '../../../todo';

export interface ThoughtChainOptions {
    content: Ref<ThoughtChainContent | undefined>;
}
export default function useThoughtChain(options: ThoughtChainOptions): {
    localStartedTodo: {
        status: TodoItemStatus;
        message: string;
        doneMessage?: string | undefined;
        todoList: {
            task: string;
            type?: TodoItemStatus | undefined;
            status?: TodoItemStatus | undefined;
            message?: string | undefined;
            todoList?: /*elided*/ any[] | undefined;
            detailViewMode?: import('../../..').DetailViewMode | undefined;
            initExpanded?: boolean | undefined;
            showLoading?: boolean | undefined;
            showLabel?: boolean | undefined;
            title?: string | undefined;
        }[];
        detailViewMode: import('../../..').DetailViewMode;
        preserveStatuses?: boolean | undefined;
        showHeaderStatusIcon?: boolean | undefined;
    } | null;
    thoughtChainState: TodoItemStatus;
    setThoughtChainDone: () => void;
    setTodoWorkItemDone: (path: string) => void;
    addTodoWorkItems: (items: TodoWorkItem[]) => void;
    addChildTodoWorkItems: (path: string, children: TodoWorkItem[]) => void;
};

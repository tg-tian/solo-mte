import { TodoItemStatus, TodoWorkItem } from '../../todo';

/** 开始执行待办任务类型消息内容 */
export interface MessageContentStartedToDo {
    type: 'StartedToDo';
    status: TodoItemStatus;
    message: string;
    todoList: TodoWorkItem[];
}

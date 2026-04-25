/** 待办项状态 */
export type TodoItemStatus = 'NotStart' | 'Working' | 'Done';
/** 带子任务时的展开/悬停展示方式 */
export type DetailViewMode = 'expand' | 'hover' | 'none';
/** 待办项 */
export interface TodoWorkItem {
    task: string;
    /** 消息类型标识 */
    type?: TodoItemStatus;
    /** 任务状态 */
    status?: TodoItemStatus;
    /** 消息文本 */
    message?: string;
    /** 待办列表 */
    todoList?: TodoWorkItem[];
    /** 详细信息查看方式 */
    detailViewMode?: DetailViewMode;
    /** 初始是否展开（仅 expand 模式生效） */
    initExpanded?: boolean;
    /** 是否显示加载图标 */
    showLoading?: boolean;
    showLabel?: boolean;
    /** 任务标题，对 task 的简要概述 */
    title?: string;
}
/** 待办任务类型消息内容 */
export interface MessageContentTodo {
    type: 'Todo';
    /** 消息标题，显示在列表外部 */
    message: string;
    items: TodoWorkItem[];
}

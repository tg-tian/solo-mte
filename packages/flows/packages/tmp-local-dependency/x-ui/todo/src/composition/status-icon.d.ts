import { TodoItemStatus } from './type';

/** 状态图标：NotStart 空心圆，Working 转圈，Down 对号圆。farrisicon 未找到时使用 CSS 占位 */
export declare function StatusIcon({ status }: {
    status: TodoItemStatus;
}): import("vue/jsx-runtime").JSX.Element;

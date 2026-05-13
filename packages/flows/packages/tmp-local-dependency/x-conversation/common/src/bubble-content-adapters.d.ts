import { BubbleContent, MessageContentAgentThinking, MessageContentAttachmentFile, MessageContentStartedToDo, MessageContentTodo } from '@farris/x-ui';

/** `AgentThinking` → Bubble `thinkingContent`（分段展示正文） */
export declare function bubbleContentFromAgentThinking(c: MessageContentAgentThinking): BubbleContent;
/** `StartedToDo` → Bubble `startedTodo`（保留服务端步骤状态） */
export declare function bubbleContentFromStartedToDo(c: MessageContentStartedToDo): BubbleContent;
/**
 * `Todo`（任务规划）→ Bubble `startedTodo`，与 `StartedToDo` 共用 `fx-thought-chain` / `FXStartedTodo`。
 * `items` 映射为 `todoList`；顶层状态按「待执行规划」处理为 `NotStart`，并保留各步骤已有 status。
 */
export declare function bubbleContentFromTodo(c: MessageContentTodo): BubbleContent;
/**
 * `AttachmentFile` → Bubble `footerContent`（`type: file` 在 `f-chat-bubble-content-text-wrapper` 内渲染），
 * 与 `attachments` prop（气泡底部独立条）区分，避免视觉上「在圆角气泡外」。
 */
export declare function bubbleContentFromAttachmentFile(c: MessageContentAttachmentFile): BubbleContent;

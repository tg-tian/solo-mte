/** Markdown 类型消息内容 */
export interface MessageContentMarkdown {
    type: 'markdown';
    /** 消息摘要，显示在组件上方 */
    message: string;
    /** Markdown 格式的正文，在下方以 Markdown 方式渲染 */
    content: string;
}

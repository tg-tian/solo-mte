import { ComputedRef } from 'vue';

interface StreamingOptions {
    /** 每个字符的输出间隔（毫秒），默认 30 */
    charInterval?: number;
}
/**
 * 流式输出 hook - 实现打字机效果
 * @param sourceContent 获取完整文本的响应式函数，格式为 Record<string, string>，key 对应输出内容的键名
 * @param shouldDisplay 判断是否应该显示的响应式函数或计算属性
 * @param streamingEnabled 是否启用流式输出（传入 ComputedRef 或函数）
 * @param options 配置选项
 * @returns 返回逐步显示的响应式文本对象，键名与 sourceContent 一致
 */
export declare function useStreamingOutput(sourceContent: () => Record<string, string>, shouldDisplay: (() => boolean) | ComputedRef<boolean>, streamingEnabled: (() => boolean) | ComputedRef<boolean>, options?: StreamingOptions): {
    displayContent: import('vue').Ref<Record<string, string>, Record<string, string>>;
};
export {};

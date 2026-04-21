import { ExtractPropTypes, PropType, VNode } from 'vue';
import { SuggestionItem } from './composition/type';

export type PromptChar = '@' | '#';
export declare const suggestionProps: {
    /** 快捷指令建议项 */
    items: {
        type: PropType<SuggestionItem[]>;
        default: () => never[];
    };
    /** 建议项面板高度 */
    height: {
        type: NumberConstructor;
        default: number;
    };
    /** 显示在建议项列表顶部的标题 */
    title: {
        type: PropType<string | VNode>;
        default: string;
    };
    prompt: {
        type: PropType<string | VNode>;
        default: string;
    };
    promptChar: {
        type: PropType<PromptChar>;
        default: string;
    };
    promptAgentName: {
        type: StringConstructor;
        default: string;
    };
};
export type SuggestionProps = ExtractPropTypes<typeof suggestionProps>;

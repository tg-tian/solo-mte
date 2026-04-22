import type { ExtractPropTypes, PropType } from 'vue';

export interface WelcomePromptItem {
    category: string;
    icon: string;
    title: string;
    subtitle: string;
    conversationUrl?: string;
}

export const welcomePromptsProps = {
    /** 是否显示 */
    visible: { type: Boolean as PropType<boolean>, default: false },
    /** 点击回调 */
    onSelect: { type: Function as PropType<(item: WelcomePromptItem) => void>, default: undefined }
};

export type WelcomePromptsProps = ExtractPropTypes<typeof welcomePromptsProps>;
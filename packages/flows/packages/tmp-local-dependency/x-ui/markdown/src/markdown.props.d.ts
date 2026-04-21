import { ExtractPropTypes, PropType } from 'vue';
import { MessageContentMarkdown } from './types';

export declare const markdownMessageProps: {
    content: {
        type: PropType<MessageContentMarkdown>;
        required: boolean;
    };
};
export type MarkdownMessageProps = ExtractPropTypes<typeof markdownMessageProps>;

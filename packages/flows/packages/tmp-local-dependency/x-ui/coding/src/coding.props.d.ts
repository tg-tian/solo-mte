import { ExtractPropTypes, PropType } from 'vue';
import { MessageContentCoding } from './types';

export declare const codingMessageProps: {
    content: {
        type: PropType<MessageContentCoding>;
        required: boolean;
    };
};
export type CodingMessageProps = ExtractPropTypes<typeof codingMessageProps>;

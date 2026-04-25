import { ExtractPropTypes, PropType } from 'vue';
import { MessageContentFileOperation } from './types';

export declare const fileOperationMessageProps: {
    content: {
        type: PropType<MessageContentFileOperation>;
        required: boolean;
    };
};
export type FileOperationMessageProps = ExtractPropTypes<typeof fileOperationMessageProps>;

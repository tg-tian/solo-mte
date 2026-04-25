import { ExtractPropTypes, PropType } from 'vue';
import { MessageContentAppPreview, PreviewConfig } from './types';

export declare const appPreviewMessageProps: {
    content: {
        type: PropType<MessageContentAppPreview>;
        required: boolean;
    };
    onOpen: {
        type: PropType<(config: PreviewConfig) => void>;
        default: undefined;
    };
};
export type AppPreviewMessageProps = ExtractPropTypes<typeof appPreviewMessageProps>;

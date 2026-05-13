import { ExtractPropTypes, PropType } from 'vue';
import { MessageContentAttachmentPreview, AttachmentPreviewConfig } from './types';

export declare const attachmentPreviewProps: {
    content: {
        type: PropType<MessageContentAttachmentPreview>;
        required: boolean;
    };
    onOpen: {
        type: PropType<(config: AttachmentPreviewConfig) => void>;
    };
};
export type AttachmentPreviewProps = ExtractPropTypes<typeof attachmentPreviewProps>;

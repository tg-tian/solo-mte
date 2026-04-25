import { ExtractPropTypes, PropType } from 'vue';
import { PreviewConfig } from '../../app-preview';

export declare const chatPreviewProps: {
    previewConfig: {
        type: PropType<PreviewConfig>;
        default: () => {};
    };
    onClose: {
        type: PropType<() => void>;
        default: () => void;
    };
};
export type ChatPreviewProps = ExtractPropTypes<typeof chatPreviewProps>;

import { AttachmentPreviewConfig } from './types';

declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<{
    content: {
        type: import('vue').PropType<import('./types').MessageContentAttachmentPreview>;
        required: boolean;
    };
    onOpen: {
        type: import('vue').PropType<(config: AttachmentPreviewConfig) => void>;
    };
}>, () => import("vue/jsx-runtime").JSX.Element | null, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, never[], never, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<{
    content: {
        type: import('vue').PropType<import('./types').MessageContentAttachmentPreview>;
        required: boolean;
    };
    onOpen: {
        type: import('vue').PropType<(config: AttachmentPreviewConfig) => void>;
    };
}>> & Readonly<{}>, {}, {}, {}, {}, string, import('vue').ComponentProvideOptions, true, {}, any>;
export default _default;

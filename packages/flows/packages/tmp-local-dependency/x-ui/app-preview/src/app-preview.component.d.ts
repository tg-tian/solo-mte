declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<{
    content: {
        type: import('vue').PropType<import('./types').MessageContentAppPreview>;
        required: boolean;
    };
    onOpen: {
        type: import('vue').PropType<(config: import('./types').PreviewConfig) => void>;
        default: undefined;
    };
}>, () => import("vue/jsx-runtime").JSX.Element | null, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<{
    content: {
        type: import('vue').PropType<import('./types').MessageContentAppPreview>;
        required: boolean;
    };
    onOpen: {
        type: import('vue').PropType<(config: import('./types').PreviewConfig) => void>;
        default: undefined;
    };
}>> & Readonly<{}>, {
    onOpen: (config: import('./types').PreviewConfig) => void;
}, {}, {}, {}, string, import('vue').ComponentProvideOptions, true, {}, any>;
export default _default;

import { Attachment, ThinkControl, ThoughtChainControl } from './composition/types';

declare const _default: import('vue').DefineComponent<{
    header: import('./bubble.props').BubbleHeaderType;
    customClass: string | string[] | Record<string, boolean>;
    outputMode: import('../..').OutputMode;
    placement: import('./bubble.props').BubblePlacement;
    classNames: Record<import('..').AppearanceType, string | string[] | Record<string, boolean>>;
    customStyle: string | import('vue').CSSProperties;
    showAvatar: boolean;
    styles: Record<import('..').AppearanceType, import('vue').CSSProperties>;
    attachments: Attachment[];
    content?: import('..').BubbleContent | undefined;
    onLoadThink?: ((control: ThinkControl) => void) | undefined;
    onLoadThoughtChain?: ((control: ThoughtChainControl) => void) | undefined;
    onPreview?: ((config: import('../..').PreviewConfig) => void) | undefined;
    onUserAuthConfirm?: ((optionId: string, name: string, message?: string) => void) | undefined;
    compositeTailRender?: (() => import('vue').VNode | null | undefined) | undefined;
}, () => import("vue/jsx-runtime").JSX.Element, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, string, import('vue').PublicProps, Readonly<{
    header: import('./bubble.props').BubbleHeaderType;
    customClass: string | string[] | Record<string, boolean>;
    outputMode: import('../..').OutputMode;
    placement: import('./bubble.props').BubblePlacement;
    classNames: Record<import('..').AppearanceType, string | string[] | Record<string, boolean>>;
    customStyle: string | import('vue').CSSProperties;
    showAvatar: boolean;
    styles: Record<import('..').AppearanceType, import('vue').CSSProperties>;
    attachments: Attachment[];
    content?: import('..').BubbleContent | undefined;
    onLoadThink?: ((control: ThinkControl) => void) | undefined;
    onLoadThoughtChain?: ((control: ThoughtChainControl) => void) | undefined;
    onPreview?: ((config: import('../..').PreviewConfig) => void) | undefined;
    onUserAuthConfirm?: ((optionId: string, name: string, message?: string) => void) | undefined;
    compositeTailRender?: (() => import('vue').VNode | null | undefined) | undefined;
}> & Readonly<{}>, {
    header: import('./bubble.props').BubbleHeaderType;
    customClass: string | string[] | Record<string, boolean>;
    outputMode: import('../..').OutputMode;
    placement: import('./bubble.props').BubblePlacement;
    classNames: Record<import('..').AppearanceType, string | string[] | Record<string, boolean>>;
    customStyle: string | import('vue').CSSProperties;
    showAvatar: boolean;
    styles: Record<import('..').AppearanceType, import('vue').CSSProperties>;
    attachments: Attachment[];
    onLoadThink: (control: ThinkControl) => void;
    onLoadThoughtChain: (control: ThoughtChainControl) => void;
    onPreview: (config: import('../..').PreviewConfig) => void;
    onUserAuthConfirm: (optionId: string, name: string, message?: string) => void;
    compositeTailRender: () => import('vue').VNode | null | undefined;
}, {}, {
    'fx-text-content': import('vue').DefineComponent<{
        title: string;
        text: string;
        outputMode: import('../..').OutputMode;
        subtitle: string;
    }, () => import("vue/jsx-runtime").JSX.Element, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, string, import('vue').PublicProps, Readonly<{
        title: string;
        text: string;
        outputMode: import('../..').OutputMode;
        subtitle: string;
    }> & Readonly<{}>, {
        title: string;
        text: string;
        outputMode: import('../..').OutputMode;
        subtitle: string;
    }, {}, {}, {}, string, import('vue').ComponentProvideOptions, true, {}, any>;
    'fx-think': import('vue').DefineComponent<{
        outputMode: import('../..').OutputMode;
        content?: import('..').ThinkContent | undefined;
    }, () => import("vue/jsx-runtime").JSX.Element | null, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, "init"[], "init", import('vue').PublicProps, Readonly<{
        outputMode: import('../..').OutputMode;
        content?: import('..').ThinkContent | undefined;
    }> & Readonly<{
        onInit?: ((...args: any[]) => any) | undefined;
    }>, {
        outputMode: import('../..').OutputMode;
    }, {}, {}, {}, string, import('vue').ComponentProvideOptions, true, {}, any>;
    'fx-thought-chain': import('vue').DefineComponent<{
        content?: import('..').ThoughtChainContent | undefined;
    }, () => import("vue/jsx-runtime").JSX.Element | null, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, "init", import('vue').PublicProps, Readonly<{
        content?: import('..').ThoughtChainContent | undefined;
    }> & Readonly<{}>, {}, {}, {}, {}, string, import('vue').ComponentProvideOptions, true, {}, any>;
    'fx-markdown-inline': import('vue').DefineComponent<import('vue').ExtractPropTypes<{
        content: {
            type: import('vue').PropType<import('../..').MessageContentMarkdown>;
            required: boolean;
        };
    }>, () => import("vue/jsx-runtime").JSX.Element, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<{
        content: {
            type: import('vue').PropType<import('../..').MessageContentMarkdown>;
            required: boolean;
        };
    }>> & Readonly<{}>, {}, {}, {}, {}, string, import('vue').ComponentProvideOptions, true, {}, any>;
    'fx-user-auth-inline': import('vue').DefineComponent<import('vue').ExtractPropTypes<{
        content: {
            type: import('vue').PropType<import('../..').MessageContentUserAuth>;
            required: true;
        };
        onConfirm: {
            type: import('vue').PropType<(optionId: string, name: string, message?: string) => void>;
            default: undefined;
        };
    }>, () => import("vue/jsx-runtime").JSX.Element, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<{
        content: {
            type: import('vue').PropType<import('../..').MessageContentUserAuth>;
            required: true;
        };
        onConfirm: {
            type: import('vue').PropType<(optionId: string, name: string, message?: string) => void>;
            default: undefined;
        };
    }>> & Readonly<{}>, {
        onConfirm: (optionId: string, name: string, message?: string) => void;
    }, {}, {}, {}, string, import('vue').ComponentProvideOptions, true, {}, any>;
    'fx-app-preview-inline': import('vue').DefineComponent<import('vue').ExtractPropTypes<{
        content: {
            type: import('vue').PropType<import('../..').MessageContentAppPreview>;
            required: boolean;
        };
        onOpen: {
            type: import('vue').PropType<(config: import('../..').PreviewConfig) => void>;
            default: undefined;
        };
    }>, () => import("vue/jsx-runtime").JSX.Element | null, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<{
        content: {
            type: import('vue').PropType<import('../..').MessageContentAppPreview>;
            required: boolean;
        };
        onOpen: {
            type: import('vue').PropType<(config: import('../..').PreviewConfig) => void>;
            default: undefined;
        };
    }>> & Readonly<{}>, {
        onOpen: (config: import('../..').PreviewConfig) => void;
    }, {}, {}, {}, string, import('vue').ComponentProvideOptions, true, {}, any>;
}, {}, string, import('vue').ComponentProvideOptions, true, {}, any>;
export default _default;

import { VNode, CSSProperties } from 'vue';

declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<{
    id: {
        type: (StringConstructor | NumberConstructor)[];
        default: string;
    };
    icon: {
        type: import('vue').PropType<string | VNode>;
        default: string;
    };
    label: {
        type: import('vue').PropType<string | VNode>;
        default: string;
    };
    description: {
        type: import('vue').PropType<string | VNode>;
        default: string;
    };
    badge: {
        type: import('vue').PropType<string | VNode>;
        default: string;
    };
    disabled: {
        type: BooleanConstructor;
        default: boolean;
    };
    children: {
        type: import('vue').PropType<import('../composition/type').BasePromptItemType[]>;
        default: () => never[];
    };
    styles: {
        type: import('vue').PropType<Record<import('../composition/type').AppearanceType, CSSProperties | string>>;
    };
    classNames: {
        type: import('vue').PropType<Record<import('../composition/type').AppearanceType, string | string[] | Record<string, boolean>>>;
    };
    customClass: {
        type: import('vue').PropType<string | string[] | Record<string, boolean>>;
        default: string;
    };
    customStyle: {
        type: import('vue').PropType<CSSProperties | string>;
        default: string;
    };
    showType: {
        type: import('vue').PropType<import('../composition/type').PromptShowType>;
        default: import('../composition/type').PromptShowType;
    };
    gap: {
        type: (StringConstructor | NumberConstructor)[];
    };
    onClick: {
        type: import('vue').PropType<(ev: MouseEvent) => void>;
        required: boolean;
    };
}>, () => import("vue/jsx-runtime").JSX.Element, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<{
    id: {
        type: (StringConstructor | NumberConstructor)[];
        default: string;
    };
    icon: {
        type: import('vue').PropType<string | VNode>;
        default: string;
    };
    label: {
        type: import('vue').PropType<string | VNode>;
        default: string;
    };
    description: {
        type: import('vue').PropType<string | VNode>;
        default: string;
    };
    badge: {
        type: import('vue').PropType<string | VNode>;
        default: string;
    };
    disabled: {
        type: BooleanConstructor;
        default: boolean;
    };
    children: {
        type: import('vue').PropType<import('../composition/type').BasePromptItemType[]>;
        default: () => never[];
    };
    styles: {
        type: import('vue').PropType<Record<import('../composition/type').AppearanceType, CSSProperties | string>>;
    };
    classNames: {
        type: import('vue').PropType<Record<import('../composition/type').AppearanceType, string | string[] | Record<string, boolean>>>;
    };
    customClass: {
        type: import('vue').PropType<string | string[] | Record<string, boolean>>;
        default: string;
    };
    customStyle: {
        type: import('vue').PropType<CSSProperties | string>;
        default: string;
    };
    showType: {
        type: import('vue').PropType<import('../composition/type').PromptShowType>;
        default: import('../composition/type').PromptShowType;
    };
    gap: {
        type: (StringConstructor | NumberConstructor)[];
    };
    onClick: {
        type: import('vue').PropType<(ev: MouseEvent) => void>;
        required: boolean;
    };
}>> & Readonly<{}>, {
    label: string | VNode<import('vue').RendererNode, import('vue').RendererElement, {
        [key: string]: any;
    }>;
    customClass: string | string[] | Record<string, boolean>;
    icon: string | VNode<import('vue').RendererNode, import('vue').RendererElement, {
        [key: string]: any;
    }>;
    id: string | number;
    customStyle: string | CSSProperties;
    disabled: boolean;
    description: string | VNode<import('vue').RendererNode, import('vue').RendererElement, {
        [key: string]: any;
    }>;
    showType: import('../composition/type').PromptShowType;
    badge: string | VNode<import('vue').RendererNode, import('vue').RendererElement, {
        [key: string]: any;
    }>;
    children: import('../composition/type').BasePromptItemType[];
}, {}, {}, {}, string, import('vue').ComponentProvideOptions, true, {}, any>;
export default _default;

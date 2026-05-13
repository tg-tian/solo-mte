declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<{
    item: {
        type: import('vue').PropType<import('../..').CarouselItemType>;
        default: () => {};
    };
    index: {
        type: NumberConstructor;
        default: number;
    };
    active: {
        type: BooleanConstructor;
        default: boolean;
    };
    showInfo: {
        type: BooleanConstructor;
        default: boolean;
    };
    styles: {
        type: import('vue').PropType<Record<import('../..').CarouselAppearanceType, import('vue').CSSProperties>>;
        default: () => {};
    };
    classNames: {
        type: import('vue').PropType<Record<import('../..').CarouselAppearanceType, string | string[] | Record<string, boolean>>>;
        default: () => {};
    };
}>, () => import("vue/jsx-runtime").JSX.Element, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, "click"[], "click", import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<{
    item: {
        type: import('vue').PropType<import('../..').CarouselItemType>;
        default: () => {};
    };
    index: {
        type: NumberConstructor;
        default: number;
    };
    active: {
        type: BooleanConstructor;
        default: boolean;
    };
    showInfo: {
        type: BooleanConstructor;
        default: boolean;
    };
    styles: {
        type: import('vue').PropType<Record<import('../..').CarouselAppearanceType, import('vue').CSSProperties>>;
        default: () => {};
    };
    classNames: {
        type: import('vue').PropType<Record<import('../..').CarouselAppearanceType, string | string[] | Record<string, boolean>>>;
        default: () => {};
    };
}>> & Readonly<{
    onClick?: ((...args: any[]) => any) | undefined;
}>, {
    classNames: Record<import('../..').CarouselAppearanceType, string | string[] | Record<string, boolean>>;
    styles: Record<import('../..').CarouselAppearanceType, import('vue').CSSProperties>;
    active: boolean;
    item: import('../..').CarouselItemType;
    showInfo: boolean;
    index: number;
}, {}, {}, {}, string, import('vue').ComponentProvideOptions, true, {}, any>;
export default _default;

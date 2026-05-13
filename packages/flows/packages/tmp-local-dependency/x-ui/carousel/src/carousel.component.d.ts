import { CarouselItemType } from './composition/type';

declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<{
    items: {
        type: import('vue').PropType<CarouselItemType[]>;
        default: () => never[];
    };
    modelValue: {
        type: NumberConstructor;
        default: number;
    };
    direction: {
        type: import('vue').PropType<import('..').CarouselDirection>;
        default: string;
    };
    autoplay: {
        type: BooleanConstructor;
        default: boolean;
    };
    interval: {
        type: NumberConstructor;
        default: number;
    };
    loop: {
        type: BooleanConstructor;
        default: boolean;
    };
    trigger: {
        type: import('vue').PropType<import('..').CarouselTrigger>;
        default: string;
    };
    indicatorPosition: {
        type: import('vue').PropType<import('..').CarouselIndicatorPosition>;
        default: string;
    };
    arrowVisibility: {
        type: import('vue').PropType<import('..').CarouselArrowVisibility>;
        default: string;
    };
    showIndicator: {
        type: BooleanConstructor;
        default: boolean;
    };
    showArrow: {
        type: BooleanConstructor;
        default: boolean;
    };
    showInfo: {
        type: BooleanConstructor;
        default: boolean;
    };
    height: {
        type: (StringConstructor | NumberConstructor)[];
        default: string;
    };
    styles: {
        type: import('vue').PropType<Record<import('..').CarouselAppearanceType, import('vue').CSSProperties>>;
        default: () => {};
    };
    classNames: {
        type: import('vue').PropType<Record<import('..').CarouselAppearanceType, string | string[] | Record<string, boolean>>>;
        default: () => {};
    };
    customClass: {
        type: import('vue').PropType<string | string[] | Record<string, boolean>>;
        default: string;
    };
    customStyle: {
        type: import('vue').PropType<import('vue').CSSProperties | string>;
        default: string;
    };
    buttonPosition: {
        type: import('vue').PropType<"inner" | "outer">;
        default: string;
    };
}>, () => import("vue/jsx-runtime").JSX.Element, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, "change" | "update:modelValue" | "item-click", import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<{
    items: {
        type: import('vue').PropType<CarouselItemType[]>;
        default: () => never[];
    };
    modelValue: {
        type: NumberConstructor;
        default: number;
    };
    direction: {
        type: import('vue').PropType<import('..').CarouselDirection>;
        default: string;
    };
    autoplay: {
        type: BooleanConstructor;
        default: boolean;
    };
    interval: {
        type: NumberConstructor;
        default: number;
    };
    loop: {
        type: BooleanConstructor;
        default: boolean;
    };
    trigger: {
        type: import('vue').PropType<import('..').CarouselTrigger>;
        default: string;
    };
    indicatorPosition: {
        type: import('vue').PropType<import('..').CarouselIndicatorPosition>;
        default: string;
    };
    arrowVisibility: {
        type: import('vue').PropType<import('..').CarouselArrowVisibility>;
        default: string;
    };
    showIndicator: {
        type: BooleanConstructor;
        default: boolean;
    };
    showArrow: {
        type: BooleanConstructor;
        default: boolean;
    };
    showInfo: {
        type: BooleanConstructor;
        default: boolean;
    };
    height: {
        type: (StringConstructor | NumberConstructor)[];
        default: string;
    };
    styles: {
        type: import('vue').PropType<Record<import('..').CarouselAppearanceType, import('vue').CSSProperties>>;
        default: () => {};
    };
    classNames: {
        type: import('vue').PropType<Record<import('..').CarouselAppearanceType, string | string[] | Record<string, boolean>>>;
        default: () => {};
    };
    customClass: {
        type: import('vue').PropType<string | string[] | Record<string, boolean>>;
        default: string;
    };
    customStyle: {
        type: import('vue').PropType<import('vue').CSSProperties | string>;
        default: string;
    };
    buttonPosition: {
        type: import('vue').PropType<"inner" | "outer">;
        default: string;
    };
}>> & Readonly<{}>, {
    items: CarouselItemType[];
    customClass: string | string[] | Record<string, boolean>;
    showArrow: boolean;
    classNames: Record<import('..').CarouselAppearanceType, string | string[] | Record<string, boolean>>;
    customStyle: string | import('vue').CSSProperties;
    styles: Record<import('..').CarouselAppearanceType, import('vue').CSSProperties>;
    height: string | number;
    direction: import('..').CarouselDirection;
    modelValue: number;
    autoplay: boolean;
    interval: number;
    loop: boolean;
    trigger: import('..').CarouselTrigger;
    indicatorPosition: import('..').CarouselIndicatorPosition;
    arrowVisibility: import('..').CarouselArrowVisibility;
    showIndicator: boolean;
    showInfo: boolean;
    buttonPosition: "inner" | "outer";
}, {}, {}, {}, string, import('vue').ComponentProvideOptions, true, {}, any>;
export default _default;

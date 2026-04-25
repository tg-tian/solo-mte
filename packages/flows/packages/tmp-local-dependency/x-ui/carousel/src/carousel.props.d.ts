import { ExtractPropTypes, PropType, CSSProperties } from 'vue';
import { CarouselItemType, CarouselDirection, CarouselTrigger, CarouselIndicatorPosition, CarouselArrowVisibility, CarouselAppearanceType } from './composition/type';

export declare const carouselProps: {
    /** 轮播项列表 */
    items: {
        type: PropType<CarouselItemType[]>;
        default: () => never[];
    };
    /** 当前激活索引（受控） */
    modelValue: {
        type: NumberConstructor;
        default: number;
    };
    /** 轮播方向 */
    direction: {
        type: PropType<CarouselDirection>;
        default: string;
    };
    /** 是否自动播放 */
    autoplay: {
        type: BooleanConstructor;
        default: boolean;
    };
    /** 自动播放间隔（ms） */
    interval: {
        type: NumberConstructor;
        default: number;
    };
    /** 是否循环 */
    loop: {
        type: BooleanConstructor;
        default: boolean;
    };
    /** 触发方式 */
    trigger: {
        type: PropType<CarouselTrigger>;
        default: string;
    };
    /** 指示器位置 */
    indicatorPosition: {
        type: PropType<CarouselIndicatorPosition>;
        default: string;
    };
    /** 箭头显示时机 */
    arrowVisibility: {
        type: PropType<CarouselArrowVisibility>;
        default: string;
    };
    /** 是否显示指示器 */
    showIndicator: {
        type: BooleanConstructor;
        default: boolean;
    };
    /** 是否显示箭头 */
    showArrow: {
        type: BooleanConstructor;
        default: boolean;
    };
    showInfo: {
        type: BooleanConstructor;
        default: boolean;
    };
    /** 高度 */
    height: {
        type: (StringConstructor | NumberConstructor)[];
        default: string;
    };
    /** 自定义样式 */
    styles: {
        type: PropType<Record<CarouselAppearanceType, CSSProperties>>;
        default: () => {};
    };
    /** 自定义样式类名 */
    classNames: {
        type: PropType<Record<CarouselAppearanceType, string | string[] | Record<string, boolean>>>;
        default: () => {};
    };
    /** 组件自定义样式类名 */
    customClass: {
        type: PropType<string | string[] | Record<string, boolean>>;
        default: string;
    };
    /** 组件自定义样式 */
    customStyle: {
        type: PropType<CSSProperties | string>;
        default: string;
    };
    buttonPosition: {
        type: PropType<"inner" | "outer">;
        default: string;
    };
};
export type CarouselProps = ExtractPropTypes<typeof carouselProps>;

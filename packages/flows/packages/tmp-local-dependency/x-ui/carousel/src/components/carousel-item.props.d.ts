import { ExtractPropTypes, PropType, CSSProperties } from 'vue';
import { CarouselItemType, CarouselAppearanceType } from '../composition/type';

export declare const carouselItemProps: {
    /** 轮播项数据 */
    item: {
        type: PropType<CarouselItemType>;
        default: () => {};
    };
    /** 索引 */
    index: {
        type: NumberConstructor;
        default: number;
    };
    /** 是否激活 */
    active: {
        type: BooleanConstructor;
        default: boolean;
    };
    showInfo: {
        type: BooleanConstructor;
        default: boolean;
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
};
export type CarouselItemProps = ExtractPropTypes<typeof carouselItemProps>;

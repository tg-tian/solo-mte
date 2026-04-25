import { VNode } from 'vue';

export interface CarouselItemType {
    /** 唯一标识 */
    id?: string | number;
    /** 图片 URL */
    image?: string;
    /** 标题 */
    title?: string | VNode;
    /** 描述 */
    description?: string | VNode;
    /** 自定义内容（slot） */
    content?: VNode;
    /** 链接地址 */
    link?: string;
    /** 是否禁用 */
    disabled?: boolean;
}
export type CarouselDirection = 'horizontal' | 'vertical';
export type CarouselTrigger = 'click' | 'hover';
export type CarouselIndicatorPosition = 'inside' | 'outside' | 'none';
export type CarouselArrowVisibility = 'always' | 'hover' | 'never';
export type CarouselAppearanceType = "root" | "container" | "track" | "item" | "arrow" | "arrowLeft" | "arrowRight" | "indicator" | "indicatorItem" | "indicatorItemActive" | "image" | "content" | "title" | "description";
export interface CarouselEvents {
    "change": [index: number, prevIndex: number];
    "item-click": [event: MouseEvent, item: CarouselItemType, index: number];
}

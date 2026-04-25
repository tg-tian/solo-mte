import { ExtractPropTypes, PropType, VNode, CSSProperties } from 'vue';
import { PromptItemType, AppearanceType } from './composition/type';

export declare const promptsProps: {
    /** 包含多个提示项的列表 */
    items: {
        type: PropType<PromptItemType[]>;
        default: () => never[];
    };
    /** 显示在提示列表顶部的标题 */
    title: {
        type: PropType<string | VNode>;
        default: string;
    };
    /** 提示列表是否垂直排列 */
    vertical: {
        type: BooleanConstructor;
        default: boolean;
    };
    /** 提示列表是否换行 */
    wrap: {
        type: BooleanConstructor;
        default: boolean;
    };
    /** 间距 */
    gap: {
        type: (StringConstructor | NumberConstructor)[];
        default: number;
    };
    /** 是否开启渲染渐入 */
    fadeIn: {
        type: BooleanConstructor;
        default: boolean;
    };
    /** 是否开启渲染从左到右渐入 */
    fadeInLeft: {
        type: BooleanConstructor;
        default: boolean;
    };
    /** 自定义样式 */
    styles: {
        type: PropType<Record<AppearanceType, CSSProperties>>;
        default: () => {};
    };
    /** 自定义样式类名 */
    classNames: {
        type: PropType<Record<AppearanceType, string | string[] | Record<string, boolean>>>;
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
};
export type PromptsProps = ExtractPropTypes<typeof promptsProps>;

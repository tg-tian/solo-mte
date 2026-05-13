import { CSSProperties, ExtractPropTypes, PropType, VNode } from 'vue';
import { AppearanceType } from './composition/type';

export declare const generateProcessProps: {
    visible: {
        type: BooleanConstructor;
        default: boolean;
    };
    /** 描述 */
    description: PropType<string | VNode>;
    /** 当前进度百分比，0~100 */
    progress: {
        type: NumberConstructor;
        default: number;
    };
    /** 是否显示进度条 */
    showProgress: {
        type: BooleanConstructor;
        default: boolean;
    };
    /** 图标（可选） */
    icon: {
        type: PropType<string | VNode>;
        default: string;
    };
    /** 自定义类名 */
    customClass: {
        type: PropType<string | string[] | Record<string, boolean>>;
        default: string;
    };
    /** 自定义样式 */
    customStyle: {
        type: PropType<CSSProperties | string>;
        default: string;
    };
    /** 各部分自定义样式 */
    styles: {
        type: PropType<Record<AppearanceType, CSSProperties>>;
        default: () => {};
    };
    /** 各部分自定义类名 */
    classNames: {
        type: PropType<Record<AppearanceType, string | string[] | Record<string, boolean>>>;
        default: () => {};
    };
};
export type GenerateProcessProps = ExtractPropTypes<typeof generateProcessProps>;

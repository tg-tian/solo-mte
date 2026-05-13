import { CSSProperties, ExtractPropTypes, PropType, VNode } from 'vue';
import { AppearanceType } from './composition/type';

export declare const welcomeProps: {
    /** 图标 */
    icon: PropType<string | VNode>;
    /** 标题 */
    title: PropType<string | VNode>;
    /** 描述 */
    description: PropType<string | VNode>;
    customClass: {
        type: PropType<string | string[] | Record<string, boolean>>;
        default: string;
    };
    customStyle: {
        type: PropType<CSSProperties | string>;
        default: string;
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
};
export type WelcomeProps = ExtractPropTypes<typeof welcomeProps>;

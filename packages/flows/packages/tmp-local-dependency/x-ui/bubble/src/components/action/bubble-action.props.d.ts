import { CSSProperties, ExtractPropTypes, PropType } from 'vue';

export declare const bubbleActionProps: {
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
export type BubbleActionProps = ExtractPropTypes<typeof bubbleActionProps>;

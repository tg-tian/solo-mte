import { ExtractPropTypes, PropType } from 'vue';
import { OutputMode } from '../../../../common';

export declare const textContentProps: {
    /** 标题 */
    title: {
        type: PropType<string>;
        default: string;
    };
    /** 副标题 */
    subtitle: {
        type: PropType<string>;
        default: string;
    };
    /** 正文 */
    text: {
        type: PropType<string>;
        default: string;
    };
    /** 输出模式 */
    outputMode: {
        type: PropType<OutputMode>;
        default: string;
    };
};
export type TextContentProps = ExtractPropTypes<typeof textContentProps>;

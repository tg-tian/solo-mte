import { ExtractPropTypes, PropType } from 'vue';
import { ThinkContent } from '../../composition/types';
import { OutputMode } from '../../../../common';

export declare const bubbleThinkProps: {
    content: {
        type: PropType<ThinkContent>;
    };
    /** 输出模式 */
    outputMode: {
        type: PropType<OutputMode>;
        default: string;
    };
};
export type BubbleThinkProps = ExtractPropTypes<typeof bubbleThinkProps>;

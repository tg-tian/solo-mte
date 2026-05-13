import { ExtractPropTypes, PropType } from 'vue';
import { ThoughtChainContent } from '../../composition/types';

export declare const bubbleThoughtChainProps: {
    content: {
        type: PropType<ThoughtChainContent>;
    };
};
export type BubbleThoughtChainProps = ExtractPropTypes<typeof bubbleThoughtChainProps>;

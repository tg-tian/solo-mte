import { ExtractPropTypes, PropType } from 'vue';
import { Message, PreviewConfig } from '../../conversation.props';
import { ThinkControl, ThoughtChainControl } from '@farris/x-ui';

export declare const floatConversationProps: {
    messages: {
        type: PropType<Message[]>;
        default: () => never[];
        required: boolean;
    };
    preview: {
        type: PropType<(config: PreviewConfig) => void>;
        default: undefined;
    };
    loadThink: {
        type: PropType<(control: ThinkControl, messageId: string) => void>;
        default: undefined;
    };
    loadThoughtChain: {
        type: PropType<(control: ThoughtChainControl, messageId: string) => void>;
        default: undefined;
    };
    confirmUserAuth: {
        type: PropType<(optionId: string, name: string, message: string, messageId: string) => void>;
        default: undefined;
    };
};
export type FloatConversationProps = ExtractPropTypes<typeof floatConversationProps>;

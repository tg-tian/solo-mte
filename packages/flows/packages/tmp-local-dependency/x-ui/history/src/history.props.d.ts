import { ExtractPropTypes, PropType } from 'vue';
import { ChatHistoryItem } from './composition/type';

export declare const chatHistoryProps: {
    title: {
        type: StringConstructor;
        default: string;
    };
    items: {
        type: PropType<ChatHistoryItem[]>;
        default: () => never[];
    };
};
export type ChatHistoryProps = ExtractPropTypes<typeof chatHistoryProps>;

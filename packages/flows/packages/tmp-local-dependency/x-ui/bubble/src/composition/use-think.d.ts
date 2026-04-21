import { Ref } from 'vue';
import { ThinkContent, ThinkingSegment, ThinkState } from './types';

export interface ThinkOptions {
    /** 须为 Ref，否则流式更新时无法收到父组件 props 变化（会卡在首帧「思考中」） */
    content: Ref<ThinkContent | undefined>;
}
export default function useThink(options: ThinkOptions): {
    contentExpanded: boolean;
    localThinkContent: {
        thinkingText?: string | undefined;
        doneText?: string | undefined;
        segments?: {
            title?: string | undefined;
            content: string;
        }[] | undefined;
        completed?: boolean | undefined;
    } | null;
    state: ThinkState;
    addSegments: (segments: ThinkingSegment[]) => void;
    completeThink: () => void;
};

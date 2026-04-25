import { CSSProperties, ExtractPropTypes, PropType, VNode } from 'vue';
import { AppearanceType, BubbleContent, Attachment, ThoughtChainControl, ThinkControl } from './composition/types';
import { PreviewConfig } from '../../app-preview';
import { OutputMode } from '../../common';

export type BubblePlacement = 'start' | 'end';
export type BubbleHeaderType = 'sender' | 'ContentHeader';
export declare const bubbleProps: {
    /** 气泡内容 */
    content: {
        type: PropType<BubbleContent>;
        required: boolean;
    };
    outputMode: {
        type: PropType<OutputMode>;
        default: string;
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
    /** 气泡header类型 */
    header: {
        type: PropType<BubbleHeaderType>;
        default: string;
    };
    /** 气泡位置 */
    placement: {
        type: PropType<BubblePlacement>;
        default: string;
    };
    /** 显示头像 */
    showAvatar: {
        type: BooleanConstructor;
        default: boolean;
    };
    /** 自定义样式 */
    styles: {
        type: PropType<Record<AppearanceType, CSSProperties>>;
        default: () => {};
    };
    /** 附件列表 */
    attachments: {
        type: PropType<Attachment[]>;
        default: () => never[];
    };
    /** 消息内容包含思考过程时，用于注册更新思考过程的api */
    onLoadThink: {
        type: PropType<(control: ThinkControl) => void>;
        default: undefined;
    };
    /** 消息内容包含思维链时，用于注册更新思维链内容的api */
    onLoadThoughtChain: {
        type: PropType<(control: ThoughtChainControl) => void>;
        default: undefined;
    };
    onPreview: {
        type: PropType<(config: PreviewConfig) => void>;
        default: undefined;
    };
    /** 气泡内 agent/request-run 等按钮确认 */
    onUserAuthConfirm: {
        type: PropType<(optionId: string, name: string, message?: string) => void>;
        default: undefined;
    };
    /** 复合消息：在正文区尾部追加渲染（单气泡内多块） */
    compositeTailRender: {
        type: PropType<() => VNode | null | undefined>;
        default: undefined;
    };
};
export type BubbleProps = ExtractPropTypes<typeof bubbleProps>;

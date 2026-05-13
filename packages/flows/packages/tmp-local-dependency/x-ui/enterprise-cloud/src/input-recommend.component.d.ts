import { PropType } from 'vue';
import { MessageContentInputRecommend } from './types';

declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<{
    content: {
        type: PropType<MessageContentInputRecommend>;
        required: true;
    };
    onPick: {
        type: PropType<(text: string) => void>;
        default: undefined;
    };
}>, () => import("vue/jsx-runtime").JSX.Element, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<{
    content: {
        type: PropType<MessageContentInputRecommend>;
        required: true;
    };
    onPick: {
        type: PropType<(text: string) => void>;
        default: undefined;
    };
}>> & Readonly<{}>, {
    onPick: (text: string) => void;
}, {}, {}, {}, string, import('vue').ComponentProvideOptions, true, {}, any>;
export default _default;

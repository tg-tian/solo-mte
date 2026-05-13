import { PropType } from 'vue';
import { MessageContentUserAuth } from './types';

declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<{
    content: {
        type: PropType<MessageContentUserAuth>;
        required: true;
    };
    onConfirm: {
        type: PropType<(optionId: string, name: string, message?: string) => void>;
        default: undefined;
    };
}>, () => import("vue/jsx-runtime").JSX.Element, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<{
    content: {
        type: PropType<MessageContentUserAuth>;
        required: true;
    };
    onConfirm: {
        type: PropType<(optionId: string, name: string, message?: string) => void>;
        default: undefined;
    };
}>> & Readonly<{}>, {
    onConfirm: (optionId: string, name: string, message?: string) => void;
}, {}, {}, {}, string, import('vue').ComponentProvideOptions, true, {}, any>;
export default _default;

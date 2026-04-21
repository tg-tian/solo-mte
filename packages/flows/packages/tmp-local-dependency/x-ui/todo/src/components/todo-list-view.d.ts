import { TodoWorkItem } from '../composition/type';

/** 待办列表组件 - 可复用 */
declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<{
    items: {
        type: import('vue').PropType<TodoWorkItem[]>;
        default: () => never[];
    };
}>, () => import("vue/jsx-runtime").JSX.Element | null, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<{
    items: {
        type: import('vue').PropType<TodoWorkItem[]>;
        default: () => never[];
    };
}>> & Readonly<{}>, {
    items: TodoWorkItem[];
}, {}, {}, {}, string, import('vue').ComponentProvideOptions, true, {}, any>;
export default _default;

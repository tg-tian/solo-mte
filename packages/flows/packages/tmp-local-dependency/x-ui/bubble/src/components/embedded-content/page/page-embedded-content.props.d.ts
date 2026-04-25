import { CSSProperties, ExtractPropTypes, PropType } from 'vue';

export declare const pageEmbeddedContentProps: {
    /** 页面URL */
    pageUrl: {
        type: PropType<string>;
        required: boolean;
    };
    /** 组件自定义样式 */
    customStyle: {
        type: PropType<CSSProperties>;
        default: () => {};
    };
    /** 导航事件回调 */
    onNavigate: {
        type: PropType<(url: string) => void>;
        default: undefined;
    };
};
export type PageEmbeddedContentProps = ExtractPropTypes<typeof pageEmbeddedContentProps>;

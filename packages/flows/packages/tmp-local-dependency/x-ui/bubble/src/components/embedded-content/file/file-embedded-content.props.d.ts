import { CSSProperties, ExtractPropTypes, PropType } from 'vue';
import { Attachment } from '../../../composition/types';

export declare const fileEmbeddedContentProps: {
    /** 文件附件 */
    file: {
        type: PropType<Attachment>;
        required: boolean;
    };
    /** 组件自定义样式 */
    customStyle: {
        type: PropType<CSSProperties>;
        default: () => {};
    };
    /** 文件项点击回调 */
    onItemClick: {
        type: PropType<(attachment: Attachment) => void>;
        default: undefined;
    };
};
export type FileEmbeddedContentProps = ExtractPropTypes<typeof fileEmbeddedContentProps>;

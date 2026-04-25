import { ExtractPropTypes, PropType, VNode, CSSProperties } from 'vue';
import { AppearanceType, BasePromptItemType, PromptShowType } from '../composition/type';

export declare const promptProps: {
    /** 唯一标识 */
    id: {
        type: (StringConstructor | NumberConstructor)[];
        default: string;
    };
    /** 提示图标
     *  支持：图标字符、图片 URL、VNode
    */
    icon: {
        type: PropType<string | VNode>;
        default: string;
    };
    /** 提示标签 */
    label: {
        type: PropType<string | VNode>;
        default: string;
    };
    /** 提示描述 */
    description: {
        type: PropType<string | VNode>;
        default: string;
    };
    badge: {
        type: PropType<string | VNode>;
        default: string;
    };
    /** 是否禁用 */
    disabled: {
        type: BooleanConstructor;
        default: boolean;
    };
    /** 子项（嵌套） */
    children: {
        type: PropType<BasePromptItemType[]>;
        default: () => never[];
    };
    /** 自定义样式 key: value */
    styles: {
        type: PropType<Record<AppearanceType, CSSProperties | string>>;
    };
    /** 自定义样式类名 key: value*/
    classNames: {
        type: PropType<Record<AppearanceType, string | string[] | Record<string, boolean>>>;
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
    /**
     * standard-feature-card ：标准规格功能卡片
     * primary-feature-card：核心主功能卡尺寸大
     * compact-feature-card：紧凑型功能卡片
     * standard-question-item：标准规格问题项
     * default-text-item：标准规格文本项
     */
    showType: {
        type: PropType<PromptShowType>;
        default: PromptShowType;
    };
    gap: {
        type: (StringConstructor | NumberConstructor)[];
    };
    /** 点击整项回调（演示/列表场景） */
    onClick: {
        type: PropType<(ev: MouseEvent) => void>;
        required: boolean;
    };
};
export type PromptProps = ExtractPropTypes<typeof promptProps>;

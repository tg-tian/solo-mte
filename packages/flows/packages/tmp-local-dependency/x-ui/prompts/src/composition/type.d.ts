import { VNode } from 'vue';

export declare enum PromptShowType {
    standardFeatureCard = "standard-feature-card",
    primaryFeatureCard = "primary-feature-card",
    compactFeatureCard = "compact-feature-card",
    standardQuestionItem = "standard-question-item",
    functionEntryItem = "function-entry-item",
    defaultTextItem = "default-text-item",
    hasNestEntryItem = "has-nest-entry-item",
    likeButtonEntryItem = "like-button-entry-item",
    none = ""
}
export interface BasePromptItemType {
    /** 唯一标识用于区分每个提示项 */
    id?: string | number;
    /** 提示图标显示在提示项的左侧 */
    icon?: string | VNode;
    /** 提示标签显示提示的主要内容 */
    label?: string | VNode;
    /** 提示描述提供额外的信息 */
    description?: string | VNode;
    /** 设置为 true 时禁用点击事件 */
    disabled?: boolean;
    showType?: PromptShowType;
    customClass?: Partial<string | string[] | Record<string, boolean>>;
    customStyle?: string;
    badge?: string | VNode;
    [key: string]: any;
}
export interface PromptItemType extends BasePromptItemType {
    children?: BasePromptItemType[];
}
export type AppearanceType = "root" | "items" | "item" | "itemContent" | "title" | "subItems" | "subItem" | "icon" | "label" | "badge" | "description";

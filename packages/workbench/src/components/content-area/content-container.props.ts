import { ExtractPropTypes } from "vue";

export const contentContainerProps = {
    /** 功能菜单标识 */
    id: { type: String, default: '' },
    /** 功能菜单页面Url地址 */
    url: { type: String, default: '' }
} as Record<string, any>;

export type ContentContainerProps = ExtractPropTypes<typeof contentContainerProps>;

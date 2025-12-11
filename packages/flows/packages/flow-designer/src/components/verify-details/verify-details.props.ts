import type { ExtractPropTypes, PropType } from 'vue';

export interface ValidationError {
    /** 错误提示文本 */
    message: string;

    /** 错误字段的名称 */
    fieldName?: string;

    [key: string]: any;
}

export interface ChecklistItem {
    /** 唯一标识 */
    id: string;

    /** 显示的图标 */
    icon?: string;

    /** 显示的名称 */
    name: string;

    /** 错误列表 */
    errors: ValidationError[];

    [key: string]: any;
}

export const verifyDetailsProps = {

    /** 检查清单 */
    list: { type: Array as PropType<ChecklistItem[]> },
};

export type VerifyDetailsProps = ExtractPropTypes<typeof verifyDetailsProps>;

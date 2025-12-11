import type { ExtractPropTypes, PropType } from 'vue';
import type { Parameter } from '@farris/flow-devkit/types';

export const paramTagListProps = {
    /** 属性列表 */
    params: { type: Array as PropType<Parameter[]> },

    /** 显示的标题 */
    fieldName: { type: String },
};

export type ParamTagListProps = ExtractPropTypes<typeof paramTagListProps>;

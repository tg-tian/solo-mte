import type { ExtractPropTypes, PropType } from 'vue';
import type { ValueExpress } from '@farris/flow-devkit/types';

export const singleParamValueTagProps = {
    /** 待显示的参数值 */
    value: { type: Object as PropType<ValueExpress> },

    /** 显示的标题 */
    fieldName: { type: String },
};

export type SingleParamValueTagProps = ExtractPropTypes<typeof singleParamValueTagProps>;

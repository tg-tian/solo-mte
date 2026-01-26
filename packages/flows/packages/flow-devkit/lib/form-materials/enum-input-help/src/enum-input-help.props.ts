import type { ExtractPropTypes, PropType } from 'vue';
import type { EnumInputHelp } from '@farris/flow-devkit/types';

export const enumInputHelpProps = {
    /** `下拉选项`输入帮助 */
    modelValue: { type: Object as PropType<EnumInputHelp> },
};

export type EnumInputHelpProps = ExtractPropTypes<typeof enumInputHelpProps>;

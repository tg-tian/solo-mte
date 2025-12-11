import type { ExtractPropTypes, PropType } from 'vue';
import type { TypeRefer } from '@farris/flow-devkit/types';

export const TYPE_SELECTOR_NAME = 'FvfTypeSelector';

export const typeSelectorProps = {
    /** 绑定值 */
    modelValue: { type: Object as PropType<TypeRefer> },
    /** 是否只读 */
    readonly: { type: Boolean, default: false },
    /** 是否禁用 */
    disabled: { type: Boolean, default: false },
};

export type TypeSelectorProps = ExtractPropTypes<typeof typeSelectorProps>;

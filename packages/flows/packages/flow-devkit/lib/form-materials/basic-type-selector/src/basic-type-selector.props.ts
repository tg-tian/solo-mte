import type { ExtractPropTypes } from 'vue';

export const BASIC_TYPE_SELECTOR_NAME = 'FvfBasicTypeSelector';

export const basicTypeSelectorProps = {
    /** 绑定值 */
    modelValue: { type: String },
    /** 是否只读 */
    readonly: { type: Boolean, default: false },
    /** 禁用`Object`相关的选项 */
    disableObjectOptions: { type: Boolean, default: false },
};

export type BasicTypeSelectorProps = ExtractPropTypes<typeof basicTypeSelectorProps>;

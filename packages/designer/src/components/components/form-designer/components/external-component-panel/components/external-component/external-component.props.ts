import { ExtractPropTypes } from "vue";

export const externalComponentProps = {
    id: { type: String, default: '' },
    modelValue: { type: Object, default: {} },
    isSelected: { type: Boolean, default: false },
} as Record<string, any>;

export type ExternalComponentProps = ExtractPropTypes<typeof externalComponentProps>;


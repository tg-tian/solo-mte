import { ExtractPropTypes } from "vue";

export const externalComponentPanelProps = {
    id: { type: String, default: '' },
    modelValue: { type: Object },
    width: { type: Number, default: 900 },
    maxHeight: { type: Number, default: 430 },
} as Record<string, any>;

export type ExternalComponentPanelProps = ExtractPropTypes<typeof externalComponentPanelProps>;

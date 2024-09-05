import { ExtractPropTypes } from "vue";

export const viewModelDesignerProps = {
    schema: { type: Object, default: {} }
} as Record<string, any>;

export type ViewModelDesignerProps = ExtractPropTypes<typeof viewModelDesignerProps>;

import { ExtractPropTypes } from "vue";

export const flowDesignerProps = {
    schema: { type: Object, default: {} }
} as Record<string, any>;

export type FlowDesignerProps = ExtractPropTypes<typeof flowDesignerProps>;

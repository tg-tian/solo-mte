import { ExtractPropTypes } from "vue";

export const designerProps = {
    schema: { type: Object, default: {} }
} as Record<string, any>;

export type DesignerProps = ExtractPropTypes<typeof designerProps>;

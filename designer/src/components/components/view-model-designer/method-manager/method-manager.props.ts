import { ExtractPropTypes } from "vue";

export const methodManagerProps = {
    schema: { type: Object, default: {} }
} as Record<string, any>;

export type MethodManagerProps = ExtractPropTypes<typeof methodManagerProps>;

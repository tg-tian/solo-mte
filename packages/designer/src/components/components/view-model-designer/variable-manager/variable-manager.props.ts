import { ExtractPropTypes } from "vue";

export const variableManagerProps = {
    schema: { type: Object, default: {} }
} as Record<string, any>;

export type VariableManagerProps = ExtractPropTypes<typeof variableManagerProps>;

import { ExtractPropTypes } from "vue";

export const formDesignerProps = {
    schema: { type: Object, default: {} }
} as Record<string, any>;

export type FormDesignerProps = ExtractPropTypes<typeof formDesignerProps>;

import { ExtractPropTypes } from "vue";

export const customClassEditorProps = {
    isActive: { type: Boolean, default: false },
} as Record<string, any>;

export type CustomClassEditorProps = ExtractPropTypes<typeof customClassEditorProps>;

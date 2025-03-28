import { ExtractPropTypes } from "vue";

export const formSettingsDesignerProps = {
    schema: { type: Object, default: {} }
} as Record<string, any>;

export type FormSettingsDesignerProps = ExtractPropTypes<typeof formSettingsDesignerProps>;

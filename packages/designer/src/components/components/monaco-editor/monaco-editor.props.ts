import { ExtractPropTypes } from "vue";

export const monacoEditorProps = {
    modelValue: { type: String, default: '' },
    language: { type: String, default: 'typescript' },
    theme: { type: String, default: 'vs-dark' },
    readOnly: { type: Boolean, default: false },
    isActive: { type: Boolean, default: false },
};

export type MonacoEditorProps = ExtractPropTypes<typeof monacoEditorProps>;

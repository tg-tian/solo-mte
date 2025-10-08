import { ExtractPropTypes } from "vue";

export const codeEditorProps = {
    modelValue:{ type: String, default: ''},
    language:{ type: String, default: 'typescript'},
    theme: { type: String, default: 'vs-dark' }
};

export type CodeEditorProps = ExtractPropTypes<typeof codeEditorProps>;

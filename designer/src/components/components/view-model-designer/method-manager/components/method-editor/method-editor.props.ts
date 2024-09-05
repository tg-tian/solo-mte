import { ExtractPropTypes } from "vue";
import { Command } from "../../entity/command";

export const methodEditorProps = {
    command: { type: Command },
    activeViewModel: { type: Object, default: [] }
} as Record<string, any>;

export type MethodEditorProps = ExtractPropTypes<typeof methodEditorProps>;

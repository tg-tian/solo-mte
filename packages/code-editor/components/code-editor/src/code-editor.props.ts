import { ExtractPropTypes, PropType } from "vue";

export const codeEditorProps = {
    modelValue: { type: String, default: '' },
    language: { type: String, default: 'typescript' },
    theme: { type: String, default: 'vs-dark' },
    // AI 代码补全配置
    aiCompletion: {
        type: Object as PropType<{
            enabled?: boolean;
            endpoint?: string;
            auth?: {
                token?: string;
                uuid?: string;
                machineId?: string;
                userName?: string;
            };
            projectRoot?: string;
            debounceDelay?: number;
            timeout?: number;
            pollingTimeout?: number;
            predictMode?: 'short' | 'long' | 'full' | 'only_single_line';
        }>,
        default: () => ({ enabled: false })
    }
};

export type CodeEditorProps = ExtractPropTypes<typeof codeEditorProps>;

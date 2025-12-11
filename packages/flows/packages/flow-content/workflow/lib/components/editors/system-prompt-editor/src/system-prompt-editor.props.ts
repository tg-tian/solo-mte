import { type ExtractPropTypes } from 'vue';
import { createPropsResolver } from '@farris/ui-vue';
import systemPromptEditorSchema from './schema/system-prompt-editor.schema.json';

/**
 * 系统提示词编辑器的属性定义
 */
export const systemPromptEditorProps = {
  modelValue: {
    type: String,
    default: ''
  },
} as const;

export type SystemPromptEditorProps = ExtractPropTypes<typeof systemPromptEditorProps>;
export const propsResolver = createPropsResolver(systemPromptEditorProps, systemPromptEditorSchema);

import { type ExtractPropTypes } from 'vue';
import { createPropsResolver } from '@farris/ui-vue';
import userPromptEditorSchema from './schema/user-prompt-editor.schema.json';

/**
 * 用户提示词编辑器的属性定义
 */
export const userPromptEditorProps = {
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: '请输入用户提示词，可以使用{{}}引用输入变量'
  },
  title: {
    type: String,
    default: '用户提示词'
  }
} as const;

export type UserPromptEditorProps = ExtractPropTypes<typeof userPromptEditorProps>;
export const propsResolver = createPropsResolver(userPromptEditorProps, userPromptEditorSchema);

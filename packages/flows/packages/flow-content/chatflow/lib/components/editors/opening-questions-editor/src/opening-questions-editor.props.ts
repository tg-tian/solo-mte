import { type PropType, type ExtractPropTypes } from 'vue';

export interface OpeningQuestion {
  id: string;
  text: string;
}

export const openingQuestionsEditorProps = {
  /** 问题列表 */
  modelValue: {
    type: Array as PropType<OpeningQuestion[]>,
    default: () => []
  },
  /** 输入框占位符 */
  placeholder: {
    type: String,
    default: '请输入问题内容'
  },
  /** 最大字符长度 */
  maxLength: {
    type: Number,
    default: 500
  },
  /** 最大问题数量 */
  maxQuestions: {
    type: Number,
    default: 5
  }
};

export type OpeningQuestionsEditorProps = ExtractPropTypes<typeof openingQuestionsEditorProps>;
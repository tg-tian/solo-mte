import { type ExtractPropTypes, type PropType } from 'vue';
import { createPropsResolver } from '@farris/ui-vue';
import knowledgeSelectorSchema from './schema/knowledge-selector.schema.json';

/**
 * 知识库选择器的属性定义
 */
export const knowledgeSelectorProps = {
  modelValue: {
    type: Array as PropType<Array<{ kbId: string; kbName: string}>>,
    default: () => []
  },
} as const;

export type KnowledgeSelectorProps = ExtractPropTypes<typeof knowledgeSelectorProps>;
export const propsResolver = createPropsResolver(knowledgeSelectorProps, knowledgeSelectorSchema);

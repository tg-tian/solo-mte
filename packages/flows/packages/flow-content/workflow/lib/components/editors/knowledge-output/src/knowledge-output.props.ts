import { PropType } from 'vue';

/**
 * 知识输出项接口
 */
export interface KnowledgeOutputItem {
  /** 输出内容 */
  output: string;
  /** 文档ID */
  documentId: string;
}

/**
 * 知识输出组件属性
 */
export interface KnowledgeOutputProps {
  /** 输出列表数据 */
  modelValue?: Array<KnowledgeOutputItem>;
}

/**
 * 知识输出组件属性配置
 */
export const knowledgeOutputProps = {
  modelValue: {
    type: Array as PropType<KnowledgeOutputItem[]>,
    default: () => []
  }
} as const;

/**
 * 知识输出组件名称
 */
export const KNOWLEDGE_OUTPUT_NAME = 'KnowledgeOutput';

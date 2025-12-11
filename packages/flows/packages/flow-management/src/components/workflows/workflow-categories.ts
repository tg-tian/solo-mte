import { ref } from 'vue';
import { getFlowKindList } from '@/api';

export interface WorkflowCategory {
  /** 流程类型 */
  value: string;
  /** 流程类型的名称 */
  label: string;
  /** 流程类型的图标 */
  icon: string;
}

// 流程分类
export const WORKFLOW_CATEGORIES = ref<WorkflowCategory[]>([]);

export async function updateWorkflowCategories(): Promise<void> {
  const flowKinds = await getFlowKindList();
  WORKFLOW_CATEGORIES.value = (flowKinds.data || []).map((flowKind) => ({
    value: flowKind.id,
    label: flowKind.name || flowKind.code,
    icon: flowKind.iconUrl,
  }));
}

updateWorkflowCategories();

// 获取分类标签的工具函数
export const getWorkflowCategoryLabel = (value: string): string => {
  const workflowCategory = WORKFLOW_CATEGORIES.value.find(item => item.value === value);
  return workflowCategory?.label ?? value;
};

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import StatusTabs from './status-tabs.vue';
import CategorySelector from './category-selector.vue';
import WorkflowCard from './workflow-card.vue';
import type { WorkflowItem } from '@/types/workflow';
import { deleteWorkflow, copyWorkflow, createWorkflow } from '@/api/workflow';
import { WORKFLOW_CATEGORIES } from './workflow-categories';
import { MenuUtils } from '@/utils';
import { useNotify } from '@/utils/use-notify';

// 定义组件props
const props = defineProps<{
  workflows?: WorkflowItem[];
  searchKeyword?: string;
}>();

const emit = defineEmits<{
  (e: 'refreshWorkflows'): void;
}>();

// 状态和分类选择变量
const currentStatus = ref('all'); // 默认为'all'
const currentCategory = ref('all'); // 默认为'all'

// 处理状态切换
const handleStatusChange = (status: string) => {
  currentStatus.value = status;
};

// 处理分类切换
const handleCategoryChange = (categoryKey: string) => {
  currentCategory.value = categoryKey;
};

onMounted(() => {
});

// 计算最终要显示的流程数据
// 优先使用传入的workflows，如果为空则使用mock数据
const displayWorkflows = computed(() => {
  const dataToUse = props.workflows || []

  let filteredData = dataToUse;

  // 1. 根据状态筛选
  if (currentStatus.value !== 'all') {
    filteredData = filteredData.filter(item => {
      // 如果 releaseStatus 为 undefined，视为未发布（状态'0'）
      const status = item.releaseStatus !== undefined ? item.releaseStatus : '0';
      return status === currentStatus.value;
    });
  }

  // 2. 根据分类筛选
  if (currentCategory.value !== 'all') {
    // 使用流程分类常量来筛选
    const targetType = currentCategory.value;
    // 检查目标类型是否在流程分类中
    if (WORKFLOW_CATEGORIES.value.some(category => category.value === targetType)) {
      filteredData = filteredData.filter(item => item.kind === targetType);
    }
  }

  // 3. 根据搜索关键词筛选
  if (props.searchKeyword && props.searchKeyword.trim()) {
    const keyword = props.searchKeyword.trim().toLowerCase();
    filteredData = filteredData.filter(item =>
      item.name.toLowerCase().includes(keyword) ||
      (item.description && item.description.toLowerCase().includes(keyword))
    );
  }

  return filteredData;
});

// 是否显示无数据提示
const showEmptyState = computed(() => {
  return displayWorkflows.value.length === 0;
});

// 无数据提示文本
const emptyStateText = computed(() => {
  if (props.searchKeyword && props.searchKeyword.trim()) {
    return '未找到匹配的流程';
  }
  if (currentStatus.value !== 'all') {
    return '该状态下暂无流程';
  }
  if (currentCategory.value !== 'all') {
    return '该分类下暂无流程';
  }
  return '暂无流程，请先创建流程';
});

import { inject } from 'vue'
const MessageBoxService:any = inject('FMessageBoxService');
const notifyService = useNotify();

// 处理复制流程
const handleCopy = async (data: WorkflowItem) => {
  try {
    // 调用复制接口
    const response = await copyWorkflow(data.id);

    if (response.success) {
      // 复制成功后，进入编辑状态
      await createWorkflow(response.data!)
      handleEdit(response.data!.id, response.data!.name);
    } else {
      // 显示错误提示
      console.error('流程复制失败:', response.error || '未知错误');
      // 显示错误通知
      notifyService.error(response.error || '复制流程失败，请稍后重试');
    }
  } catch (error: any) {
    console.error('复制流程时发生错误:', error);
    // 显示错误通知
    notifyService.error(error.Message || '复制流程失败，请稍后重试');
  }
};

// 处理删除流程
const handleDelete = async (id: string) => {
  // 显示确认对话框
  MessageBoxService.question('确定要删除这个流程吗？此操作不可撤销。','',async () => {
    try {
      // 调用删除接口
      const response = await deleteWorkflow(id);

      if (response.success) {
        // 删除成功后，通知父组件重新获取流程列表
        emit('refreshWorkflows');
      } else {
        // 显示错误通知
        notifyService.error(response.error || '删除流程失败，请稍后重试');
      }
    } catch (error: any) {
      console.error('删除流程时发生错误:', error);
      // 显示错误通知
      notifyService.error(error.Message || '删除流程失败，请稍后重试');
    }
  }, () => {
    // 取消删除操作
  });
};

// 处理编辑流程
const handleEdit = (flowId: string, flowName: string) => {
  if (!flowId) {
    return;
  }
  MenuUtils.editFlowMetadata(flowId, flowName);
};
</script>

<template>
  <div class="workflow-list-container">
    <div class="header-container">
        <CategorySelector @category-change="handleCategoryChange" />
        <StatusTabs @tab-change="handleStatusChange" />
    </div>
    <div class="card-list" :class="{ 'empty-state-container': showEmptyState && displayWorkflows.length === 0 }">
        <WorkflowCard
          v-for="item in displayWorkflows"
          :key="item.id"
          :data="item"
          @delete="handleDelete"
          @copy="handleCopy"
          @edit="handleEdit"
          @refreshWorkflows="emit('refreshWorkflows')"
        />

        <!-- 无数据提示 -->
        <div v-if="showEmptyState" class="empty-state">
          <div class="empty-icon">
            <i class="f-icon f-icon-folder-open"></i>
          </div>
          <p class="empty-text">{{ emptyStateText }}</p>
          <p class="empty-hint" v-if="!props.searchKeyword">
            点击上方按钮创建新的流程
          </p>
        </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.workflow-list-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.header-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    flex-shrink: 0;
}

.card-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 320px));
  grid-auto-rows: min-content;
  gap: 20px;
  padding: 0 12px;
  width: 100%;
  box-sizing: border-box;
  position: relative;
  align-content: start; /* 控制网格内容在垂直方向的对齐 */
  justify-content: start;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  content-visibility: auto;

  /* 空状态时居中显示 */
  &.empty-state-container {
    align-content: center;
    justify-content: center;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 200px;
  color: #999;
  text-align: center;
  grid-column: 1 / -1; /* 让空状态跨越所有列 */

  .empty-icon {
    font-size: 48px;
    color: #d9d9d9;
    margin-bottom: 16px;

    i {
      font-size: 48px;
    }
  }

  .empty-text {
    font-size: 16px;
    color: #666;
    margin: 0 0 8px 0;
  }

  .empty-hint {
    font-size: 14px;
    color: #999;
    margin: 0;
  }
}
</style>

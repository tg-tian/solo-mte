<template>
  <div class="smart-service-card">
    <!-- 卡片头部 -->
    <div class="card-header">
      <div class="header-content">
        <!-- 图标占位符 -->
        <div class="service-icon">
          <img class="service-type-icon" :src="serviceIcon" alt="">
        </div>

        <div class="service-info">
          <div class="title-row">
            <h3 class="service-title">{{ data.name }}</h3>
            <span :class="getStatusClass(data.releaseStatus)">
              {{ getStatusText(data.releaseStatus) }}
            </span>
          </div>
          <p class="service-desc">{{ data.description }}</p>
        </div>
      </div>
    </div>

    <!-- 卡片底部操作区 -->
    <div class="card-bottom">
      <div class="card-type">
        <img class="card-type-icon" :src="typeIcon" alt="">
        <span>{{ getWorkflowCategoryLabel(data.kind) }}</span>
      </div>
      <div class="card-actions">
        <button class="action-btn" @click="handleEdit">
          <img src="@/assets/images/edit.svg" alt="" title="编辑">
        </button>

        <button class="action-btn" @click="handleCopy">
          <img src="@/assets/images/copy.svg" alt="" title="复制">
        </button>

        <button class="action-btn" @click="handleDelete">
          <img src="@/assets/images/delete.svg" alt="" title="删除">
        </button>

        <button class="publish-btn" @click="handlePublish">
          <img src="@/assets/images/publish.svg" alt="" title="发布">
        </button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import type { WorkflowItem } from '@/types/workflow';
import { computed, inject } from 'vue';
import { WORKFLOW_CATEGORIES, getWorkflowCategoryLabel } from './workflow-categories';
import { publishWorkflow } from '@/api/workflow';
import flowGreenIcon from '@/assets/images/flow-green.svg';
import flowBlueIcon from '@/assets/images/flow-blue.svg';
import flowCyanIcon from '@/assets/images/flow-cyan.svg';
import flowPurpleIcon from '@/assets/images/flow-purple.svg';
import flowYellowIcon from '@/assets/images/flow-yellow.svg';

// 组件属性定义
const props = defineProps<{
  data: WorkflowItem
}>();

// 组件事件定义
const emit = defineEmits<{
  chatflow: [];
  edit: [id: string, name: string];
  copy: [data: WorkflowItem];
  delete: [id: string];
  publish: [];
  refreshWorkflows: [];
}>();

const MessageBoxService: any = inject('FMessageBoxService');

const flowIcons = [flowGreenIcon, flowBlueIcon, flowCyanIcon, flowPurpleIcon, flowYellowIcon];

// 根据ID生成一个一致的随机索引
const getRandomIconIndex = (id: string) => {
  // 使用ID作为种子生成一个0-4之间的索引
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % flowIcons.length;
};

const serviceIcon = computed(() => {
  // 如果有上传的图标，使用上传的图标
  if (props.data.icon) {
    return props.data.icon;
  }
  // 随机选择一个图标（基于ID确保同一项目的图标一致）
  const randomIndex = getRandomIconIndex(props.data.id.toString());
  return flowIcons[randomIndex];
});

const typeIcon = computed(() => {
  const category = WORKFLOW_CATEGORIES.value.find(cat => cat.value === props.data.kind);
  return category?.icon || '';
});

// 处理编辑按钮点击
const handleEdit = () => {
  emit('edit', props.data.id, props.data.name);
};

// 处理复制按钮点击
const handleCopy = () => {
  emit('copy', props.data);
};

// 处理删除按钮点击
const handleDelete = () => {
  emit('delete', props.data.id);
};

// 处理发布按钮点击
const handlePublish = async () => {
  // 如果已经发布，不需要再次发布
  if (props.data.releaseStatus === '2') {
    MessageBoxService.info('该流程已经发布过了');
    return;
  }

  MessageBoxService.question(
    `确定要发布流程"${props.data.name}"吗？`,
    '发布后将对所有用户可见',
    async () => {
      try {
        // 调用发布接口
        const response = await publishWorkflow(props.data.id);

        if (response.success) {
          // 发布成功，显示成功提示
          MessageBoxService.success('流程发布成功！');
          // 通知父组件刷新流程列表
          emit('refreshWorkflows');
        } else {
          // 发布失败，显示错误提示
          MessageBoxService.error(`发布失败: ${response.error || '未知错误'}`);
        }
      } catch (error) {
        console.error('发布流程时发生错误:', error);
        MessageBoxService.error('发布过程中发生错误，请稍后重试');
      }
    },
    () => {
      console.log('用户取消了发布操作');
    }
  );
};

// 获取状态文本
const getStatusText = (status: string) => {
  switch (status) {
    case '0':
      return '未发布';
    case '1':
      return '当前版本未发布';
    case '2':
      return '已发布';
    default:
      return '未发布';
  }
};

// 获取状态样式类
const getStatusClass = (status: string) => {
  switch (status) {
    case '0':
      return 'status-badge unpublished';
    case '1':
      return 'status-badge current-unpublished';
    case '2':
      return 'status-badge published';
    default:
      return 'status-badge unpublished';
  }
};
</script>

<style scoped>
.smart-service-card {
  width: 320px;
  height: 160px;
  display: flex;
  flex-direction: column;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: all 0.2s ease;
  background-color: #fff;
  cursor: pointer;
}

.smart-service-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid #419BF9;
}

.card-header {
  padding: 16px;
  background-color: #fff;
  border: none;
  flex: 1;
  overflow: hidden;
}

.header-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.service-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background-color: #e6f4ff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.service-icon .service-type-icon {
  width: 40px;
  height: 40px;
}

.service-info {
  flex-grow: 1;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
}

.service-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}



.service-desc {
  font-size: 14px;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.card-actions {
  display: flex;
  align-items: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.smart-service-card:hover .card-actions {
  opacity: 1;
}

.card-type {
  color: #595959;
  padding: 4px 8px;
  border-radius: 4px;
  background-color: rgb(229 238 255 / 50%);
  font-size: 12px;
  display: flex;
  align-items: center;
}

.card-type-icon {
  width: 14px;
  height: 14px;
  margin-right: 4px;
}

.action-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 14px;
  background-color: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  margin: 0 4px;
  outline:0;
}

.action-btn:hover {
  background-color: #e2e8f0;
  color: #1e293b;
}

.publish-btn {
  margin-left: auto;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 18px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
  margin: 0 4px;
  outline:0;
}
/* 状态标签样式 */
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  border: 1px solid transparent;
  height: 20px;
  margin-left: 6px;
}

.status-badge.published {
  background-color: #E3F7F5;
  color: #33BA8F ;
}

.status-badge.unpublished {
  background-color: #ECECEC;
  color: #000;
}

.status-badge.current-unpublished {
  background-color: #FFF4E6;
  color: #FF8C00;
}

.card-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px 12px 16px;
  margin-top: 22px;
}
</style>

<script setup lang="ts">
import { computed, ref, defineEmits, inject, nextTick } from 'vue'
import { createWorkflow } from '@/api/workflow'
import { WORKFLOW_CATEGORIES, getWorkflowCategoryLabel } from '@/components/workflows/workflow-categories';
import { useNotify } from '@/utils/use-notify';

// 定义组件props
const props = defineProps<{
  currentSelectedNodeId: string,
  currentSelectedNodeName: string,
}>();

// 定义组件可发送的事件
const emit = defineEmits<{
  'workflow-search': [keyword: string],
  'refresh-workflows': [],
}>();

const searchQuery = ref('')
const searchIconContent = ref('<i class="f-icon f-icon-search"></i>');

const popoverRef = ref<any>();
const hostRef = ref<HTMLElement>();
const popoverInstance = computed(() => popoverRef);
const popoverVisible = ref(false);

// 注入消息提示服务
const MessageBoxService: any = inject('FMessageBoxService');
const notifyService = useNotify();

// 处理搜索
const handleSearch = () => {
  nextTick(() => {
    // 仅发送搜索关键词，让worklist自行筛选
    emit('workflow-search', searchQuery.value.trim());
  })
};

// 监听输入框变化，支持回车搜索
const onSearchInputKeyup = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    handleSearch();
  }
};

// 新建工作流或对话流
const createFlow = async function (type: string) {
  // 关闭弹出菜单
  popoverInstance.value?.value?.hide?.();

  // 设置当前流程类型并打开模态框
  currentFlowType.value = type
  modalVisible.value = true
}

// 模态框相关数据
const modalVisible = ref(false)
const currentFlowType = ref('workflow')
const workflowForm = ref({
  code: '',
  name: '',
  description: ''
})

// 提交表单创建流程
const submitWorkflowForm = async function () {

  try {
    // 调用API创建流程
    const response = await createWorkflow({
      bizTypeId: props.currentSelectedNodeId,
      code: workflowForm.value.code,
      name: workflowForm.value.name,
      description: workflowForm.value.description,
      kind: currentFlowType.value,
      nodes: [],
      edges: [],
      extension: {},
      version: 'v1'
    })

    if(!response.success){
      notifyService.error(response.error || '创建流程失败，请稍后重试');
      return
    }

    // 关闭模态框
    modalVisible.value = false

    // 重置表单
    workflowForm.value = {
      code: '',
      name: '',
      description: ''
    }
    // 刷新列表
    emit('refresh-workflows');

  } catch (error: any) {
    console.error('创建流程失败:', error)
    // 显示错误通知
    notifyService.error(error.Message || '创建流程失败，请稍后重试');
  }
}

const modalButtons = [{
  name: 'cancel',
  text: '取消',
  class: 'btn btn-secondary',
  handle: () => {
    modalVisible.value = false;
  },
}, {
  name: 'accept',
  text: '确定',
  class: 'btn btn-primary',
  handle: submitWorkflowForm,
}];
</script>

<template>
  <div class="header-container">
    <div class="header-left">
      {{ currentSelectedNodeName }}
    </div>

    <div class="header-right">
      <div class="search-wrapper">
        <f-button-edit
          class="search-input" size="small"
          placeholder="搜索"
          :button-content="searchIconContent"
          v-model="searchQuery"
          @keyup="onSearchInputKeyup"
          @input="handleSearch">
        </f-button-edit>
      </div>
      <div id="host" ref="hostRef"></div>

      <f-button
        v-popover:toggle="popoverInstance"
        type="primary"
        size="small"
        class="add-button">
        + 新建
      </f-button>

      <f-popover
        ref="popoverRef"
        :host="hostRef"
        :reference="popoverInstance.value"
        placement="bottom-left"
        :min-width="150"
        :visible="popoverVisible">
        <div class="work-list">
            <div v-for="item in WORKFLOW_CATEGORIES" class="work-item" :key="item.value" @click="createFlow(item.value)">
                <img :src="item.icon" alt="流程图标" class="work-item-icon">
                {{ item.label }}
            </div>
        </div>
      </f-popover>

      <f-modal
        :title="`新建${getWorkflowCategoryLabel(currentFlowType)}`"
        v-model="modalVisible"
        :width="500"
        :buttons="modalButtons"
      >
        <div class="workflow-form">
          <div class="form-item">
            <label class="form-label">编号</label>
            <f-input-group v-model="workflowForm.code" placeholder="请输入流程编号" />
          </div>
          <div class="form-item">
            <label class="form-label">名称</label>
            <f-input-group v-model="workflowForm.name" placeholder="请输入流程名称" />
          </div>
          <div class="form-item">
            <label class="form-label">简介</label>
            <f-input-group type="textarea" v-model="workflowForm.description" placeholder="请输入流程简介" :rows="3" />
          </div>
        </div>
      </f-modal>
    </div>
  </div>
</template>

<style scoped lang="scss">
.workflow-form {
  padding: 20px;
}

.form-item {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.header-container {

  .work-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    transition: background-color 0.2s ease;
    cursor: pointer;
  }

  .work-item:hover {
    background-color: #f0f9ff;
    border-radius: 4px;
  }

  .work-item-icon {
    width: 16px;
    height: 16px;
  }

  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  flex: 1;
  font-size: 17px;
  font-weight: 500;
  font-family: auto;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

::v-deep(.input-group .form-control) {
  width: 255px;
}

.search-wrapper {
  position: relative;
  display: inline-block;
}

.clear-search-icon {
  position: absolute;
  right: 40px;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  color: #9CA3AF;

  &:hover {
    color: #6B7280;
  }
}

.add-button {
  width: 109px;
  font-size: 13px;
  padding: 2px 0;
}

.work-item {
  font-size: 16px;
  margin-bottom: 15px;
  color: #575A5F;
  cursor: pointer;
}
</style>

<script setup lang="ts">
import Sidebar from './side-bar.vue'
import Header from './header.vue'
import WorkflowList from '../workflows/workflow-list.vue'
import type { WorkflowItem } from '@/types/workflow';
import { ref, onMounted } from 'vue';
import { getWorkflowList } from '@/api/workflow';
import { MenuUtils } from '@/utils';
import axios from 'axios';

// 侧边栏显示状态
const sidebarVisible = ref(false);

// 切换侧边栏显示状态
const toggleSidebar = () => {
  sidebarVisible.value = !sidebarVisible.value;
};

// 流程数据
const workflows = ref<WorkflowItem[]>([]);

// 搜索关键词
const searchKeyword = ref('');

// 处理搜索
const handleSearch = (keyword: string) => {
  searchKeyword.value = keyword;
};

// 处理流程列表刷新事件
const handleRefreshWorkflows = () => {
  if (currentSelectedNodeId.value) {
    getWorkflowList(currentSelectedNodeId.value).then(response => {
      if (response.success) {
        workflows.value = response.data || [];
      }
    }).catch(error => {
      console.error('刷新流程列表失败:', error);
    });
  };
};

// 当前选中的节点ID
const currentSelectedNodeId = ref('');
// 当前选中节点的的名称
const currentSelectedNodeName = ref('');

// 处理侧边栏选择变化
const handleSelectionChange = (node: any) => {
  // 保存当前选中的节点ID
  currentSelectedNodeId.value = node.id;
  // 保存当前选中节点的名称
  currentSelectedNodeName.value = node.name;

  getWorkflowList(node.id).then(response => {
    workflows.value = response.data || [];
  }).catch(error => {
    console.error('获取流程列表失败:', error);
  });
};

function initialize() {
  return new Promise((resolve, reject) => {
    const queryParams = new URLSearchParams(window.location.search);
    const boId = queryParams.get('boId') || '';
    if (boId) {
      const resourceUri = `/api/runtime/sys/v1.0/business-objects/${boId}`;
      axios.get(resourceUri).then((response) => {
        const resourceData = response.data as Record<string, any>;
        const { id, name } = resourceData;
        handleSelectionChange(resourceData)
        resolve(true);
      });
    }
  });
}

function listenTabSwitchEvent(): void {
  const options = MenuUtils.getQueryParams();
  const onTabSwitched = (event: any) => {
    if (!event) {
      return;
    }
    const eventTabId = event.tabId || event.id || null;
    if (!eventTabId) {
      return;
    }
    const tabId = options.tabId || options.funcId;
    if (tabId && tabId === eventTabId) {
      handleRefreshWorkflows();
    }
  };
  MenuUtils.listenTabSwitchEvent(onTabSwitched, options);
}

onMounted(() => {
  initialize().then(() => {
    listenTabSwitchEvent();
  });
});
</script>

<template>
  <div class="layout-container" :class="{ 'sidebar-hidden': !sidebarVisible }">
    <!-- 侧边栏 -->
    <!-- <Sidebar class="sidebar-container" @selection-change="handleSelectionChange" v-show="sidebarVisible" /> -->

    <div class="right-container">
      <!-- 侧边栏切换按钮 -->
      <!-- <div class="sidebar-toggle-btn" @click="toggleSidebar" :class="{ 'expanded': !sidebarVisible }">
        <i class="f-icon f-icon-arrow-chevron-left"></i>
      </div> -->

      <!-- 头部 -->
      <Header class="header-container" :current-selected-node-id="currentSelectedNodeId" @workflow-search="handleSearch"
        @refresh-workflows="handleRefreshWorkflows" :current-selected-node-name="currentSelectedNodeName" />

      <!-- 主内容区 -->
      <WorkflowList class="main-content" :workflows="workflows" :search-keyword="searchKeyword"
        @refresh-workflows="handleRefreshWorkflows" />
    </div>
  </div>
</template>

<style scoped>
.layout-container {
  display: flex;
  margin: 0.5rem;
  border-radius: 12px;
}

.sidebar-container {
  position: absolute;
  width: 20%;
  padding: 0 20px;
  border-top-left-radius: 12px;
  border-bottom-left-radius: 12px;
  z-index: 1;
  transition: transform 0.3s ease;
  transform: translateX(0);
}

.sidebar-container:not(:visible) {
  transform: translateX(-100%);
}

.right-container {
  position: relative;
  width: 81%;
  border-radius: 12px;
  padding: 25px 20px 25px 30px;
  background-color: #ffffff;
  margin-left: 19%;
  z-index: 1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  height: calc(100vh - 1rem);
  transition: all 0.3s ease;
}

/* 侧边栏隐藏时的右侧容器样式 */
.layout-container.sidebar-hidden .right-container {
  width: 100%;
  margin-left: 0;
  border-top-left-radius: 12px;
  border-bottom-left-radius: 12px;
}

.header-container {
  padding: 0 20px;
  flex: 1;
}

.main-content {
  padding: 20px;
  overflow-y: auto;
}

/* 侧边栏切换按钮样式 */
.sidebar-toggle-btn {
  position: absolute;
  left: -8px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 25px;
  border-radius: 5px;
  border: none;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
  transition: all 0.3s ease;
}

.sidebar-toggle-btn:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.sidebar-toggle-btn.expanded {
  left: 10px;
}

.sidebar-toggle-btn.expanded i {
  transform: rotate(180deg);
}

.sidebar-toggle-btn i {
  transition: transform 0.3s ease;
}
</style>

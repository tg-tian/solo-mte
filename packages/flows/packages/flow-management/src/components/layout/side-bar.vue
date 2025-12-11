<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { getComplexData } from '@/api/sidebar';
// import { complexData } from './data-demo'; // 保留静态数据作为默认值

const emit = defineEmits(['selection-change']);

// 定义响应式数据
const sidebarData = ref([]); // 默认使用静态数据
const errorMessage = ref('');

const treeNodeIconsData = {
    // 折叠状态
    fold: 'f-icon f-icon-folder text-info',
    // 展开状态
    unfold: 'f-icon f-icon-folder-open text-info',
    // 叶子节点
    leafnodes: 'f-icon f-icon-file text-info',
};

const onSelectionChange = (selectedNodes: any[]) => {
    emit('selection-change', selectedNodes[0]);
};

const treeViewComponentInstance = ref<any>();

// 获取侧边栏数据的方法
const fetchComplexData = async () => {
  errorMessage.value = '';

  const result = await getComplexData();
  if (result.success && result.data) {
    sidebarData.value = result.data as typeof sidebarData.value;
    treeViewComponentInstance.value.updateDataSource(sidebarData.value)
    treeViewComponentInstance.value.selectItem(0)

    onSelectionChange([result.data?.[0]])
  } else {
    // 如果API失败，保留默认的静态数据
    errorMessage.value = result.error || '获取数据失败';
    console.error('Failed to fetch complex data:', result.error);
  }
    sidebarData.value = []
};

// 组件挂载时获取数据
onMounted(() => {
  fetchComplexData();
});

</script>

<template>
  <div class="sidebar">
    <!-- 品牌区域 -->
    <div class="sidebar-logo">
      <img src="@/assets/images/title-icon.svg" alt="" class="logo-icon" />
      <span class="system-name">智能流程编排</span>
    </div>

    <!-- 导航菜单 -->
    <div class="all-menu">全部流程编排</div>

    <!-- 树状视图 -->
    <f-tree-view
      ref="treeViewComponentInstance"
      :data="sidebarData"
      :show-tree-node-icons="true"
      :tree-node-icons-data="treeNodeIconsData"
      :virtualized="true"
      :hierarchy="{
        cascadeOption: {
          autoCheckChildren: false,
          autoCheckParent: false,
          selectionRange: 'All',
        },
        collapseField: 'expanded',
        collapseTo: 99,
        parentIdField: 'parent',
      }"
      @selection-change="onSelectionChange"
    ></f-tree-view>
  </div>
</template>

<style scoped>
.sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 1rem);
  background: #fff;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  margin-top: 25px;
}

.all-menu {
  padding: 25px 0 16px;
  font-size: 13px;
  font-weight: bold;
}

.logo-icon {
  width: 30px;
  height: 30px;
  margin-right: 10px;
}

.system-name {
  font-size: 20px;
  font-weight: 500;
  color: #000;
  font-family: auto;
}

.sidebar-menu {
  flex: 1;
  border-right: none;
}
  .loading-container {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
  }

  .loading-spinner {
    color: #2A87FF;
    font-size: 14px;
  }

  .error-message {
    padding: 20px;
    background-color: #FFF5F5;
    color: #F53F3F;
    font-size: 14px;
    border-radius: 4px;
    margin: 0 10px;
  }

  .retry-button {
    margin-left: 10px;
    padding: 4px 12px;
    background-color: #2A87FF;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }

  .retry-button:hover {
    background-color: #1D70E8;
  }
</style>

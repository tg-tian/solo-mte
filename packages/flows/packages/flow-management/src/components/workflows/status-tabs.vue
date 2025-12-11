<script setup lang="ts">
import { ref } from 'vue';
import { defineEmits } from 'vue';

// 定义发出的事件
const emit = defineEmits(['tab-change']);

// 状态管理
const currentTab = ref('all'); // 默认选中"全部"
const tabs = [
  { label: '全部', value: 'all' },
  { label: '已发布', value: '2' },
  { label: '当前版本未发布', value: '1' },
  { label: '未发布', value: '0' }
];

// 方法定义
const handleTabChange = (value:string) => {
  currentTab.value = value;
  // 触发事件，让父组件知道标签切换了
  emit('tab-change', value);
};
</script>

<template>
  <div class="status-tabs">
    <button 
      v-for="tab in tabs" 
      :key="tab.value"
      :class="{ 'active': currentTab === tab.value }"
      @click="handleTabChange(tab.value)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<style scoped>
.status-tabs {
  display: inline-flex;
  border-radius: 6px;
  background-color: #f5f7fa;
  padding: 3px;
  font-size: 14px;
}

.status-tabs button {
  padding: 6px 16px;
  border: none;
  background: transparent;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.status-tabs button.active {
  background-color: #ffffff;
  color: #2A87FF;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(42, 135, 255, 0.3);
  outline:0
}

.status-tabs button:not(.active) {
  color: #4e5969;
  outline:0
}

.status-tabs button:not(.active):hover {
  color: #2A87FF;
}
</style>

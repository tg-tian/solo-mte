
<script setup lang="ts">
import { ref, computed } from 'vue';
import { defineEmits } from 'vue';
import { WORKFLOW_CATEGORIES } from './workflow-categories';

// 定义发出的事件
const emit = defineEmits(['category-change']);

// 定义分类列表
const categories = computed(() => [
  { key: 'all', value: '全部分类' },
  ...WORKFLOW_CATEGORIES.value.map(category => ({
    key: category.value,
    value: category.label,
  })),
]);

// 当前选中的分类
const currentCategory = ref('all');

// 处理分类变化
const handleCategoryChange = (categoryKey: string) => {
  currentCategory.value = categoryKey;
  // 触发事件，让父组件知道分类切换了
  emit('category-change', categoryKey);
};
</script>

<template>
  <div class="category-selector">
    <div
      v-for="(category, index) in categories"
      :key="index"
      :class="['category-item', { 'active': currentCategory === category.key }]"
      @click="handleCategoryChange(category.key)"
    >
      {{ category.value }}
    </div>
  </div>
</template>


<style scoped>
.category-selector {
  display: flex;
  gap: 8px;
  padding: 10px;
  border-radius: 5px;
  overflow-x: auto;
  white-space: nowrap;
}

.category-item {
  padding: 4px 12px;
  border-radius: 5px;
  font-size: 14px;
  color: #4e5969;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  font-size: 15px;
  color: #000000;
  font-weight: 400;
}

.category-item:hover {
  color: #1d2129;
  background-color: #f0f2f5;
}

.category-item.active {
  color: #2A87FF;
  background-color: rgba(216,233,255,0.9);
}

/* 移除滚动条但保留功能 */
.category-selector::-webkit-scrollbar {
  display: none;
}

.category-selector {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>

<template>
  <NodeWrapper :nodeProps="props" :width="260">
    <NodeContentWrapper>
      <NodeField name="输入">
        <ParamTagList fieldName="输入" :params="data.inputParams" />
      </NodeField>
      <NodeField name="输出">
        <ParamTagList fieldName="输出" :params="data.outputParams" />
      </NodeField>
      <NodeField name="分类">
        <div class="classifier-list">
          <div
            v-for="(classifier, index) in classifierConfigs"
            :key="classifier.categoryId || index"
            class="classifier-item"
            :class="{ 'has-empty-name': !classifier?.categoryName?.trim(), 'even-row': index % 2 === 0, 'odd-row': index % 2 === 1 }"
          >
            <div
              class="classifier-name"
              :title="String(classifier?.categoryName || '未命名分类')"
            >
              {{ String(classifier?.categoryName || '未命名分类') }}
            </div>
            <!-- 动态输出端口 -->
            <div class="classifier-port-wrapper">
              <Port
                v-if="classifier.categoryId && typeof classifier.categoryId === 'string'"
                :id="`${classifier.categoryId}`"
                type="source"
                position="right"
                class="classifier-port"
                :removeAttachedEdgesOnUnmounted="true"
                :sortIndex="index"
              />
            </div>
          </div>
        </div>
      </NodeField>
    </NodeContentWrapper>
  </NodeWrapper>
</template>

<script setup lang="ts">
import type { NodeProps } from '@farris/flow-devkit';
import { NodeWrapper, ParamTagList, NodeContentWrapper, NodeField, Port } from '@farris/flow-devkit';
import { computed } from 'vue';

const props = defineProps<NodeProps>();

const classifierConfigs = computed(() => {
  return props.data.intentions || [];
});
</script>

<style scoped lang="scss">
.classifier-list {
  width: 100%;
}

.classifier-item {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 36px;
  padding: 10px 8px 10px 12px;
  margin-bottom: 6px;
  border-radius: 6px;
  border-left: 3px solid transparent;
  background-color: #f8f9fa;
  transition: all 0.2s ease;

  &.even-row {
    background-color: #f0f7ff;
    border-left-color: #1890ff;
  }

  &.odd-row {
    background-color: #f6ffed;
    border-left-color: #52c41a;
  }

  &.has-empty-name {
    .classifier-name {
      color: #999;
      font-style: italic;
    }
  }

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
}

.classifier-item .classifier-name {
  flex: 1;
  font-size: 14px;
  line-height: 22px;
  color: #333;
  word-break: break-word;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  min-height: 22px;
  max-height: 44px;
  padding-right: 25px;
  font-weight: 500;
}

.classifier-port-wrapper {
  position: absolute;
  right: -15px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 10;
}

.classifier-port {
  position: relative;
  pointer-events: auto;
}
</style>

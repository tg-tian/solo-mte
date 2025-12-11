<template>
  <NodeWrapper :nodeProps="props" :width="260">
    <NodeContentWrapper>
      <NodeField name="输入">
        <ParamTagList fieldName="输入" :params="data.inputParams" />
      </NodeField>
      <NodeField name="输出">
        <ParamTagList fieldName="输出" :params="data.outputParams" />
      </NodeField>
    </NodeContentWrapper>
  </NodeWrapper>
</template>

<script setup lang="ts">
import type { NodeProps } from '@farris/flow-devkit';
import { NodeWrapper, ParamTagList, NodeContentWrapper, NodeField } from '@farris/flow-devkit';

const props = defineProps<NodeProps>();

</script>

<style scoped lang="scss">
.file-types-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 0;
}

.file-type-item {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  background-color: #f0f7ff;
  border: 1px solid #d4e3fc;
  border-radius: 16px;
  font-size: 12px;
  color: #1890ff;
  font-weight: 500;
}

.file-type-label {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}
</style>

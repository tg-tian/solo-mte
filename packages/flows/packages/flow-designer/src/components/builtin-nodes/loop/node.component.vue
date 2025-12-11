<template>
  <NodeWrapper :nodeProps="props">
    <NodeContentWrapper>
      <NodeField name="循环变量">
        <ParamTagList fieldName="循环变量" :params="data.outputParams" />
      </NodeField>
    </NodeContentWrapper>
    <div class="flow-container">
      <SubFlowCanvas />
    </div>
  </NodeWrapper>
</template>

<script setup lang="ts">
import type { NodeProps } from '@farris/flow-devkit';
import { NodeWrapper, NodeContentWrapper, SubFlowCanvas, NodeField, ParamTagList } from '@farris/flow-devkit';

const props = defineProps<NodeProps>();
</script>

<style scoped lang="scss">
.flow-container {
  margin-top: 8px;
}
</style>

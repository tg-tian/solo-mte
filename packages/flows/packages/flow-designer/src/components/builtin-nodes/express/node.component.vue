<template>
  <NodeWrapper :nodeProps="props" :width="260">
    <NodeContentWrapper>
      <!-- 输入 -->
      <NodeField name="输入">
        <ParamTagList fieldName="输入" :params="props.data.inputParams" />
      </NodeField>

      <!-- 表达式 -->
      <NodeField name="表达式">
        <div class="express-placeholder-text" :class="{ 'has-content': express?.trim() }">
          {{ express && express.trim().length > 0 ? express : '未输入' }}
        </div>
      </NodeField>

      <!-- 输出 -->
      <NodeField name="输出">
        <ParamTagList fieldName="输出" :params="props.data.outputParams" />
      </NodeField>
    </NodeContentWrapper>
  </NodeWrapper>
</template>

<script setup lang="ts">
import type { NodeProps } from '@farris/flow-devkit';
import { NodeWrapper, ParamTagList, NodeContentWrapper, NodeField } from '@farris/flow-devkit';
import { computed } from 'vue'

const props = defineProps<NodeProps>();
const data = props.data;
const express = computed(() => data.express || '');
</script>

<style scoped>
.express-placeholder-text {
  color: #beb8bc;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.5;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.express-placeholder-text.has-content {
  color: #000;
}
</style>

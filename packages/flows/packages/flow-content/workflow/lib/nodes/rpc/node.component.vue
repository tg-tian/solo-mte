<template>
  <NodeWrapper :nodeProps="props" :width="260">
    <NodeContentWrapper>
      <NodeField name="输入">
        <ParamTagList fieldName="输入" :params="data.inputParams" />
      </NodeField>
      <NodeField name="输出">
        <ParamTagList fieldName="输出" :params="data.outputParams" />
      </NodeField>
      <NodeField name="Service Unit">
        <div class="param-display">{{ serviceUnitValue }}</div>
      </NodeField>
      <NodeField name="Service ID">
        <div class="param-display">{{ serviceIdValue }}</div>
      </NodeField>
    </NodeContentWrapper>
  </NodeWrapper>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { NodeProps } from '@farris/flow-devkit';
import { NodeWrapper, ParamTagList, NodeContentWrapper, NodeField } from '@farris/flow-devkit';

const props = defineProps<NodeProps>();

// 获取服务单元的值
const serviceUnitValue = computed(() => {
  return props.data?.serviceUnit || '';
});

// 获取服务ID的值
const serviceIdValue = computed(() => {
  return props.data?.serviceId || '';
});
</script>

<style scoped lang="scss">
.param-display {
  color: rgba(28, 29, 35, 0.9);
  font-size: 14px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;

  &:empty::before {
    content: '未配置';
    color: rgba(6, 7, 9, 0.3);
    font-style: normal;
  }
}
</style>

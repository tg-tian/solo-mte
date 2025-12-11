<template>
  <NodeWrapper :nodeProps="props" :width="260">
    <NodeContentWrapper>
      <NodeField name="输入">
        <ParamTagList fieldName="输入" :params="data.inputParams" />
      </NodeField>
      <NodeField name="输出">
        <ParamTagList fieldName="输出" :params="data.outputParams" />
      </NodeField>
      <NodeField name="模型">
        <ParamTagList fieldName="模型" :params="modelValue" />
      </NodeField>
    </NodeContentWrapper>
  </NodeWrapper>
</template>

<script setup lang="ts">
import type { NodeProps } from '@farris/flow-devkit';
import { NodeWrapper, ParamTagList, NodeContentWrapper, NodeField, BasicTypeRefer } from '@farris/flow-devkit';
import { computed } from 'vue';

const props = defineProps<NodeProps>();

const modelValue = computed(() => {
  if (props.data.modelInfo?.modelName) {
    return [{ code: props.data.modelInfo?.modelName, type: BasicTypeRefer.StringType }];
  }
  return [];
});
</script>

<style scoped lang="scss"></style>

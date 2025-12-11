<template>
  <NodeWrapper :nodeProps="props" :width="260">
    <NodeContentWrapper>
      <NodeField name="输入">
        <ParamTagList fieldName="输入" :params="data.inputParams" />
      </NodeField>
      <NodeField name="输出">
        <ParamTagList fieldName="输出" :params="data.outputParams" />
      </NodeField>
      <NodeField name="工具">
        <ParamTagList fieldName="工具" :params="modelValue" />
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
  if (props.data.toolId && props.data.toolName) {
    return [{ code: props.data.toolName, type: BasicTypeRefer.StringType }];
  }
  return [];
});
</script>

<style scoped lang="scss"></style>

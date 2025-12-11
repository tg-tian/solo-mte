<template>
  <NodeWrapper :nodeProps="props" :width="260">
    <NodeContentWrapper>
      <NodeField name="变量">
        <ParamTagList fieldName="变量" :params="data.outputParams" />
      </NodeField>
    </NodeContentWrapper>
  </NodeWrapper>
</template>

<script setup lang="ts">
import type { NodeProps } from '@farris/flow-devkit';
import { NodeWrapper, ParamTagList, NodeContentWrapper, NodeField } from '@farris/flow-devkit';

const props = defineProps<NodeProps>();
</script>

<style scoped lang="scss"></style>

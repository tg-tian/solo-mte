<template>
  <NodeWrapper :nodeProps="props" :width="260">
    <NodeContentWrapper :isTwoColumn="false">
      <VariableAssignList :expresses="data.expresses" />
    </NodeContentWrapper>
  </NodeWrapper>
</template>

<script setup lang="ts">
import type { NodeProps } from '@farris/flow-devkit';
import { NodeWrapper, NodeContentWrapper, VariableAssignList } from '@farris/flow-devkit';

const props = defineProps<NodeProps>();
</script>

<style scoped lang="scss"></style>

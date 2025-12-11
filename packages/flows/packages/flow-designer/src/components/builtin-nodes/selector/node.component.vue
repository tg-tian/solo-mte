<template>
  <NodeWrapper :nodeProps="props" :width="300">
    <SelectorBranches :branches="data.branches" />
  </NodeWrapper>
</template>

<script setup lang="ts">
import type { NodeProps } from '@farris/flow-devkit';
import { NodeWrapper, SelectorBranches } from '@farris/flow-devkit';

const props = defineProps<NodeProps>();
</script>

<style scoped lang="scss"></style>

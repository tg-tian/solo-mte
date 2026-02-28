<script setup lang="ts">
import { FlowDesigner } from '@farris/flow-designer';
import { FLOW_REGISTRY } from '../lib';
import { MOCK_FLOW_METADATA } from './mock-data';
</script>

<template>
  <FlowDesigner :flowRegistry="FLOW_REGISTRY" :flowMetadata="MOCK_FLOW_METADATA"></FlowDesigner>
</template>

<style scoped></style>

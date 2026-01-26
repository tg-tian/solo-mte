<template>
  <NodeWrapper :nodeProps="props" :width="260">
    <NodeContentWrapper>
      <NodeField name="设备类型">
        <span class="text">{{ data.deviceCategory || '未设置' }}</span>
      </NodeField>
      <NodeField name="设备事件">
        <span class="text">{{ data.deviceEvent || '未设置' }}</span>
      </NodeField>
      <NodeField name="事件参数">
        <ParamTagList fieldName="参数" :params="data.outputParams" />
      </NodeField>
    </NodeContentWrapper>
  </NodeWrapper>
</template>

<script setup lang="ts">
import type { NodeProps } from '@farris/flow-devkit';
import { NodeWrapper, NodeContentWrapper, NodeField, ParamTagList } from '@farris/flow-devkit';

const props = defineProps<NodeProps>();
</script>

<style scoped lang="scss">
.text {
  line-height: 26px;
  font-size: 13px;
}
</style>

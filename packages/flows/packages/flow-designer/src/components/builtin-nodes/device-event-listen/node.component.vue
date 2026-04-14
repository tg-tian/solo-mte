<template>
  <NodeWrapper :nodeProps="props" :width="260">
    <NodeContentWrapper>
      <NodeField name="设备类型">
        <span class="text">{{ deviceName || '未设置' }}</span>
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
import { computed } from 'vue';
import type { NodeProps, DeviceModel } from '@farris/flow-devkit';
import { NodeWrapper, NodeContentWrapper, NodeField, ParamTagList, useDeviceInfo } from '@farris/flow-devkit';

const props = defineProps<NodeProps>();

const { deviceCategories } = useDeviceInfo();

const deviceName = computed<string>(() => {
  const deviceModelId = props.data.deviceModelId;
  if (!deviceModelId) {
    return '';
  }
  const deviceModel = (deviceCategories.value as DeviceModel[]).find((model) => {
    return model.modelId === deviceModelId;
  });
  return deviceModel?.modelName || '';
});
</script>

<style scoped lang="scss">
.text {
  line-height: 26px;
  font-size: 13px;
}
</style>

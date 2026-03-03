<template>
  <NodeWrapper :nodeProps="props" :width="260">
    <NodeContentWrapper>
      <NodeField name="指定设备">
        <span class="text">{{ deviceName || '未指定' }}</span>
      </NodeField>
      <NodeField name="设备操作">
        <span class="text">{{ data.deviceAction || '未选择' }}</span>
      </NodeField>
      <NodeField name="操作参数">
        <ParamTagList fieldName="参数" :params="data.inputParams" />
      </NodeField>
    </NodeContentWrapper>
  </NodeWrapper>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import type { NodeProps, DeviceInstance } from '@farris/flow-devkit';
import { NodeWrapper, NodeContentWrapper, NodeField, ParamTagList, useDeviceInfo } from '@farris/flow-devkit';

const props = defineProps<NodeProps>();

const {
  getDeviceListByCategory,
  deviceCategory2DeviceInstanceList,
} = useDeviceInfo();

const deviceName = computed<string>(() => {
  const deviceCategory = props.data.deviceModelId;
  const deviceList: DeviceInstance[] = deviceCategory2DeviceInstanceList.get(deviceCategory) || [];
  const targetDevice = deviceList.find((device) => {
    return device.deviceId === props.data.deviceId;
  });
  return targetDevice?.deviceName || props.data.deviceId || '';
});

onMounted(() => {
  const deviceCategory = props.data.deviceModelId;
  if (deviceCategory) {
    getDeviceListByCategory(deviceCategory);
  }
});
</script>

<style scoped lang="scss">
.text {
  line-height: 26px;
  font-size: 13px;
}
</style>

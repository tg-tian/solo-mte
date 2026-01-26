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
import type { NodeProps, DeviceCategory, DeviceInstance } from '@farris/flow-devkit';
import { NodeWrapper, NodeContentWrapper, NodeField, ParamTagList, useDeviceInfo } from '@farris/flow-devkit';

const props = defineProps<NodeProps>();

const {
  getDeviceListByModelName,
  deviceName2DeviceList,
  deviceCategories,
} = useDeviceInfo();

const deviceType = props.type;
const deviceInfo: DeviceCategory = deviceCategories.value.find((device: DeviceCategory) => {
  return deviceType === device.category;
});
const modelName = deviceInfo?.modelName;

const deviceName = computed<string>(() => {
  const deviceList: DeviceInstance[] = deviceName2DeviceList.get(modelName) || [];
  const targetDevice = deviceList.find((device) => {
    return device.deviceId === props.data.deviceId;
  });
  return targetDevice?.deviceName || props.data.deviceId || '';
});

onMounted(() => {
  if (modelName) {
    getDeviceListByModelName(modelName);
  }
});
</script>

<style scoped lang="scss">
.text {
  line-height: 26px;
  font-size: 13px;
}
</style>

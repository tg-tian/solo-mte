<template>
  <NodeContextProvider :data="data">
    <component
      :is="nodeDef.component"
      v-bind="{...props, metadata: nodeDef.metadata, data: data, onUpdateData: handleUpdateData}"
      @debug-node="handleDebugNode"
    />
    <template v-for="(port, index) in nodeDef.metadata.ports" :key="port.id">
      <Port v-bind="port" :sortIndex="port.sortIndex ?? index" />
    </template>
  </NodeContextProvider>
</template>

<script setup lang="ts">
import type { NodeProps as VueFlowNodeProps } from '@vue-flow/core';
import { nodeRegistry } from '../composition/node-registry';
import { computed, provide, watch, onMounted } from 'vue';
import { NODE_RENDER_SCENE_KEY, USE_NODE_ID_KEY, USE_NODE_DATA_KEY } from '@farris/flow-devkit/composition';
import { Port } from '@farris/flow-devkit/components';
import type { NodeData, NodeValidationDetails } from '@farris/flow-devkit/types';
import { usePortRegistry } from '@farris/flow-devkit/composition/use-port';
import { NODE_VALIDATION_DETAILS_KEY } from '@farris/flow-devkit/constants';
import { NodeContextProvider } from './node-context-provider';

const props = defineProps<VueFlowNodeProps>();
const emit = defineEmits<{
  (e: 'update:data', data: Record<string, any>): void;
  (e: 'updateNodeInternals'): void;
  (e: 'debug-node', nodeData: any): void;
}>();

const nodeId = computed<string>(() => props.id);

provide(NODE_RENDER_SCENE_KEY, 'node');
provide(USE_NODE_ID_KEY, nodeId);

// 获取节点定义
const nodeDef = computed(() => {
  return nodeRegistry.get(props.type)!;
});

const { inputPorts, outputPorts } = usePortRegistry();
const nodeData = computed<NodeData>(() => props.data);
provide(USE_NODE_DATA_KEY, nodeData);

watch(
  [inputPorts, outputPorts],
  () => {
    if (!nodeData.value) {
      return;
    }
    nodeData.value.inputPorts = inputPorts.value;
    nodeData.value.outputPorts = outputPorts.value;
  },
);

const validationDetails = computed<NodeValidationDetails>(() => {
  const defaultResult = { isValid: true, errors: [] };
  if (typeof nodeDef.value.validator !== 'function' || !nodeData.value) {
    return defaultResult;
  }
  const validationResult = nodeDef.value.validator(nodeData.value);
  return validationResult || defaultResult;
});

onMounted(() => {
  nodeData.value[NODE_VALIDATION_DETAILS_KEY] = validationDetails;
});

// 处理数据更新
const handleUpdateData = (data: Partial<Record<string, any>>) => {
  emit('update:data', { ...props.data, ...data });
};

// 处理debug-node事件
const handleDebugNode = (nodeData: any) => {
  emit('debug-node', nodeData);
};
</script>

<script setup lang="ts">
import { Handle, type Position, type ValidConnectionFunc, type GraphEdge } from '@vue-flow/core';
import { usePort } from '@farris/flow-devkit/composition/use-port';
import { usePortConfig, ALL_NODE_PORTS_REGISTRY_KEY } from '@farris/flow-devkit/composition/use-all-ports';
import { computed, inject } from 'vue';
import type { NodePortConfig, PortConnectable, Connection, FlowNodeInstance } from '../types';
import { useBem } from '@farris/flow-devkit/utils';

const { bem } = useBem('fvf-common-port');

const props = withDefaults(defineProps<NodePortConfig>(), {
  connectable: true,
  removeAttachedEdgesOnUnmounted: false,
});

const portConfigRegistry = inject(ALL_NODE_PORTS_REGISTRY_KEY)!;

const portPosition = computed(() => {
  return props.position as Position;
});

const portConnectable = computed<PortConnectable>(() => {
  const value = props.connectable;
  if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    return value;
  }
  return true;
});

const portClass = computed(() => ({
  [bem()]: true,
  [bem('', portPosition.value)]: !!portPosition.value,
}));

usePortConfig(props);
usePort(props);

function isFromSameFlowContainer(sourceNode: FlowNodeInstance, targetNode: FlowNodeInstance): boolean {
  const sourceNodeParentId = sourceNode.parentNode;
  const targetNodeParentId = targetNode.parentNode;
  if (!sourceNodeParentId && !targetNodeParentId) {
    return true;
  }
  return sourceNodeParentId === targetNodeParentId;
}

function getPortConfig(targetNodeId: string, targetPortId?: string): NodePortConfig | undefined {
  if (!targetNodeId || !targetPortId) {
    return;
  }
  return portConfigRegistry.getPortConfig(targetNodeId, targetPortId);
}

function isNodeTypeValid(portConfig: NodePortConfig, nodeType: string): boolean {
  const { allowedNodeTypes, notAllowedNodeTypes } = portConfig;
  if (allowedNodeTypes && allowedNodeTypes.length) {
    if (!allowedNodeTypes.includes(nodeType)) {
      return false;
    }
  }
  if (notAllowedNodeTypes && notAllowedNodeTypes.length) {
    if (notAllowedNodeTypes.includes(nodeType)) {
      return false;
    }
  }
  return true;
}

function isPortTypeMatch(sourcePortConfig: NodePortConfig, targetPortConfig: NodePortConfig): boolean {
  return sourcePortConfig.type === 'source' && targetPortConfig.type === 'target';
}

const canConnect: ValidConnectionFunc = (vueFlowConnection, elements) => {
  const connection: Connection = {
    sourceNodeId: vueFlowConnection.source,
    targetNodeId: vueFlowConnection.target,
    sourcePort: vueFlowConnection.sourceHandle ?? undefined,
    targetPort: vueFlowConnection.targetHandle ?? undefined,
  };
  const edges = elements.edges as GraphEdge[];
  const nodes = elements.nodes as any as FlowNodeInstance[];
  const sourceNode = elements.sourceNode as any as FlowNodeInstance;
  const targetNode = elements.targetNode as any as FlowNodeInstance;
  const sourcePortConfig = getPortConfig(connection.sourceNodeId, connection.sourcePort);
  const targetPortConfig = getPortConfig(connection.targetNodeId, connection.targetPort);
  if (!sourcePortConfig || !targetPortConfig) {
    return false;
  }
  if (!isFromSameFlowContainer(sourceNode, targetNode)) {
    return false;
  }
  if (!isNodeTypeValid(targetPortConfig, sourceNode.type)) {
    return false;
  }
  if (!isNodeTypeValid(sourcePortConfig, targetNode.type)) {
    return false;
  }
  if (typeof props.isValidConnection === 'function') {
    return props.isValidConnection(connection, {
      edges,
      nodes,
      sourceNode,
      targetNode,
      sourcePortConfig,
      targetPortConfig,
    });
  }
  if (!isPortTypeMatch(sourcePortConfig, targetPortConfig)) {
    return false;
  }
  return true;
};
</script>

<template>
  <Handle
    :id="id"
    :type="type"
    :position="portPosition"
    :style="style"
    :class="portClass"
    :connectable="portConnectable"
    :isValidConnection="canConnect"
  />
</template>

<style lang="scss" scoped>
.fvf-common-port {
  &.source {
    box-sizing: border-box;
    width: 10px;
    height: 10px;
    background: #2A87FF;
    border: 1px solid #ffffff;
    border-radius: 50%;
    transition: all linear 0.2s;

    .vue-flow__node:hover &,
    .vue-flow__node:active &,
    &:hover {
      transform: translate(50%, -50%) scale(2);
    }
  }

  &.target {
    width: 7px;
    height: 16px;
    background: #2A87FF;
    border: 1px solid rgb(255, 255, 255);
    border-radius: 0;
  }

  &--top.target,
  &--bottom.target {
    width: 16px;
    height: 7px;
  }
}
</style>

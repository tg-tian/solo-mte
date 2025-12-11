<template>
  <div ref="wrapperElementRef" :class="canvasClass" :style="canvasStyle">
    <SubFlowBackground />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, type CSSProperties } from 'vue';
import { useBem } from '@farris/flow-devkit/utils';
import SubFlowBackground from './sub-flow-background.vue';
import { useIntersection, useNodeData, useSubFlowCanvas } from '@farris/flow-devkit/composition';
import { DEFAULT_SUB_FLOW_CANVAS_SIZE } from '@farris/flow-devkit/constants';

const name = 'fvf-sub-flow-canvas';

const { bem } = useBem(name);
const wrapperElementRef = ref<HTMLElement>();
useSubFlowCanvas(wrapperElementRef);

const { isIntersectedContainerNode } = useIntersection();
const nodeData = useNodeData();

const canvasClass = computed(() => ({
  [bem()]: true,
  [bem('', 'active')]: isIntersectedContainerNode.value,
}));

const canvasStyle = computed<CSSProperties>(() => ({
  width: `${nodeData.value?.subFlowCanvasSize?.width ?? DEFAULT_SUB_FLOW_CANVAS_SIZE.width}px`,
  height: `${nodeData.value?.subFlowCanvasSize?.height ?? DEFAULT_SUB_FLOW_CANVAS_SIZE.height}px`,
}));
</script>

<style lang="scss" scoped>
.fvf-sub-flow-canvas {
  display: block;
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  background-color: #fefefe;

  &--active {
    outline: 2px dashed #517af8;
  }
}
</style>

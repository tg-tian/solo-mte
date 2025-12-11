<template>
  <BaseEdge v-bind="$props" :style="mergedStyle" :path="path[0]" :marker-end="`url(#${markerId})`">
  </BaseEdge>
  <CommonMarker
    :id="markerId" 
    :stroke="mergedStyle.stroke" 
    :fill="mergedStyle.stroke"   
    :stroke-width="mergedStyle.strokeWidth">
  </CommonMarker>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { BaseEdge, getBezierPath, type EdgeProps } from '@vue-flow/core';
import CommonMarker from './common-marker.vue';

const props = defineProps<EdgeProps>();
const path = computed(() => getBezierPath(props as any));

const markerId = computed(() => `${props.id}-marker`);

const lineColor = computed<string>(() => {
  return props.selected ? '#37D0FF' : '#2A87FF';
});
const lineWidth = computed<number>(() => {
  return props.selected ? 3 : 2;
});

const mergedStyle = computed(() => ({
  ...props.style,
  stroke: lineColor.value,
  strokeWidth: lineWidth.value,
}));

</script>

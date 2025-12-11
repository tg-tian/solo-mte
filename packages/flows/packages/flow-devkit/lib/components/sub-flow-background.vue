<template>
  <svg
    class="vue-flow__background vue-flow__container"
    :style="{
      height: `100%`,
      width: `100%`,
    }"
  >
    <pattern
      :id="patternId"
      :x="0"
      :y="0"
      :width="background.scaledGap[0]"
      :height="background.scaledGap[1]"
      :patternTransform="`translate(-${background.offset[0]},-${background.offset[1]})`"
      patternUnits="userSpaceOnUse"
    >
      <DotPattern :color="color" :radius="background.size / 2" />
    </pattern>
    <rect :x="0" :y="0" width="100%" height="100%" :fill="`url(#${patternId})`" />
  </svg>
</template>

<script lang="ts" setup>
import { computed, type FunctionalComponent, h } from 'vue';
import {
  DEFAULT_BACKGROUND_PATTERN_SIZE,
  DEFAULT_BACKGROUND_PATTERN_GAP,
  DEFAULT_BACKGROUND_PATTERN_COLOR,
} from '@farris/flow-devkit/constants';
import { uuid } from '@farris/flow-devkit/utils';

interface DotPatternProps {
  radius: number;
  color: string;
}

const DotPattern: FunctionalComponent<DotPatternProps> = function ({ radius, color }) {
  return h('circle', { cx: radius, cy: radius, r: radius, fill: color });
};

export interface SubFlowBackgroundProps {
  gap?: number | number[];
  size?: number;
  color?: string;
  offset?: number | [number, number];
}

defineOptions({
  name: 'SubFlowBackground',
});

const {
  gap = DEFAULT_BACKGROUND_PATTERN_GAP,
  size = DEFAULT_BACKGROUND_PATTERN_SIZE,
  offset = 0,
  color = DEFAULT_BACKGROUND_PATTERN_COLOR,
} = defineProps<SubFlowBackgroundProps>();

const patternId = uuid();

const background = computed(() => {
  const zoom = 1;
  const [gapX, gapY] = Array.isArray(gap) ? gap : [gap, gap];
  const scaledGap: [number, number] = [gapX * zoom || 1, gapY * zoom || 1];
  const scaledSize = size * zoom;
  const [offsetX, offsetY]: [number, number] = Array.isArray(offset) ? offset : [offset, offset];
  const scaledOffset: [number, number] = [offsetX * zoom || 1 + scaledGap[0] / 2, offsetY * zoom || 1 + scaledGap[1] / 2];

  return {
    scaledGap,
    offset: scaledOffset,
    size: scaledSize,
  };
});
</script>

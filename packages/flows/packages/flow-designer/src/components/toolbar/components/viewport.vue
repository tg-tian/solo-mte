<template>
  <div :class="bem()">
    <TSelectInput
      :value="viewportZoom"
      :popupVisible="popupVisible"
      :autoWidth="false"
      :allowInput="false"
      :clearable="false"
      size="small"
      :popupProps="{ placement: 'top', overlayInnerClassName: bem('popup') }"
      @popupVisibleChange="onPopupVisibleChange"
    >
      <template #suffixIcon>
        <i class="f-icon f-icon-arrow-chevron-down"></i>
      </template>
      <template #panel>
        <div :class="bem('panel')">
          <div :class="bem('item')" @click="handleZoomOut">缩小</div>
          <div :class="bem('item')" @click="handleZoomIn">放大</div>
          <div :class="bem('item')" @click="handleFitView">自适应</div>
          <div :class="bem('divider')"></div>
          <div :class="bem('item')" @click="() => handleZoomTo(0.5)">缩放到 50%</div>
          <div :class="bem('item')" @click="() => handleZoomTo(1)">缩放到 100%</div>
          <div :class="bem('item')" @click="() => handleZoomTo(1.5)">缩放到 150%</div>
          <div :class="bem('item')" @click="() => handleZoomTo(2)">缩放到 200%</div>
        </div>
      </template>
    </TSelectInput>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useBem, TSelectInput } from '@farris/flow-devkit';
import { useVueFlow } from '@vue-flow/core';

const cname = 'FvfViewportSelect';

const { bem } = useBem(cname);

const {
  viewport,
  zoomIn,
  zoomOut,
  zoomTo,
  fitView,
} = useVueFlow();
const ZOOM_DURATION = 200;

const popupVisible = ref<boolean>(false);

function onPopupVisibleChange(value: boolean): void {
  popupVisible.value = value;
}

function closePopup(): void {
  popupVisible.value = false;
}

function handleZoomIn(): void {
  closePopup();
  zoomIn({ duration: ZOOM_DURATION });
}

function handleZoomOut(): void {
  closePopup();
  zoomOut({ duration: ZOOM_DURATION });
}

function handleZoomTo(zoomValue: number): void {
  closePopup();
  zoomTo(zoomValue, { duration: ZOOM_DURATION });
}

function handleFitView(): void {
  fitView({
    padding: 0.2,
    includeHiddenNodes: true,
    duration: ZOOM_DURATION,
  });
}

const viewportZoom = computed<string>(() => {
  const zoom = Math.ceil(viewport.value.zoom * 100);
  return `${zoom}%`;
});
</script>

<style lang="scss">
.fvf-viewport-select {
  display: block;
  width: 90px;

  &__popup {
    width: auto !important;
    padding: 4px;
    border-radius: 8px;
  }

  &__panel {
    display: flex;
    flex-direction: column;
    padding: 0;
    gap: 2px;
    min-width: 120px;
  }

  &__item {
    display: block;
    padding: 8px;
    line-height: 16px;
    border-radius: 4px;
    cursor: pointer;
    color: rgba(15, 21, 40, 0.82);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    user-select: none;

    &:hover {
      background-color: rgba(87, 104, 161, 0.08);
    }
  }

  &__divider {
    margin: 4px;
    height: 1px;
    background-color: rgba(56, 55, 67, 0.08);
  }
}

.t-select-input .t-input.t-size-s {
  height: 26px;
  border-radius: 6px;
  border: 1px solid #D9DEE7;

  &:hover,
  &.t-input--focused {
    border-color: #6388FF;
    box-shadow: none;
    outline: none;
  }
}

.t-popup.t-select__dropdown {
  .t-popup__content.larger-max-height {
    max-height: 600px !important;
  }

  .t-select__list {
    .t-select-option.t-size-s {
      height: 26px !important;
      line-height: 26px !important;

      &.t-is-selected {
        background-color: #dae8fd !important;
      }
    }
  }
}
</style>

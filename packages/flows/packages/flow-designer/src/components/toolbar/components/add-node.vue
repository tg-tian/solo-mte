<script setup lang="ts">
import { NodePanel } from '@flow-designer/components/node-panel';
import { TPopup } from '@farris/flow-devkit';
import { useFlowKind } from '@flow-designer/hooks';

const {
  getNodeCategories,
  getAllNodeCategories,
} = useFlowKind();

const nodeCategories = getNodeCategories();
const allNodeCategories = getAllNodeCategories();
</script>

<template>
  <TPopup trigger="click" :zIndex="20" overlayInnerClassName="add-node-popup" placement="top">
    <button class="btn btn-primary fvf-add-node-btn">
      <span class="f-icon f-icon-plus"></span>
      <span>添加节点</span>
    </button>
    <template #content>
      <NodePanel :nodeCategories="nodeCategories" :allNodeCategories="allNodeCategories" />
    </template>
  </TPopup>
</template>

<style lang="scss">
.fvf-add-node-btn {
  display: inline-flex;
  align-items: center;
  border-radius: 8px;
  height: 32px;
  min-width: 32px;
  font-size: 14px;
  padding: 6px 16px;
  border-width: 0;

  .f-icon {
    margin-right: 8px;
    font-size: 14px;
  }
}

.add-node-popup {
  border-radius: 12px;
  box-shadow: 0 2px 6px 0 rgba(0, 0, 0, .04), 0 4px 12px 0 rgba(0, 0, 0, .02);
  border: 1px solid rgba(82, 100, 154, 0.13);
}
</style>

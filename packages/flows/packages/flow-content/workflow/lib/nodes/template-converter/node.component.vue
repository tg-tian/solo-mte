<template>
  <NodeWrapper :nodeProps="props" :width="260">
    <NodeContentWrapper>
      <NodeField name="输入">
        <ParamTagList fieldName="输入" :params="data.inputParams" />
      </NodeField>
      <NodeField name="模板">
        <div class="template-preview">
          <div v-if="props.data.template" class="template-content">
            {{ props.data.template }}
          </div>
          <div v-else class="template-placeholder">
            请配置模板内容
          </div>
        </div>
      </NodeField>
      <NodeField name="输出">
        <ParamTagList fieldName="输出" :params="data.outputParams" />
      </NodeField>
    </NodeContentWrapper>
  </NodeWrapper>
</template>

<script setup lang="ts">
import type { NodeProps } from '@farris/flow-devkit';
import { NodeWrapper, ParamTagList, NodeContentWrapper, NodeField } from '@farris/flow-devkit';
import { computed } from 'vue';

const props = defineProps<NodeProps>();
</script>

<style scoped lang="scss">
.template-preview {
  .template-content {
    width: 100%;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }

  .template-placeholder {
    display: block;
    font-style: normal;
    font-size: 14px;
    height: 26px;
    line-height: 26px;
    color: rgba(6, 7, 9, 0.3);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}
</style>

<template>
  <NodeWrapper :nodeProps="props" :width="260">
    <NodeContentWrapper>
      <!-- 参数 -->
      <NodeField name="参数" v-if="data.inputParams && data.inputParams.length > 0">
        <ParamTagList fieldName="" :params="data.inputParams" />
      </NodeField>

      <!-- 异常信息 -->
      <NodeField name="异常信息">
        <div class="exception-placeholder-text" :class="{ 'has-content': exceptionInfo?.trim() }">
          {{ exceptionInfo && exceptionInfo.trim().length > 0 ? exceptionInfo : '未输入' }}
        </div>
      </NodeField>

      <!-- 异常级别 -->
      <NodeField name="异常级别">
        <div v-if="!data.level" class="placeholder">未选择</div>
        <span v-else class="exception-tag" :class="`level-${data.level.toLowerCase()}`">
          {{ data.level }}
        </span>
      </NodeField>
    </NodeContentWrapper>
  </NodeWrapper>
</template>

<script setup lang="ts">
import type { NodeProps } from '@farris/flow-devkit';
import { NodeWrapper, ParamTagList, NodeContentWrapper, NodeField } from '@farris/flow-devkit';
import { computed } from 'vue'

const props = defineProps<NodeProps>();
const data = props.data;
const exceptionInfo = computed(() => data.exceptionInfo || '');
</script>

<style scoped lang="scss">
.exception-placeholder-text {
  color: #beb8bc;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.5;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.exception-placeholder-text.has-content {
  color: #000;
}

.placeholder {
  color: #beb8bc;
  font-size: 14px;
}

.exception-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  border: 1px solid;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  // 修改类名前缀避免冲突
  &.level-info {
    background-color: #f6ffed;
    border-color: #b7eb8f;
    color: #52c41a;
  }

  &.level-warning {
    background-color: #fff7e6;
    border-color: #ffd591;
    color: #fa8c16;
  }

  &.level-error {
    background-color: #fff1f0;
    border-color: #ffa39e;
    color: #f5222d;
  }

  &.level-fatal {
    background-color: #ffe6f0;
    border-color: #ff85c2;
    color: #d91a82;
    font-weight: 600;
  }
}
</style>

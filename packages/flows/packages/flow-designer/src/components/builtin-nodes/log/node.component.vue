<template>
  <NodeWrapper :nodeProps="props" :width="260">
    <NodeContentWrapper>
      <!-- 参数 -->
      <NodeField name="参数" v-if="data.inputParams && data.inputParams.length > 0">
        <ParamTagList fieldName="" :params="data.inputParams" />
      </NodeField>

      <!-- 日志信息 -->
      <NodeField name="日志信息">
        <div class="log-placeholder-text" :class="{ 'has-content': logInfo?.trim() }">
          {{ logInfo && logInfo.trim().length > 0 ? logInfo : '未输入' }}
        </div>
      </NodeField>

      <!-- 日志级别 -->
      <NodeField name="日志级别">
        <div v-if="!data.level" class="placeholder">未选择</div>
        <span v-else class="level-tag" :class="`level-${data.level.toLowerCase()}`">
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
const logInfo = computed(() => data.logInfo || '');
</script>

<style scoped lang="scss">
.log-placeholder-text {
  color: #beb8bc;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.5;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-placeholder-text.has-content {
  color: #000;
}

.placeholder {
  color: #beb8bc;
  font-size: 14px;
}

.level-tag {
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

  // 不同级别的样式
  &.level-trace {
    background-color: #fafafa;
    border-color: #d9d9d9;
    color: #8c8c8c;
  }

  &.level-debug {
    background-color: #f0f9ff;
    border-color: #bae0ff;
    color: #4096ff;
  }

  &.level-info {
    background-color: #f6ffed;
    border-color: #b7eb8f;
    color: #52c41a;
  }

  &.level-warn {
    background-color: #fff7e6;
    border-color: #ffd591;
    color: #fa8c16;
  }

  &.level-error {
    background-color: #fff1f0;
    border-color: #ffa39e;
    color: #f5222d;
  }
}
</style>

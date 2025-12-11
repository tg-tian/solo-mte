<template>
  <NodeWrapper :nodeProps="props" :width="280">
    <NodeContentWrapper>
      <NodeField name="输入">
        <ParamTagList fieldName="输入" :params="data.inputParams" />
      </NodeField>
      <NodeField name="输出">
        <ParamTagList fieldName="输出" :params="data.outputParams" />
      </NodeField>
      <NodeField name="MCP工具">
        <div class="mcp-tool-info">
          <div v-if="!data.mcpServerId" class="no-mcp-tool">
            暂未选择MCP工具
          </div>
          <div v-else class="mcp-tool-details">
            <div class="mcp-tool-name">{{ data.mcpToolName }}</div>
          </div>
        </div>
      </NodeField>
    </NodeContentWrapper>
  </NodeWrapper>
</template>

<script setup lang="ts">
import type { NodeProps } from '@farris/flow-devkit';
import { NodeWrapper, ParamTagList, NodeContentWrapper, NodeField } from '@farris/flow-devkit';

const props = defineProps<NodeProps>();
</script>

<style scoped lang="scss">
.mcp-tool-info {
  width: 100%;

  .no-mcp-tool {
    color: rgba(6, 7, 9, 0.3);
    padding: 8px;
    font-style: normal;
  }

  .mcp-tool-details {
    .mcp-tool-name {
      font-weight: 500;
      color: #333;
      // 添加文本省略样式
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 220px; // 设置最大宽度，根据节点宽度280px减去padding调整
    }
  }
}
</style>

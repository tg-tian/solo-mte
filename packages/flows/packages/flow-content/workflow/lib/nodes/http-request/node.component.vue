<template>
  <NodeWrapper :nodeProps="props" :width="280">
    <NodeContentWrapper>
      <NodeField :name="requestTypeText">
        <div :class="{ 'url-content': restFulService.url, 'empty-content': !restFulService.url }">{{ restFulService.url || '未设置URL' }}</div>
      </NodeField>
      <NodeField name="输出">
        <ParamTagList fieldName="输出" :params="data.outputParams" />
      </NodeField>
    </NodeContentWrapper>
  </NodeWrapper>
</template>

<script setup lang="ts">
import { computed, watch, onMounted } from 'vue';
import type { NodeProps } from '@farris/flow-devkit';
import { NodeWrapper, ParamTagList, NodeContentWrapper, NodeField } from '@farris/flow-devkit';

const props = defineProps<NodeProps>();

const restFulService = computed(() => {
  return props.data?.restFulService || {};
});

const requestTypeText = computed(() => {
  const requestType = restFulService.value.requestType || 1;
  const requestTypeMap = {
    1: 'GET',
    2: 'POST',
    3: 'PUT',
    4: 'DELETE'
  };
  return requestTypeMap[requestType as keyof typeof requestTypeMap] || 'GET';
});

// 检查参数是否是变量引用
function isVariableReference(valueExpr: any): boolean {
  return valueExpr && valueExpr.kind === 'nodeVariable';
}

// 参数提取函数 - 只提取变量引用参数用于流程中的参数传递
function extractInputParamsFromRestFulService() {
  const inputParams: { id: string; code: any; name: any; type: any; valueExpr: any; schema: undefined; }[] = [];
  const restFulServiceData = props.data?.restFulService || {};

  // 提取请求头参数（只提取变量引用）
  if (restFulService.value.headerList && Array.isArray(restFulService.value.headerList)) {
    restFulService.value.headerList.forEach((header: any, index: number) => {
      // 只提取变量引用的参数用于流程参数传递
      if (header.code && header.code.trim() !== '' && isVariableReference(header.valueExpr)) {
        const extractedParam = {
          id: `header-${header.id}`,
          code: header.code,
          name: header.code,
          type: header.type || { source: 'default', typeId: 'string' },
          valueExpr: header.valueExpr,
          schema: undefined
        };
        inputParams.push(extractedParam);
      }
    });
  }

  // 提取请求参数引用（只提取变量引用）
  if (restFulServiceData.params && Array.isArray(restFulServiceData.params)) {
    restFulServiceData.params.forEach((param: any, index: number) => {
      // 只提取变量引用的参数用于流程参数传递
      if (param.code && param.code.trim() !== '' && isVariableReference(param.valueExpr)) {
        inputParams.push({
          id: `param-${param.id}`,
          code: param.code,
          name: param.code,
          type: param.type || { source: 'default', typeId: 'string' },
          valueExpr: JSON.stringify(param.valueExpr),
          schema: undefined
        });
      }
    });
  }

  // 提取请求体参数（只提取变量引用）
  if (restFulServiceData.bodyList && Array.isArray(restFulServiceData.bodyList)) {
    restFulServiceData.bodyList.forEach((bodyParam: any, index: number) => {
      // 只提取变量引用的参数用于流程参数传递
      if (bodyParam.code && bodyParam.code.trim() !== '' && isVariableReference(bodyParam.valueExpr)) {
        const extractedParam = {
          id: `body-${bodyParam.id}`,
          code: bodyParam.code,
          name: bodyParam.code,
          type: bodyParam.type || { source: 'default', typeId: 'string' },
          valueExpr: bodyParam.valueExpr,
          schema: undefined
        };
        inputParams.push(extractedParam);
      }
    });
  }

  // 直接更新节点的inputParams（即使为空也要更新，以清空旧的参数）
  if (props.onUpdateData) {
    props.onUpdateData({ inputParams });
  }

  return inputParams;
}

// 监听restFulService的变化
watch(restFulService, () => {
  extractInputParamsFromRestFulService();
}, { deep: true });

// 组件挂载时也执行一次
onMounted(() => {
  extractInputParamsFromRestFulService();
});
</script>

<style scoped lang="scss">
.empty-content {
  color: rgba(55, 67, 106, 0.38);
  font-size: 14px;
  font-style: normal;
  line-height: 20px;
}

.url-content {
  width: 100%;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}
</style>


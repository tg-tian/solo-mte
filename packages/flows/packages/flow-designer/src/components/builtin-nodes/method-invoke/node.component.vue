<template>
  <NodeWrapper :nodeProps="props" :width="260">
    <NodeContentWrapper>
      <NodeField name="函数名">
        <div v-if="currentMethod" class="method-label" :title="methodTitle">
          <span class="method-name">{{ methodName }}</span>
          <span v-if="methodName !== methodCode" class="method-code">{{ methodCode }}</span>
        </div>
        <div v-else class="fvf-node-field-empty" title="未选择函数">未选择函数</div>
      </NodeField>
    </NodeContentWrapper>
  </NodeWrapper>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { NodeProps, TypeMethod, MethodInvokeExpr } from '@farris/flow-devkit';
import { NodeWrapper, NodeContentWrapper, NodeField, ValueExpressUtils } from '@farris/flow-devkit';

const props = defineProps<NodeProps>();

const currentMethod = computed<TypeMethod | undefined>(() => {
  const currentValue = props.data.express as MethodInvokeExpr;
  return ValueExpressUtils.getMethodTypeByMethodInvokeExpr(currentValue);
});

const methodName = computed<string>(() => {
  const method = currentMethod.value;
  if (!method) {
    return '';
  }
  return method.name || method.code;
});

const methodCode = computed<string>(() => {
  const method = currentMethod.value;
  if (!method) {
    return '';
  }
  return method.code;
});

const methodTitle = computed<string>(() => {
  const method = currentMethod.value;
  if (!method) {
    return '';
  }
  return `${method.name || method.code} - ${method.code}`;
});
</script>

<style scoped lang="scss">
.method-label {
  display: block;
  font-style: normal;
  font-size: 14px;
  height: 26px;
  line-height: 26px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.method-name {
  color: rgba(0, 0, 0, 0.75);
}

.method-code {
  color: rgba(0, 0, 0, 0.6);
}

.method-name+.method-code {
  margin-left: 4px;
}
</style>

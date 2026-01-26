import { ref } from 'vue';
import type { ValueExpressionInputProps } from '../value-expression-input.props';
import { MethodInvokeExpress } from '@farris/flow-devkit/form-materials/method-invoke-express';
import type { ValueExpress, ValueExpressionResult } from '@farris/flow-devkit/types';
import { getNodeVariables, getWritableNodeVariables } from '@farris/flow-devkit/composition';

export function useMethodInvokeTab(props: ValueExpressionInputProps) {

  const express = ref<ValueExpress>();
  const result = ref<ValueExpressionResult>();
  const methodInvokeExpressInstance = ref();

  const nodeVariables = props.nodeVariables ? props.nodeVariables : getNodeVariables();
  const writableNodeVariables = props.writableNodeVariables ? props.writableNodeVariables : getWritableNodeVariables();

  function updateMethodInvokeTab(currentValue?: ValueExpress): void {
    express.value = currentValue;
  }

  function getMethodInvokeExpr(): ValueExpressionResult {
    if (!result.value) {
      result.value = methodInvokeExpressInstance.value.getNewValue();
    }
    return result.value!;
  }

  function onChange(_newValue: any, _: any, valueExpressionResult: ValueExpressionResult): void {
    express.value = valueExpressionResult.express;
    result.value = valueExpressionResult;
  }

  function renderMethodInvokeTab() {
    return (
      <MethodInvokeExpress
        ref={methodInvokeExpressInstance}
        modelValue={express.value}
        onlyAllowArrayType={props.onlyAllowArrayType}
        nodeVariables={nodeVariables}
        writableNodeVariables={writableNodeVariables}
        onUpdate:modelValue={onChange}
      />
    );
  }

  return {
    updateMethodInvokeTab,
    getMethodInvokeExpr,
    renderMethodInvokeTab,
  };
}

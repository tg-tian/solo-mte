import { ref, computed, watch } from 'vue';
import { useMethodTypes } from '@farris/flow-devkit/hooks';
import { useBem, ValueExpressUtils } from '@farris/flow-devkit/utils';
import { VALUE_EXPRESSION_INPUT_NAME } from '../value-expression-input.props';
import { MethodTypeSelect } from '../components';
import { TSelect } from "@farris/flow-devkit/third-party";
import type { ValueExpress, TypeRefer, MethodInvokeExpr, Type, TypeMethod, Parameter, MethodParameter } from '@farris/flow-devkit/types';
import { ValueExpressKind } from '@farris/flow-devkit/types';
import type { ValueExpressionInputProps } from '../value-expression-input.props';
import ValueExpressionInput from '../value-expression-input.component';
import { getNodeVariables, getWritableNodeVariables, useTypeDetails } from '@farris/flow-devkit/composition';
import type { GetValueResult } from './types';

export function useMethodInvokeTab(props: ValueExpressionInputProps) {

  const onlyAllowArrayType = props.onlyAllowArrayType;

  const { bem } = useBem(VALUE_EXPRESSION_INPUT_NAME);
  const { mergedMethodTypes, refreshMethodTypes } = useMethodTypes();

  const currentTypeRefer = ref<TypeRefer>();
  const currentMethodCode = ref<string>();
  const paramValues = ref<Record<string, ValueExpress>>({});

  const nodeVariables = props.nodeVariables ? props.nodeVariables : getNodeVariables();
  const writableNodeVariables = props.writableNodeVariables ? props.writableNodeVariables : getWritableNodeVariables();
  const {
    getTypeCode,
    getTypeName,
    loadType,
    isListType,
  } = useTypeDetails();

  const currentMethodType = computed<Type | undefined>(() => {
    const typeRefer = currentTypeRefer.value;
    if (!typeRefer) {
      return;
    }
    return mergedMethodTypes.value.find((type) => {
      return type.source === typeRefer.source && type.typeId === typeRefer.typeId;
    });
  });

  const currentMethods = computed<TypeMethod[]>(() => {
    return currentMethodType.value?.methods || [];
  });

  const methodOptions = computed(() => {
    return currentMethods.value.map((method) => ({
      label: method.name || method.code,
      value: method.code,
    }));
  });

  const currentMethod = computed<TypeMethod | undefined>(() => {
    return currentMethods.value.find((method) => {
      return method.code === currentMethodCode.value;
    });
  });

  const currentParameters = computed<Parameter[]>(() => {
    return currentMethod.value?.parameters || [];
  });

  const shouldShowParams = computed<boolean>(() => !!currentMethod.value);

  function onUpdateMethodType(typeRefer: TypeRefer, methodCode?: string): void {
    currentTypeRefer.value = typeRefer;
    currentMethodCode.value = undefined;
    if (methodCode) {
      currentMethodCode.value = methodCode;
    }
  }

  function onMethodSelectChange(newValue: any): void {
    currentMethodCode.value = newValue;
  }

  function initMethodInvokeTab(): void {
    refreshMethodTypes();
  }

  function initParamValues(): void {
    paramValues.value = {};
  }

  function loadAllTypes(): void {
    const method = currentMethod.value;
    if (!method) {
      return;
    }
    const typeRefers: TypeRefer[] = [];
    if (method.returnType) {
      typeRefers.push(method.returnType);
    }
    (method.parameters || []).forEach(param => {
      if (param?.type) {
        typeRefers.push(param.type);
      }
    });
    if (typeRefers.length) {
      loadType(typeRefers);
    }
  }

  watch(currentMethod, (newValue, oldValue) => {
    if (!oldValue) {
      return;
    }
    if (newValue?.code !== oldValue.code) {
      initParamValues();
    }
  });
  watch(currentMethod, loadAllTypes, { immediate: true });

  function updateMethodInvokeTab(currentValue?: ValueExpress): void {
    if (currentValue?.kind !== ValueExpressKind.methodInvoke) {
      return;
    }
    const express = currentValue as MethodInvokeExpr;
    if (!express.typeUrl) {
      return;
    }
    currentTypeRefer.value = {
      source: 'default',
      typeId: express.typeUrl,
    };
    currentMethodCode.value = express.methodCode;
    const params: Record<string, ValueExpress> = {};
    (express.parameters || []).forEach((param) => {
      if (param && param.code && param.value) {
        params[param.code] = param.value;
      }
    });
    paramValues.value = params;
  }

  function renderParameter(param: Parameter) {
    const keyID = `${currentMethodType.value!.typeId}_${currentMethod.value!.code}_${param.code}`;
    const paramName = param.name || param.code;
    const paramCode = param.code;
    const paramTitle = `${paramName} - ${paramCode}`;
    const typeCode = getTypeCode(param.type);
    const typeName = getTypeName(param.type);
    return (
      <div class={bem('method-param-item')} key={keyID}>
        <div class={bem('method-param-item-header')}>
          <div class={bem('method-param-item-label')} title={paramTitle}>{param.name || param.code}</div>
          {typeCode && (
            <div class={bem('method-type')} title={typeName}>{typeCode}</div>
          )}
        </div>
        <div class={bem('method-param-item-editor')}>
          <ValueExpressionInput
            modelValue={paramValues.value[param.code]}
            nodeVariables={nodeVariables}
            writableNodeVariables={writableNodeVariables}
            onUpdate:modelValue={(newValue) => { paramValues.value[param.code] = newValue }}
          />
        </div>
      </div>
    );
  }

  function renderMethodTypeSelect() {
    return (
      <MethodTypeSelect
        value={currentTypeRefer.value}
        onUpdate:value={onUpdateMethodType}
      />
    );
  }

  function renderMethodSelect() {
    return (
      <TSelect
        value={currentMethodCode.value}
        options={methodOptions.value}
        clearable={false}
        size={'small'}
        placeholder={currentMethodType.value ? '请选择方法' : '请先选择类型'}
        onChange={onMethodSelectChange}
      />
    );
  }

  function renderReturnType() {
    const returnType = currentMethod.value!.returnType;
    const typeCode = getTypeCode(returnType) || '无';
    const typeName = getTypeName(returnType);
    return (
      <div class={bem('method-type')} title={typeName}>{typeCode}</div>
    );
  }

  function renderParamListPlaceholder() {
    if (currentParameters.value.length) {
      return;
    }
    return (
      <div class={bem('method-no-param')}>{'参数列表为空'}</div>
    );
  }

  function renderMethodInvokeTab() {
    return (
      <div class={bem('method-tab')}>
        <div class={bem('method-tab-header')}>
          <div class={bem('method-select-area')}>
            <div class={bem('method-field-label')}>{'所属类型'}</div>
            <div class={bem('method-field-value')}>{renderMethodTypeSelect()}</div>
            <div class={bem('method-field-label')}>{'方法名'}</div>
            <div class={bem('method-field-value')}>{renderMethodSelect()}</div>
            {shouldShowParams.value && (
              <>
                <div class={bem('method-field-label')}>{'返回值'}</div>
                <div class={bem('method-field-value')}>{renderReturnType()}</div>
              </>
            )}
          </div>
          {shouldShowParams.value && (
            <>
              <div class={bem('method-params-title')}>{'入参列表'}</div>
              <div class={bem('method-divider')}></div>
            </>
          )}
        </div>
        <div class={bem('method-tab-params')}>
          {shouldShowParams.value && (
            <div class={bem('method-param-list')}>
              {currentParameters.value.map(renderParameter)}
              {renderParamListPlaceholder()}
            </div>
          )}
        </div>
      </div>
    );
  }

  function getMethodInvokeExpr(): GetValueResult | string {
    const method = currentMethod.value;
    if (!method) {
      return '请选择一个方法';
    }
    const returnType = method.returnType;
    if (onlyAllowArrayType && !isListType(returnType)) {
      return '只能选择返回值为数组的方法';
    }
    const methodParams: MethodParameter[] = [];
    currentParameters.value.forEach((param) => {
      const paramValue = paramValues.value[param.code];
      if (paramValue) {
        methodParams.push({
          code: param.code,
          value: paramValue,
        });
      }
    });
    const express = ValueExpressUtils.createMethodInvokeExpr(
      currentMethodType.value!.typeId,
      method.code,
      methodParams,
    );
    return {
      express,
      type: returnType,
    };
  }

  return {
    initMethodInvokeTab,
    updateMethodInvokeTab,
    getMethodInvokeExpr,
    renderMethodInvokeTab,
  };
}

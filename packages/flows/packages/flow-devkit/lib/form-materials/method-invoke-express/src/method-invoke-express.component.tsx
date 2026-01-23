import { defineComponent, ref, computed, watch, onMounted } from 'vue';
import { METHOD_INVOKE_EXPRESS_NAME, methodInvokeExpressProps } from './method-invoke-express.props';
import { useBem, ValueExpressUtils } from '@farris/flow-devkit/utils';
import type { MethodInvokeExpr, ValueExpress, TypeRefer, Type, TypeMethod, Parameter, MethodParameter, ValueExpressionResult } from '@farris/flow-devkit/types';
import { ValueExpressKind } from '@farris/flow-devkit/types';
import { useMethodTypes } from '@farris/flow-devkit/hooks';
import { getNodeVariables, getWritableNodeVariables, useTypeDetails } from '@farris/flow-devkit/composition';
import { TSelect } from "@farris/flow-devkit/third-party";
import { MethodTypeSelect } from './components';
import { ValueExpressionInput } from '@farris/flow-devkit/form-materials/value-expression-input';

import './method-invoke-express.scss';

const NO_METHOD_TYPE_TIP = '请先选择类型';
const NO_METHOD_TIP = '请选择函数';

export default defineComponent({
  name: METHOD_INVOKE_EXPRESS_NAME,
  props: methodInvokeExpressProps,
  emits: {
    'update:modelValue': (
      _newValue: ValueExpress | undefined,
      _: ValueExpress | undefined,
      _result: ValueExpressionResult,
    ) => {
      return true;
    }
  },
  setup(props, context) {
    const { bem } = useBem(METHOD_INVOKE_EXPRESS_NAME);
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

    function getErrorTip(): string | undefined {
      const method = currentMethod.value;
      if (!method) {
        return '请选择一个函数';
      }
      const returnType = method.returnType;
      if (props.onlyAllowArrayType && !isListType(returnType)) {
        return '只能选择返回值为数组的函数';
      }
      return undefined;
    }

    function getNewValue(): ValueExpressionResult {
      const errorTip = getErrorTip();
      const method = currentMethod.value;
      if (!method) {
        return { errorTip };
      }
      const returnType = method.returnType;
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
        errorTip,
      };
    }

    function emitNewValue(): void {
      const result = getNewValue();
      context.emit('update:modelValue', result.express, result.express, result);
    }

    function onUpdateMethodType(typeRefer: TypeRefer, methodCode?: string): void {
      currentTypeRefer.value = typeRefer;
      currentMethodCode.value = undefined;
      if (methodCode) {
        currentMethodCode.value = methodCode;
      }
      emitNewValue();
    }

    function onMethodSelectChange(newValue: any): void {
      currentMethodCode.value = newValue;
      emitNewValue();
    }

    function refreshMethodList(): void {
      refreshMethodTypes();
    }

    onMounted(refreshMethodList);

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

    function updateInnerValue(currentValue?: ValueExpress): void {
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

    watch(
      () => props.modelValue,
      () => updateInnerValue(props.modelValue),
      { immediate: true },
    );

    context.expose({
      refreshMethodList,
      getNewValue,
    });

    function renderParameter(param: Parameter) {
      const keyID = `${currentMethodType.value!.typeId}_${currentMethod.value!.code}_${param.code}`;
      const paramName = param.name || param.code;
      const paramCode = param.code;
      const paramTitle = `${paramName} - ${paramCode}`;
      const typeCode = getTypeCode(param.type);
      const typeName = getTypeName(param.type);
      return (
        <div class={bem('param-item')} key={keyID}>
          <div class={bem('param-item-header')}>
            <div class={bem('param-item-label')} title={paramTitle}>{param.name || param.code}</div>
            {typeCode && (
              <div class={bem('type')} title={typeName}>{typeCode}</div>
            )}
          </div>
          <div class={bem('param-item-editor')}>
            <ValueExpressionInput
              modelValue={paramValues.value[param.code]}
              nodeVariables={nodeVariables}
              writableNodeVariables={writableNodeVariables}
              onUpdate:modelValue={(newValue) => {
                paramValues.value[param.code] = newValue;
                emitNewValue();
              }}
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
          placeholder={currentMethodType.value ? NO_METHOD_TIP : NO_METHOD_TYPE_TIP}
          onChange={onMethodSelectChange}
        />
      );
    }

    function renderReturnType() {
      const returnType = currentMethod.value!.returnType;
      const typeCode = getTypeCode(returnType) || '无';
      const typeName = getTypeName(returnType);
      return (
        <div class={bem('type')} title={typeName}>{typeCode}</div>
      );
    }

    function renderParamListPlaceholder() {
      if (currentParameters.value.length) {
        return;
      }
      return (
        <div class={bem('no-param')}>{'参数列表为空'}</div>
      );
    }

    const errorTip = computed<string>(() => {
      if (!currentMethodType.value) {
        return NO_METHOD_TYPE_TIP;
      }
      if (!currentMethod.value) {
        return NO_METHOD_TIP;
      }
      return '';
    });

    function renderErrorTip(errorTip?: string) {
      if (!errorTip) {
        return;
      }
      return (
        <>
          <div></div>
          <div class="fvf-form-item-error" title={errorTip}>{errorTip}</div>
        </>
      );
    }

    return () => (
      <div class={bem()}>
        <div class={bem('header')}>
          <div class={bem('select-area')}>
            <div class={bem('field-label')}>{'所属类型'}</div>
            <div class={bem('field-value')}>{renderMethodTypeSelect()}</div>
            <div class={bem('field-label')}>{'函数名'}</div>
            <div class={bem('field-value')}>{renderMethodSelect()}</div>
            {renderErrorTip(errorTip.value)}
            {shouldShowParams.value && (
              <>
                <div class={bem('field-label')}>{'返回值'}</div>
                <div class={bem('field-value')}>{renderReturnType()}</div>
              </>
            )}
          </div>
          {shouldShowParams.value && (
            <>
              <div class={bem('params-title')}>{'入参列表'}</div>
              <div class={bem('divider')}></div>
            </>
          )}
        </div>
        <div class={bem('params')}>
          {shouldShowParams.value && (
            <div class={bem('param-list')}>
              {currentParameters.value.map(renderParameter)}
              {renderParamListPlaceholder()}
            </div>
          )}
        </div>
      </div>
    );
  },
});

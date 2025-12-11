import { defineComponent, computed } from 'vue';
import { requestParamsProps } from './request-params.props';
import { useBem, uuid, ParamValidateUtils } from '@farris/flow-devkit';
import { type Parameter, type TypeRefer, type ValueExpress, BasicTypeRefer, type ParamValidateOptions } from '@farris/flow-devkit';
import { TypeSelector, ValueExpressionInput } from '@farris/flow-devkit';
import type { HttpParameter } from '../../http-params/src/types';

// dataType转换工具函数
function dataTypeToTypeRefer(dataType: number): TypeRefer {
  switch (dataType) {
    case 1: return BasicTypeRefer.StringType;
    case 2: return BasicTypeRefer.IntegerType;
    case 3: return BasicTypeRefer.BooleanType;
    case 18: return BasicTypeRefer.NumberType;
    default: return BasicTypeRefer.StringType;
  }
}

function typeReferToDataType(type: TypeRefer): number {
  if (type === BasicTypeRefer.StringType) return 1;
  if (type === BasicTypeRefer.IntegerType) return 2;
  if (type === BasicTypeRefer.BooleanType) return 3;
  if (type === BasicTypeRefer.NumberType) return 18;
  return 1; // default to String
}

// 导入参数提取工具函数
function extractVariableParams(params: HttpParameter[]): Parameter[] {
    const inputParams: Parameter[] = [];

    params.forEach((param) => {
        const isVariableReference = param.valueExpr && param.valueExpr.kind === 'nodeVariable'

        if (isVariableReference) {
            // 从dataType转换为实际的TypeRefer，优先使用dataType
            let actualType: TypeRefer;
            if (param.dataType !== undefined && param.dataType !== null) {
                actualType = dataTypeToTypeRefer(param.dataType);
            } else {
                actualType = param.type || BasicTypeRefer.StringType;
            }

            inputParams.push({
                id: `body-${param.id}`,
                code: param.code,
                name: param.name || param.code,
                description: `请求体参数: ${param.code}`,
                type: actualType,
                required: param.required || false,
                valueExpr: param.valueExpr
            });
        }
    });

    return inputParams;
}

import './request-params.scss';

const name = 'RequestParams';

export default defineComponent({
  name,
  props: requestParamsProps,
  emits: ['update:modelValue'],
  setup(props, context) {
    const { bem } = useBem(name);
    const params = computed(() => {
      return (props.modelValue || []) as HttpParameter[];
    });
    const nodeData = computed(()=> props.nodeData)

    function createNewParam(): HttpParameter {
      const defaultType = BasicTypeRefer.StringType;
      return {
        id: uuid(),
        code: '',
        type: defaultType,
        name: '', // 将和code保持一致
        dataType: typeReferToDataType(defaultType), // 使用转换函数
        required: true, // 默认必填
        defaultValue: '', // body参数不需要默认值
        enableValueMapping: false,
        valueSerializeType: 1, // 固定为1
        valueExpr: undefined
      };
    }

    function emitChange(newParams: HttpParameter[]): void {
      context.emit('update:modelValue', newParams);

      // 直接更新节点的inputParams
      if (nodeData.value) {
        // 提取请求体参数的变量引用
        const bodyParams = extractVariableParams(newParams);

        // 获取其他参数类型的现有inputParams
        const otherParams = (nodeData.value.inputParams || []).filter((param: Parameter) => {
            const paramId = param.id || '';
            return !paramId.startsWith('body-');
        });

        // 合并所有参数
        nodeData.value.inputParams = [...otherParams, ...bodyParams];
      }
    }

    function handleAdd(): void {
      const newParam = createNewParam();
      const newParams = [...params.value, newParam];
      emitChange(newParams);
    }

    function handleDelete(target: HttpParameter): void {
      const newParams = params.value.filter((param: HttpParameter) => param.id !== target.id);
      emitChange(newParams);
    }

    function onUpdateParamCode(param: HttpParameter, newCode: string): void {
      param.code = newCode;
      param.name = newCode; // name和code保持一致
      emitChange([...params.value]);
    }

    function onUpdateParamType(param: HttpParameter, newType: TypeRefer): void {
      param.type = newType;
      param.dataType = typeReferToDataType(newType); // 使用转换函数
      emitChange([...params.value]);
    }

    function onUpdateParamValue(param: HttpParameter, newValue: ValueExpress): void {
      param.valueExpr = JSON.stringify(newValue);
      emitChange([...params.value]);
    }

    function renderTitleRow() {
      return (
        <div class={bem('title-row')}>
          <div class={bem('title-item')} style="flex: 2">参数名</div>
          <div class={bem('title-item')} style="flex: 1">类型</div>
          <div class={bem('title-item')} style="flex: 3">参数值</div>
          <div class={bem('placeholder')}></div>
        </div>
      );
    }

    function renderErrorTip(errorTip?: string) {
      if (!errorTip) {
        return;
      }
      return (
        <div class="fvf-form-item-error" title={errorTip}>{errorTip}</div>
      );
    }

    function renderParamItem(param: HttpParameter) {
      const allCodes = computed<string[]>(() => {
        return params.value.map(param => param.code);
      });

      // 从dataType转换为实际的TypeRefer，优先使用dataType
      const actualParamType = computed(() => {
        if (param.dataType !== undefined && param.dataType !== null) {
          return dataTypeToTypeRefer(param.dataType);
        }
        return param.type || BasicTypeRefer.StringType;
      });

      const validateOptions: ParamValidateOptions = {
        nodeData: nodeData.value,
        getAllCodes: () => allCodes.value,
        allowValueEmpty: false, // 默认必填，不允许值为空
      };

      // 自定义参数名验证，允许中划线
      const validateCodeWithHyphen = (code: string, options: ParamValidateOptions): string | undefined => {
        // 检查是否为空
        if (!code || code.trim() === '') {
          return '参数名不能为空';
        }

        // 检查重复
        const allCodes = options.getAllCodes ? options.getAllCodes() : [];
        const duplicateCount = allCodes.filter(c => c === code).length;
        if (duplicateCount > 1) {
          return '参数名不能重复';
        }

        // 允许中划线的参数名验证规则
        // 允许：字母、数字、下划线、中划线
        // 不能以数字或特殊字符开头
        const validPattern = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;
        if (!validPattern.test(code)) {
          return '参数名只能包含字母、数字、下划线和中划线，且不能以数字开头';
        }

        return undefined;
      };

      const codeError = validateCodeWithHyphen(param.code, validateOptions);
      const valueError = ParamValidateUtils.validateValue(param.valueExpr, validateOptions);

      return (
        <div class={bem('param')} key={param.id}>
          <div class={bem('param-item')} style="flex: 2">
            <f-input-group
              modelValue={param.code}
              enableClear={false}
              placeholder={'输入参数名'}
              customClass={codeError ? 'fvf-error-state' : undefined}
              onUpdate:modelValue={(newCode: string) => onUpdateParamCode(param, newCode)}
            ></f-input-group>
            {renderErrorTip(codeError)}
          </div>
          <div class={bem('param-item')} style="flex: 1">
            <TypeSelector
              modelValue={actualParamType.value}
              onUpdate:modelValue={(newType: TypeRefer) => onUpdateParamType(param, newType)}
            ></TypeSelector>
          </div>
          <div class={bem('param-item')} style="flex: 3">
            <ValueExpressionInput
              modelValue={param.valueExpr}
              paramType={actualParamType.value}
              placeholder={'必填参数，请输入或引用参数值'}
              class={valueError ? 'fvf-error-state' : undefined}
              onUpdate:modelValue={(newValue: ValueExpress) => onUpdateParamValue(param, newValue)}
            ></ValueExpressionInput>
            {renderErrorTip(valueError)}
          </div>
            <div class={bem('delete-btn')} onClick={() => handleDelete(param)}>
              <i class="f-icon f-icon-enclosure_delete"></i>
            </div>
        </div>
      );
    }

    function renderParams() {
      return params.value.map(param => renderParamItem(param));
    }

    function renderAddButton() {
      return (
        <div class={bem('btn-row')}>
          <f-button
            class={bem('add')}
            type="secondary"
            icon="f-icon-add"
            onClick={handleAdd}
          >新增</f-button>
          <div class={bem('placeholder')}></div>
        </div>
      );
    }

    return () => (
      <div class={bem()}>
        {renderTitleRow()}
        {renderParams()}
        {renderAddButton()}
      </div>
    );
  },
});

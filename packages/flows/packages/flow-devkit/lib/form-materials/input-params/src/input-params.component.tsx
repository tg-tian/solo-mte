import { defineComponent, computed } from 'vue';
import { inputParamsProps } from './input-params.props';
import { useBem, uuid, ParamValidateUtils } from '@farris/flow-devkit/utils';
import type { Parameter, TypeRefer, ValueExpress, ParamValidateOptions } from '@farris/flow-devkit/types';
import { BasicTypeRefer } from '@farris/flow-devkit/types';
import { TypeSelector, ValueExpressionInput } from '@farris/flow-devkit/form-materials';

import './input-params.scss';

const name = 'FvfInputParams';

export default defineComponent({
  name,
  props: inputParamsProps,
  emits: ['update:modelValue'],
  setup(props, context) {
    const { bem } = useBem(name);
    const params = computed(() => {
      return props.modelValue || [];
    });

    const allCodes = computed<string[]>(() => {
      return params.value.map(param => param.code);
    });

    const shouldShowAddButton = computed<boolean>(() => {
      if (typeof props.operationOptions?.showAddBtn === 'boolean') {
        return props.operationOptions.showAddBtn;
      }
      return !props.isFixedSchema;
    });

    const shouldShowDeleteBtn = computed<boolean>(() => {
      if (typeof props.operationOptions?.showDeleteBtn === 'boolean') {
        return props.operationOptions.showDeleteBtn;
      }
      return !props.isFixedSchema;
    });

    function createNewParam(): Parameter {
      return {
        id: uuid(),
        code: '',
        description: '',
        type: BasicTypeRefer.StringType,
        required: false,
      };
    }

    function emitChange(newParams: Parameter[]): void {
      context.emit('update:modelValue', newParams);
    }

    function handleAdd(): void {
      const newParam = createNewParam();
      const newParams = [...params.value, newParam];
      emitChange(newParams);
    }

    function handleDelete(target: Parameter): void {
      // 检查参数是否可删除
      if (target.readOnly === true) {
        return;
      }
      const newParams = params.value.filter(param => param.id !== target.id);
      emitChange(newParams);
    }

    function onUpdateParamCode(param: Parameter, newCode: string): void {
      // 检查参数是否可编辑
      if (param.readOnly === true) {
        return;
      }
      param.code = newCode;
      emitChange([...params.value]);
    }

    function onUpdateParamType(param: Parameter, newType: TypeRefer): void {
      // 检查参数是否可编辑
      if (param.readOnly === true) {
        return;
      }
      param.type = newType;
      emitChange([...params.value]);
    }

    function onUpdateParamValue(param: Parameter, newValue: ValueExpress, newType?: TypeRefer): void {
      // 检查参数是否可编辑
      if (param.readOnly === true) {
        return;
      }
      param.valueExpr = newValue;
      if (newType && !props.isFixedSchema) {
        param.type = newType;
      }
      emitChange([...params.value]);
    }

    function renderTitleRow() {
      return (
        <div class={bem('title-row')}>
          <div class={bem('title-item')} style="flex: 2">{props.paramCodeColumnTitle || '参数名'}</div>
          <div class={bem('title-item')} style="flex: 1; min-width: 100px;">{props.paramTypeColumnTitle || '类型'}</div>
          <div class={bem('title-item')} style="flex: 3">{props.paramValueColumnTitle || '参数值'}</div>
          {shouldShowDeleteBtn.value && (
            <div class={bem('placeholder')}></div>
          )}
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

    function renderParamItem(param: Parameter) {
      const validateOptions: ParamValidateOptions = {
        ...props.validateOptions,
        getAllCodes: () => allCodes.value,
      };
      const codeError = ParamValidateUtils.validateCode(param.code, validateOptions);
      const valueError = ParamValidateUtils.validateValue(param.valueExpr, validateOptions);

      // 检查参数是否可编辑，如果不可编辑则所有字段都只读
      const isParamReadonly = props.isFixedSchema || param.readOnly === true;
      // 检查是否显示删除按钮
      const showDeleteBtn = shouldShowDeleteBtn.value && param.readOnly !== true;

      return (
        <div class={bem('param')} key={param.id}>
          <div class={bem('input-item')} style="flex: 2">
            <f-input-group
              modelValue={param.code}
              enableClear={false}
              placeholder={'输入参数名'}
              readonly={isParamReadonly}
              customClass={codeError ? 'fvf-error-state' : undefined}
              onUpdate:modelValue={(newCode: string) => onUpdateParamCode(param, newCode)}
            ></f-input-group>
            {renderErrorTip(codeError)}
          </div>
          <div class={bem('input-item')} style="flex: 1; min-width: 100px;">
            <TypeSelector
              modelValue={param.type}
              readonly={isParamReadonly}
              onUpdate:modelValue={(newType) => onUpdateParamType(param, newType)}
            ></TypeSelector>
          </div>
          <div class={bem('input-item')} style="flex: 3">
            <ValueExpressionInput
              modelValue={param.valueExpr}
              paramType={param.type}
              placeholder={'输入或引用参数值'}
              typeFilter={props.typeFilter}
              class={valueError ? 'fvf-error-state' : undefined}
              onUpdate:modelValue={(newValue, _, { type }) => onUpdateParamValue(param, newValue, type)}
            ></ValueExpressionInput>
            {renderErrorTip(valueError)}
          </div>
          {shouldShowDeleteBtn.value && (
            <div class={bem('delete-btn')} onClick={() => handleDelete(param)}>
              {showDeleteBtn && <i class="f-icon f-icon-enclosure_delete"></i>}
            </div>
          )}
        </div>
      );
    }

    function renderParams() {
      return params.value.map(param => renderParamItem(param));
    }

    function renderAddButton() {
      if (!shouldShowAddButton.value) {
        return;
      }
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

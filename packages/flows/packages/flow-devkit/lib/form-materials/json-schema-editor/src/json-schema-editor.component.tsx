import { defineComponent, computed } from 'vue';
import { jsonSchemaEditorProps } from './json-schema-editor.props';
import { useBem, uuid, ParamValidateUtils } from '@farris/flow-devkit/utils';
import type { Parameter, TypeRefer, ParamValidateOptions } from '@farris/flow-devkit/types';
import { BasicTypeRefer } from '@farris/flow-devkit/types';
import { TypeSelector } from '@farris/flow-devkit/form-materials';

import './json-schema-editor.scss';

const name = 'FvfJsonSchemaEditor';

/**
 * @description
 * 常用于可视化配置节点的输出变量。
 * 用于编辑一个`Parameter[]`，主要编辑`参数名`和`参数类型`，不编辑`参数值`。
 * 对标`Coze工作流`中`开始`节点的`输入`参数编辑器。
 * @todo
 * 初期暂不实现对`Object`和`Array<Object>`类型的嵌套定义。
 */
export default defineComponent({
  name,
  props: jsonSchemaEditorProps,
  emits: ['update:modelValue'],
  setup(props, context) {
    const { bem } = useBem(name);
    const params = computed(() => {
      return props.modelValue || [];
    });

    const allCodes = computed<string[]>(() => {
      return params.value.map(param => param.code);
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

    function renderTitleRow() {
      return (
        <div class={bem('title-row')}>
          <div class={bem('title-item')} style="flex: 3">参数名</div>
          <div class={bem('title-item')} style="flex: 2">类型</div>
          {!props.readonly && (
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

      // 检查参数是否可编辑，如果不可编辑则所有字段都只读
      const isParamReadonly = props.readonly || param.readOnly === true;
      // 检查是否显示删除按钮
      const showDeleteBtn = !props.readonly && param.readOnly !== true;

      return (
        <div class={bem('param')} key={param.id}>
          <div class={bem('input-item')} style="flex: 3">
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
          <div class={bem('input-item')} style="flex: 2">
            <TypeSelector
              modelValue={param.type}
              readonly={isParamReadonly}
              onUpdate:modelValue={(newType) => onUpdateParamType(param, newType)}
            ></TypeSelector>
          </div>
          {!props.readonly && (
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
      if (props.readonly) {
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

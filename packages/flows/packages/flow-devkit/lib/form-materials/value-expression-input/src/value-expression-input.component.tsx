import { defineComponent, computed } from 'vue';
import { valueExpressionInputProps, VALUE_EXPRESSION_INPUT_NAME } from './value-expression-input.props';
import { useBem, ParamValidateUtils } from '@farris/flow-devkit/utils';
import { useModal } from './composition/use-modal';
import { useValueExpression } from './composition/use-value-expression';
import type { ValueExpress, ValueExpressionResult } from '@farris/flow-devkit/types';

import './value-expression-input.scss';

/**
 * 支持字符串反序列化和对象格式
 */
function parseModelValue(modelValue: ValueExpress | string | undefined): ValueExpress | undefined {
  if (!modelValue) {
    return undefined;
  }
  // 如果已经是对象格式，直接返回
  if (typeof modelValue === 'object' && modelValue !== null) {
    return modelValue;
  }
  // 如果是字符串格式，尝试反序列化
  if (typeof modelValue === 'string') {
    try {
      const parsed = JSON.parse(modelValue);
      // 确保解析后的对象有 kind 属性
      if (parsed && typeof parsed === 'object' && parsed.kind) {
        return parsed;
      }
      console.warn('ValueExpressionInput: Invalid serialized ValueExpress format', modelValue);
      return undefined;
    } catch (error) {
      console.warn('ValueExpressionInput: Failed to parse modelValue as JSON', modelValue, error);
      return undefined;
    }
  }
  return undefined;
}

export default defineComponent({
  name: VALUE_EXPRESSION_INPUT_NAME,
  props: valueExpressionInputProps,
  emits: {
    'update:modelValue': (_express: ValueExpress, _: ValueExpress, _result: ValueExpressionResult) => {
      return true;
    }
  },
  setup(props, context) {
    const { attrs } = context;
    const { bem } = useBem(VALUE_EXPRESSION_INPUT_NAME);
    const { openModal } = useModal(props, context as any);

    // 解析 modelValue，支持序列化格式
    const parsedModelValue = computed(() => parseModelValue(props.modelValue));

    const { renderValueExpression } = useValueExpression({
      nodeVariables: props.nodeVariables,
    });

    const errorTip = computed<string | undefined>(() => {
      const validateOptions = props.validateOptions ?? { allowValueEmpty: true };
      const options = { ...validateOptions };
      delete options.nodeData;
      return ParamValidateUtils.validateValue(parsedModelValue.value, options);
    });

    function onInputClick(): void {
      openModal();
    }

    function renderPlaceholder() {
      return (
        <div class={bem('content-placeholder')}>{props.placeholder || ''}</div>
      );
    }

    function renderCurrentValue() {
      if (!parsedModelValue.value) {
        return renderPlaceholder();
      }
      return renderValueExpression(parsedModelValue.value);
    }

    function renderErrorTip() {
      if (!errorTip.value) {
        return;
      }
      return (
        <div class="fvf-form-item-error" title={errorTip.value}>{errorTip.value}</div>
      );
    }

    const inputClass = computed(() => ({
      [bem()]: true,
      'fvf-error-state': !!errorTip.value,
    }));

    return () => (
      <>
        <div
          {...attrs}
          class={inputClass.value}
          onClick={onInputClick}
        >
          <div class={bem('content')}>
            {renderCurrentValue()}
          </div>
          <div class={bem('button')}>
            <i class="f-icon f-icon-lookup"></i>
          </div>
        </div>
        {renderErrorTip()}
      </>
    );
  },
});

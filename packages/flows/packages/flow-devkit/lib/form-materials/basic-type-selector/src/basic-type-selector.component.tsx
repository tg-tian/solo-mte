import { computed, defineComponent } from 'vue';
import { basicTypeSelectorProps, BASIC_TYPE_SELECTOR_NAME } from './basic-type-selector.props';
import { TSelect, type TdOptionProps } from '@farris/flow-devkit/third-party';

import './basic-type-selector.scss';

export default defineComponent({
  name: BASIC_TYPE_SELECTOR_NAME,
  props: basicTypeSelectorProps,
  emits: {
    'update:modelValue': (_newType: string) => {
      return true;
    },
  },
  setup(props, context) {
    const shouldShowArrow = computed<boolean>(() => !props.readonly);

    const selectOptions = computed<TdOptionProps[]>(() => [
      { value: 'string', label: 'String' },
      { value: 'number', label: 'Number' },
      { value: 'boolean', label: 'Boolean' },
      { value: 'object', label: 'Object', disabled: props.disableObjectOptions },
      { value: 'array-string', label: 'Array<String>' },
      { value: 'array-number', label: 'Array<Number>' },
      { value: 'array-boolean', label: 'Array<Boolean>' },
      { value: 'array-object', label: 'Array<Object>', disabled: props.disableObjectOptions },
    ]);

    const currentLabel = computed<string>(() => {
      const option = selectOptions.value.find(item => item.value === props.modelValue);
      return option?.label || '';
    });

    function onChange(newValue: any): void {
      context.emit('update:modelValue', newValue);
    }

    return () => (
      <TSelect
        value={props.modelValue}
        options={selectOptions.value}
        clearable={false}
        size={'small'}
        readonly={props.readonly}
        showArrow={shouldShowArrow.value}
        popupProps={{
          overlayInnerClassName: 'larger-max-height',
        }}
        {...{
          title: currentLabel.value,
        }}
        onChange={onChange}
      ></TSelect>
    );
  },
});

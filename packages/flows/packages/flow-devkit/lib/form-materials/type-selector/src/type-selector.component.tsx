import { computed, defineComponent, ref } from 'vue';
import { typeSelectorProps, TYPE_SELECTOR_NAME } from './type-selector.props';
import { BasicTypeRefer, type BasicTypeReferID, type TypeRefer } from '@farris/flow-devkit/types';
import { useData } from './composition/use-data';
import { TSelect } from '@farris/flow-devkit/third-party';
import { useBem } from '@farris/flow-devkit/utils';
import { useModal } from './composition/use-modal';
import { useTypeDetails } from '@farris/flow-devkit/composition';

import './type-selector.scss';

export default defineComponent({
  name: TYPE_SELECTOR_NAME,
  props: typeSelectorProps,
  emits: {
    'update:modelValue': (_newType: TypeRefer) => {
      return true;
    },
  },
  setup(props, context) {
    const { bem } = useBem(TYPE_SELECTOR_NAME);
    const { fullTypeID2Type, getTypeCode, getTypeName } = useTypeDetails();

    const { getOptions, getOptionItemId } = useData();
    const options = getOptions();
    const selectedOptionId = computed<string>(() => getOptionItemId(props.modelValue));

    const { openModal } = useModal(props, context as any);

    const popupVisible = ref<boolean>(false);

    const shouldShowArrow = computed<boolean>(() => !props.readonly && !props.disabled);

    const currentValueCode = computed<string>(() => {
      fullTypeID2Type;
      return getTypeCode(props.modelValue);
    });

    const currentValueName = computed<string>(() => {
      fullTypeID2Type;
      return getTypeName(props.modelValue);
    });

    function onChange(newId: any): void {
      const newType = BasicTypeRefer[newId as BasicTypeReferID];
      context.emit('update:modelValue', newType);
    }

    function openMoreTypeModal() {
      popupVisible.value = false;
      openModal();
    }

    function renderPanelBottomContent() {
      return (
        <div class={bem('more-type')}>
          <f-button type="link" onClick={openMoreTypeModal}>{'更多类型'}</f-button>
        </div>
      );
    }

    function renderCurrentValue() {
      if (!props.modelValue) {
        return;
      }
      return (
        <span
          class={bem('current-value')}
          title={currentValueName.value}
        >{currentValueCode.value}</span>
      );
    }

    return () => (
      <TSelect
        value={selectedOptionId.value}
        options={options}
        popupVisible={popupVisible.value}
        onPopupVisibleChange={newValue => { popupVisible.value = newValue }}
        clearable={false}
        size={'small'}
        readonly={props.readonly}
        disabled={props.disabled}
        showArrow={shouldShowArrow.value}
        popupProps={{
          overlayInnerClassName: 'larger-max-height',
        }}
        panelBottomContent={renderPanelBottomContent}
        valueDisplay={renderCurrentValue}
        {...{
          title: currentValueName.value,
        }}
        onChange={onChange}
      ></TSelect>
    );
  },
});

import { defineComponent, ref, watch } from 'vue';
import { exceptionLevelSelectorProps } from './exception-level-selector.props.ts';
import './exception-level-selector.scss';

export default defineComponent({
  name: 'ExceptionLevelSelector',
  props: exceptionLevelSelectorProps,
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    // 定义下拉数据源
    const levelDefinitions = ref([
      { valueField: 'info', textField: 'info' },
      { valueField: 'warning', textField: 'warning' },
      { valueField: 'error', textField: 'error' },
      { valueField: 'fatal', textField: 'fatal' }
    ]);

    const selectedLevelId = ref(props.modelValue);

    watch(() => props.modelValue, (newValue) => {
      selectedLevelId.value = newValue;
    });

    // 更新级别
    const updateLevel = (newLevelId: string) => {
      selectedLevelId.value = newLevelId;
      emit('update:modelValue', newLevelId);
    };

    return () => (
      <div class="exception-level-editor">
        <f-combo-list
          modelValue={selectedLevelId.value}
          onUpdate:modelValue={updateLevel}
          data={levelDefinitions.value}
          valueField="valueField"
          textField="textField"
          idField="valueField"
          placeholder="请选择级别"
          class="exception-level-combo"
        />
      </div>
    );
  },
});

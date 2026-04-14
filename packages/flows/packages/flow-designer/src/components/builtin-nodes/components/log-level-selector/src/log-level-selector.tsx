import { defineComponent, ref, watch } from 'vue';
import { logLevelSelectorProps } from './log-level-selector.props.ts';
import './log-level-selector.scss';

export default defineComponent({
  name: 'LogLevelSelector',
  props: logLevelSelectorProps,
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    // 定义下拉数据源
    const levelDefinitions = ref([
      { valueField: 'trace', textField: 'trace' },
      { valueField: 'debug', textField: 'debug' },
      { valueField: 'info', textField: 'info' },
      { valueField: 'warn', textField: 'warn' },
      { valueField: 'error', textField: 'error' }
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
      <div class="log-level-editor">
        <f-combo-list
          modelValue={selectedLevelId.value}
          onUpdate:modelValue={updateLevel}
          data={levelDefinitions.value}
          valueField="valueField"
          textField="textField"
          idField="valueField"
          placeholder="请选择级别"
          class="log-level-combo"
        />
      </div>
    );
  },
});

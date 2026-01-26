import { computed, defineComponent, onMounted, ref } from 'vue';
import { modelSelectorProps } from './model-selector.props';
import { get }  from '@/api/request';
import { usePopover } from './composition/use-popover';
import ModelSelectorPopup from './model-selector-popup.vue';

import './model-selector.scss';

/**
 * 模型选择器
 * @description
 * 通过一个下拉框选择参数的类型，从后端API获取模型选项数据。
 * 在样式上对标Coze的参数选择器，在功能上，可以选择对应的模型。
 */
export default defineComponent({
  name: 'ModelSelector',
  props: modelSelectorProps,
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    // 模型数据列表
    const comboData = ref<Array<{ value: string; text: string; [key: string]: any }>>([]);

    // 当前选中的值
    const modelValue = ref(props.modelValue);
    const modelId = computed(() => props.modelValue.modelId);
    const nodeData = computed(() => props.nodeData);

    /**
     * 从后端API获取模型数据
     */
    async function fetchModelData(): Promise<void> {

      try {
        const response = await get('/runtime/sys/v1.0/aiCenter/show/instancesModels');
        const models = response || [];

        comboData.value = models.map((model: any) => ({
          id: model.modelId,
          modelId: model.modelId,
          modelName: model.modelName,
        }));

      } catch (err) {
        console.error('Error fetching model data:', err);
      }
    }

    /**
     * 处理选择变化
     */
    function onChange(newValue: string): void {
      const modelInfo = comboData.value.find((item) => item.modelId === newValue);
      console.log('modelInfo', modelInfo);
      // 保留现有的 modelInfo 属性，只更新模型相关属性
      const newModelValue = {
        ...modelValue.value,
        modelId: modelInfo?.modelId,
        modelName: modelInfo?.modelName,
      };

      emit('update:modelValue', newModelValue);
    }

    onMounted(() => {
      fetchModelData();

      // 强制设置默认的 modelStyle 为精准模式
      // 确保即使没有用户交互也会传递 modelStyle 参数
      modelValue.value.modelStyle = 'Precise';
    });

    // 从 nodeData.modelInfo 中获取值，使用 computed 保持响应性
    const currentStyle = computed(() => nodeData.value?.modelInfo?.modelStyle || 'Precise');
    const temperatureValue = computed(() => nodeData.value?.modelInfo?.temperature || 0.6);
    const topPValue = computed(() => nodeData.value?.modelInfo?.topP || 0.7);

    // 使用组合式函数管理Popover
    const {
      modelStyleChange,
      temperatureChange,
      temperatureInputChange,
      topPChange,
      topPInputChange
    } = usePopover({
      currentStyle,
      diversityValue: temperatureValue,
      samplingValue: topPValue,
      nodeData
    });

    // 组件挂载后初始化滑块样式
    onMounted(() => {
      // 先执行原有的fetchModelData
      fetchModelData();

      // 确保 modelInfo 对象存在
      if (!nodeData.value.modelInfo) {
        nodeData.value.modelInfo = {};
      }

      // 强制设置默认的 modelStyle 为精准模式
      nodeData.value.modelInfo.modelStyle = 'Precise';
    })


    return () => (
      <div class="model-selector">
      {/* 标题区域 */}
      <div class="model-selector-header">
        <div class="model-selector-title">模型选择</div>
      </div>
      {/* 模型选择器主体 */}
      <div class="model-selector-body">
        <f-combo-list
          class="model-selector-combo-list"
          modelValue={modelId.value}
          data={comboData.value}
          textField="modelName"
          onUpdate:modelValue={onChange}
        ></f-combo-list>

        <ModelSelectorPopup
          currentStyle={currentStyle.value}
          temperatureValue={temperatureValue.value}
          topPValue={topPValue.value}
          nodeData={nodeData}
          onModelStyleChange={modelStyleChange}
          onTemperatureChange={temperatureChange}
          onTemperatureInputChange={temperatureInputChange}
          onTopPChange={topPChange}
          onTopPInputChange={topPInputChange}
        />
      </div>

      {/* 为空提示 - 在整个组件下方 */}
      {!modelId.value && (
        <div class="model-selector-empty-tip" title="请选择一个模型以继续">
          请选择一个模型以继续
        </div>
      )}
      </div>
    );
  },
});

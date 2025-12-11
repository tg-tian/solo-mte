import type { PropType, ExtractPropTypes } from 'vue';
import { createPropsResolver } from '@farris/ui-vue';
import modelSelectorSchema from './schema/model-selector.schema.json';
import type { NodeData } from '@farris/flow-devkit';

/**
 * 模型选择器的属性定义
 */
export const modelSelectorProps = {
  modelValue: {
    type: Object as PropType<{ modelId: string, modelName: string, modelStyle: string, temperature?: number, topP?: number }>,
    default: () => ({ modelId: '', modelName: '', modelStyle: 'Precise' })
  },

  /** 节点数据 */
  nodeData: { type: Object as PropType<NodeData>, required: true },
} as const;

export type ModelSelectorProps = ExtractPropTypes<typeof modelSelectorProps>;
export const propsResolver = createPropsResolver(modelSelectorProps, modelSelectorSchema);

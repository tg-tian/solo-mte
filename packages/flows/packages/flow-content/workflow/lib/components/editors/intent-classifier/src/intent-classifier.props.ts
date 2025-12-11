import type { PropType, ExtractPropTypes } from 'vue';
import { createPropsResolver } from '@farris/ui-vue';
import intentClassifierSchema from './schema/intent-classifier.schema.json';
import type { NodeData } from '@farris/flow-devkit';

export interface IntentClass {
    categoryId: string;
    categoryName: string;
}

/**
 * 意图分类编辑器的属性定义
 */
export const intentClassifierProps = {
    modelValue: {
        type: Array as PropType<IntentClass[]>,
        default: () => []
    },
    nodeData: { type: Object as PropType<NodeData> },
} as const;

export type IntentClassifierProps = ExtractPropTypes<typeof intentClassifierProps>;
export const propsResolver = createPropsResolver(intentClassifierProps, intentClassifierSchema);

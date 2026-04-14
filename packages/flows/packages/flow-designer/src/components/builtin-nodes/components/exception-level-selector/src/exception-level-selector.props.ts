import type { PropType, ExtractPropTypes } from 'vue';
import { createPropsResolver } from '@farris/ui-vue';
import LevelSelectorSchema from './schema/exception-level-selector.schema.json';
import type { NodeData } from '@farris/flow-devkit';

/**
 * 异常级别下拉框
 */
export const exceptionLevelSelectorProps = {
    modelValue: {
        type: String as PropType<string>,
        default: () => []
    },
    nodeData: { type: Object as PropType<NodeData> },
} as const;

export type ExceptionLevelSelectorProps = ExtractPropTypes<typeof exceptionLevelSelectorProps>;
export const propsResolver = createPropsResolver(exceptionLevelSelectorProps, LevelSelectorSchema);

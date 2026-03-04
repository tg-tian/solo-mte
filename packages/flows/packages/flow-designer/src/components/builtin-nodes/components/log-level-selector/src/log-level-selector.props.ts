import type { PropType, ExtractPropTypes } from 'vue';
import { createPropsResolver } from '@farris/ui-vue';
import LevelSelectorSchema from './schema/log-level-selector.schema.json';
import type { NodeData } from '@farris/flow-devkit';

/**
 * 日志级别下拉框
 */
export const logLevelSelectorProps = {
    modelValue: {
        type: String as PropType<string>,
        default: () => []
    },
    nodeData: { type: Object as PropType<NodeData> },
} as const;

export type LogLevelSelectorProps = ExtractPropTypes<typeof logLevelSelectorProps>;
export const propsResolver = createPropsResolver(logLevelSelectorProps, LevelSelectorSchema);

import type { ExtractPropTypes, PropType } from 'vue';
import type { NodePanelCategory } from '@flow-designer/types';

export const nodePanelProps = {
    /** 默认显示的分组，仅包含当前流程的节点 */
    nodeCategories: { type: Array as PropType<NodePanelCategory[]>, default: () => [] },
    /** 包含全部节点的分组，包含所有流程的所有节点 */
    allNodeCategories: { type: Array as PropType<NodePanelCategory[]>, default: () => [] },
};

export type NodePanelProps = ExtractPropTypes<typeof nodePanelProps>;

import type { ExtractPropTypes, PropType } from 'vue';
import type { NodeProps } from '@farris/flow-devkit/types';

export const nodeWrapperProps = {
    /** 节点的全部属性 */
    nodeProps: { type: Object as PropType<NodeProps> },

    /** 节点的宽度 */
    width: { type: [Number, String] },
};

export type NodeWrapperProps = ExtractPropTypes<typeof nodeWrapperProps>;

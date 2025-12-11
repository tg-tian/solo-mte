import { defineComponent, type PropType } from 'vue';
import { provideNodeVariables } from '@farris/flow-devkit/composition';
import type { NodeData } from '@farris/flow-devkit/types';
import {
    NODE_VARIABLES_KEY,
    WRITABLE_NODE_VARIABLES_KEY,
} from '@farris/flow-devkit/constants';

export const NodeContextProvider = defineComponent({
    name: 'NodeContextProvider',
    props: {
        data: {
            type: Object as PropType<NodeData>,
            required: true,
        }
    },
    setup(props, context) {
        const { nodeVariables, writableNodeVariables } = provideNodeVariables();
        const nodeData = props.data;
        nodeData[NODE_VARIABLES_KEY] = nodeVariables;
        nodeData[WRITABLE_NODE_VARIABLES_KEY] = writableNodeVariables;
        return () => context.slots.default?.();
    },
});

import { computed, markRaw } from 'vue';
import { nodeRegistry, NodeRenderer } from '@farris/flow-devkit';

export function useNodeTypes() {

    const allNodeDefinitions = nodeRegistry.getAllNodeDefinitions();

    const nodeTypes = computed(() => {
        const result: Record<string, any> = {};
        allNodeDefinitions.value.forEach(nodeDef => {
            const type = nodeDef.metadata.type;
            result[type] = markRaw(NodeRenderer);
        });
        return result;
    });

    return {
        nodeTypes,
    };
}

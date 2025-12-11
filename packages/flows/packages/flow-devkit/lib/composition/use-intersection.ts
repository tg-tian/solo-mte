import { type InjectionKey, type Ref, computed, inject } from 'vue';
import { useNodeId } from './use-node-id';

export const INTERSECTED_CONTAINER_NODE_ID_KEY: InjectionKey<Ref<string>> = Symbol('intersectedContainerNodeId');

export function useIntersection() {
    const nodeId = useNodeId();
    const intersectedContainerNodeId = inject(INTERSECTED_CONTAINER_NODE_ID_KEY, null);
    const isIntersectedContainerNode = computed<boolean>(() => {
        return nodeId.value === intersectedContainerNodeId?.value;
    });

    return {
        isIntersectedContainerNode,
    };
}

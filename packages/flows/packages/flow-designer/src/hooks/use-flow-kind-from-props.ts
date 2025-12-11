import { ref, watch } from 'vue';
import {
    type FlowRegistry,
    type FlowInitialData,
    nodeRegistry,
    registerNodes,
    registerCustomComponents,
} from '@farris/flow-devkit';
import { BUILTIN_NODES } from '@flow-designer/components/builtin-nodes';
import type { NodePanelCategory } from '@flow-designer/types';
import type { FlowDesignerProps } from '@flow-designer/components/flow-designer';
import type { UseFlowKind } from './types';
import { useEdgeTypes } from './use-edge-types';

export function useFlowKindFromProps(flowDesignerProps?: FlowDesignerProps): UseFlowKind {
    if (!flowDesignerProps) {
        throw new Error('Cannot retrieve flow designer props.');
    }
    const { registerCustomEdges } = useEdgeTypes();
    const flowRegistry = ref<FlowRegistry>();

    /** 当前流程节点的分组 */
    const currentNodeCategories = ref<NodePanelCategory[]>([]);
    /** 全部节点的分组 */
    const allNodeCategories = ref<NodePanelCategory[]>([]);

    function updateFlowRegistry(newFlowRegistry: FlowRegistry): void {
        const nodes = newFlowRegistry.nodes || [];
        const componentRegistries = newFlowRegistry.componentRegistries || [];
        const unregisteredNodes = nodes.filter(node => {
            return !!node?.metadata?.type && !nodeRegistry.get(node.metadata.type);
        });
        registerNodes(unregisteredNodes);
        registerCustomEdges(newFlowRegistry.edges);
        registerCustomComponents(componentRegistries);
        flowRegistry.value = newFlowRegistry;
    }

    watch(
        () => flowDesignerProps.flowRegistry,
        () => {
            if (flowDesignerProps.flowRegistry) {
                updateFlowRegistry(flowDesignerProps.flowRegistry);
            }
        },
        { immediate: true },
    );

    function initFlowContent(): Promise<boolean> {
        registerNodes(BUILTIN_NODES);
        return Promise.resolve(true);
    }

    function getNodeCategories() {
        return currentNodeCategories;
    }

    function getAllNodeCategories() {
        return allNodeCategories;
    }

    function loadNodeByType(): Promise<boolean> {
        return Promise.resolve(false);
    }

    function initializeFlowDataByDefault(): FlowInitialData {
        return {};
    }

    return {
        flowRegistry,
        initFlowContent,
        getNodeCategories,
        getAllNodeCategories,
        loadNodeByType,
        initializeFlowDataByDefault,
    };
}

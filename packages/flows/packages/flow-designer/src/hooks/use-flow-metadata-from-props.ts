import { ref, reactive, computed, watch } from 'vue';
import {
    type FlowMetadata,
} from '@farris/flow-devkit';
import type { FlowDesignerProps } from '@flow-designer/components/flow-designer';
import type { UseFlowMetadata } from './types';
import { useFlowKind } from './use-flow-kind';
import { useVueFlowDataConverter } from './use-vue-flow-data-converter';
import { useVueFlow } from '@vue-flow/core';
import { syncObject } from './common.utils';

export function useFlowMetadataFromProps(flowDesignerProps?: FlowDesignerProps): UseFlowMetadata {
    if (!flowDesignerProps) {
        throw new Error('Cannot retrieve flow designer props.');
    }

    const {
        setNodes,
        setEdges,
        onPaneReady,
        fitView,
    } = useVueFlow();
    const {
        convertFlowMetadata2VueFlowData,
    } = useVueFlowDataConverter();
    const {
        flowRegistry,
        initFlowContent,
    } = useFlowKind(flowDesignerProps);

    const isLoaded = ref(false);
    const isReady = ref(false);
    const metadata = reactive<FlowMetadata>({} as FlowMetadata);

    const flowType = computed<string>(() => metadata.kind || '');

    function saveFlowMetadata() {
        return Promise.resolve(false);
    }

    function validFlowMetadata(metadata: FlowMetadata): void {
        metadata.nodes = metadata.nodes || [];
        metadata.edges = metadata.edges || [];
        metadata.extension = metadata.extension || {};
    }

    function onFlowMetadataChange(newFlowMetadata: FlowMetadata): void {
        validFlowMetadata(newFlowMetadata);
        const { nodes, edges } = convertFlowMetadata2VueFlowData(newFlowMetadata);
        setNodes(nodes);
        setEdges(edges);
        syncObject(metadata, newFlowMetadata);
        if (isReady.value) {
            handleFitView();
        }
    }

    let initialize = false;

    watch(
        () => flowDesignerProps.flowMetadata,
        () => {
            if (!flowDesignerProps.flowMetadata) {
                return;
            }
            onFlowMetadataChange(flowDesignerProps.flowMetadata);
            if (!initialize) {
                initialize = true;
                initFlowContent(flowType.value, metadata).then(() => {
                    isLoaded.value = true;
                });
            }
        },
        { immediate: true },
    );

    function handleFitView() {
        return fitView({
            padding: 0.2,
            includeHiddenNodes: true,
            duration: 0,
        });
    }

    onPaneReady(() => {
        handleFitView().finally(() => {
            isReady.value = true;
        });
    });

    return {
        metadata,
        flowType,
        flowRegistry,
        isLoaded,
        isReady,
        saveFlowMetadata,
    };
}

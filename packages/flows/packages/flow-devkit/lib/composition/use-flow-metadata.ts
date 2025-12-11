import { ref } from 'vue';
import type { FlowMetadata } from '@farris/flow-devkit/types';

export const CURRENT_FLOW_METADATA = ref<FlowMetadata>();

export function useFlowMetadata() {

    function getFlowMetadata(): FlowMetadata | undefined {
        return CURRENT_FLOW_METADATA.value;
    }

    function getFlowKind(): string {
        const metadata = CURRENT_FLOW_METADATA.value;
        if (!metadata) {
            return '';
        }
        return metadata.kind;
    }

    return {
        flowKind: getFlowKind(),
        flowMetadata: getFlowMetadata(),
        getFlowKind,
        getFlowMetadata,
    };
}

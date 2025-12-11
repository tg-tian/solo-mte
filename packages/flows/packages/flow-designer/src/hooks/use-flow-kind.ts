import { provide } from 'vue';
import type { FlowDesignerProps, DesignerMode } from '@flow-designer/components/flow-designer';
import type { UseFlowKind } from './types';
import { useFlowKindFromBackend } from './use-flow-kind-from-backend';
import { useFlowKindFromProps } from './use-flow-kind-from-props';
import { FLOW_REGISTRY_KEY } from './constants';

let flowKindInstance: UseFlowKind;

export function useFlowKind(flowDesignerProps?: FlowDesignerProps): UseFlowKind {
    if (flowKindInstance) {
        return flowKindInstance;
    }
    const designerMode: DesignerMode = flowDesignerProps?.mode ?? 'full';

    flowKindInstance = designerMode === 'full'
        ? useFlowKindFromBackend(flowDesignerProps)
        : useFlowKindFromProps(flowDesignerProps);

    const {
        flowRegistry,
    } = flowKindInstance;

    provide(FLOW_REGISTRY_KEY, flowRegistry);

    return flowKindInstance;
}

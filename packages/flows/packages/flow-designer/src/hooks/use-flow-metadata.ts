import { CURRENT_FLOW_METADATA } from '@farris/flow-devkit';
import type { FlowDesignerProps, DesignerMode } from '@flow-designer/components/flow-designer';
import type { UseFlowMetadata } from './types';
import { useFlowMetadataFromBackend } from './use-flow-metadata-from-backend';
import { useFlowMetadataFromProps } from './use-flow-metadata-from-props';
import { FLOW_METADATA_KEY } from '@flow-designer/hooks';
import { provide, watch } from 'vue';

let useFlowMetadataInstance: UseFlowMetadata;

/**
 * 流程元数据操作
 * @description 用于流程元数据的加载
 */
export function useFlowMetadata(flowDesignerProps?: FlowDesignerProps): UseFlowMetadata {
    if (useFlowMetadataInstance) {
        return useFlowMetadataInstance;
    }
    const designerMode: DesignerMode = flowDesignerProps?.mode ?? 'full';

    useFlowMetadataInstance = designerMode === 'full'
        ? useFlowMetadataFromBackend(flowDesignerProps)
        : useFlowMetadataFromProps(flowDesignerProps);

    const {
        metadata,
    } = useFlowMetadataInstance;

    provide(FLOW_METADATA_KEY, metadata);

    watch(metadata, () => {
        CURRENT_FLOW_METADATA.value = metadata;
    }, { immediate: true });

    return useFlowMetadataInstance;
}

import type { FlowDesignerProps } from '@flow-designer/components/flow-designer';
import type { UseFlowMetadata } from './types';
import { reactive, computed, ref } from 'vue';
import type { FlowMetadata } from '@farris/flow-devkit';
import { useNotify, useMessageBox } from '@farris/flow-devkit';
import { useVueFlow } from '@vue-flow/core';
import { useVueFlowDataConverter } from './use-vue-flow-data-converter';
import { useFlowKind } from '@flow-designer/hooks';
import { FlowApi } from '@flow-designer/api';
import { useTypeLoader } from './use-type-loader';
import { syncObject } from './common.utils';

export function useFlowMetadataFromBackend(flowDesignerProps?: FlowDesignerProps): UseFlowMetadata {
    const mockFlowMetadata = flowDesignerProps?.flowMetadata;

    const notifyService = useNotify();
    const messageBoxService = useMessageBox();

    const {
        nodes,
        edges,
        setNodes,
        setEdges,
        onPaneReady,
    } = useVueFlow();
    const {
        flowRegistry,
        initFlowContent,
        initializeFlowDataByDefault,
    } = useFlowKind(flowDesignerProps);
    const {
        convertFlowMetadata2VueFlowData,
        convertVueFlowData2FlowMetadata,
    } = useVueFlowDataConverter();
    const { loadAllTypes } = useTypeLoader();

    const isLoaded = ref(false);
    const isReady = ref(false);
    const metadata = reactive<FlowMetadata>({} as FlowMetadata);

    const flowType = computed<string>(() => metadata.kind || '');

    /**
     * 获取目标元数据ID
     * @description URL中的查询参数`metadataId`是待加载的流程元数据ID
     */
    function getFlowMetadataId(): string {
        const searchParams = new URLSearchParams(window.location.search);
        return searchParams.get('metadataId') || '';
    }

    function validFlowMetadata(metadata: FlowMetadata): void {
        metadata.nodes = metadata.nodes || [];
        metadata.edges = metadata.edges || [];
        metadata.extension = metadata.extension || {};
    }

    /**
     * 加载流程元数据
     * @description 如果id为空则返回mock数据
     * @param id 流程元数据ID
     * @returns 流程元数据
     */
    async function loadFlowMetadata(id?: string): Promise<FlowMetadata> {
        if (!id) {
            const mockData = mockFlowMetadata || MOCK_FLOW_METADATA;
            return Promise.resolve(mockData);
        }
        const result = await FlowApi.getFlowMetadata(id).catch(() => null);
        const metadata = result?.data;
        if (!metadata) {
            notifyService.error('加载流程元数据失败');
            throw new Error('Failed to load flow metadata');
        }
        validFlowMetadata(metadata);
        return metadata;
    }

    async function saveFlowMetadata(silent?: boolean): Promise<boolean> {
        if (!isLoaded.value) {
            return false;
        }
        const newFlowMetadata = convertVueFlowData2FlowMetadata(
            nodes.value,
            edges.value,
            metadata,
        );
        if (!newFlowMetadata.code || !newFlowMetadata.name) {
            const errorTip = !newFlowMetadata.code ? `流程编号不可为空` : `流程名称不可为空`;
            if (!silent) {
                notifyService.error(errorTip);
            }
            console.error(errorTip);
            return false;
        }
        let data = JSON.parse(JSON.stringify(newFlowMetadata));
        const beforeSaveMetadata = flowRegistry.value?.beforeSaveMetadata;
        if (typeof beforeSaveMetadata === 'function') {
            data = beforeSaveMetadata(data);
            if (!data) {
                return false;
            }
        }
        const result = await FlowApi.saveFlowMetadata(data);
        const isSuccess = result?.success ?? false;
        if (!silent) {
            if (isSuccess) {
                notifyService.success('保存成功');
            } else {
                const errorMessage = result?.error || '';
                if (errorMessage) {
                    messageBoxService.error(`保存失败`, errorMessage);
                } else {
                    notifyService.error(`保存失败`);
                }
            }
        }
        if (isSuccess) {
            syncObject(metadata, data);
        }
        return isSuccess;
    }

    function initVueFlowData(flowMetadata: FlowMetadata): void {
        const { nodes, edges } = convertFlowMetadata2VueFlowData(flowMetadata);
        setNodes(nodes);
        setEdges(edges);
    }

    const INIT_FLAG_FIELD = '__initialized__';

    function isFlowMetadataInitialized(metadata: FlowMetadata): boolean {
        if (metadata.nodes && metadata.nodes.length) {
            return true;
        }
        if (metadata.edges && metadata.edges.length) {
            return true;
        }
        return metadata.extension[INIT_FLAG_FIELD] === true;
    }

    function markFlowMetadataInitialized(metadata: FlowMetadata): void {
        metadata.extension[INIT_FLAG_FIELD] = true;
    }

    function initializeFlowMetadata(metadata: FlowMetadata): void {
        if (isFlowMetadataInitialized(metadata)) {
            markFlowMetadataInitialized(metadata);
            return;
        }
        markFlowMetadataInitialized(metadata);
        let initialData = flowRegistry.value?.initialData;
        if (typeof initialData !== 'function') {
            initialData = initializeFlowDataByDefault;
        }
        const data = initialData();
        if (data) {
            metadata.nodes = data.nodes || metadata.nodes || [];
            metadata.edges = data.edges || metadata.edges || [];
            Object.assign(metadata.extension, data.extension);
        }
    }

    async function handleDesignerOpen(): Promise<void> {
        const onDesignerOpen = flowRegistry.value?.onDesignerOpen;
        if (typeof onDesignerOpen !== 'function') {
            return;
        }
        const result = onDesignerOpen(metadata);
        if (!result || !result.then) {
            return;
        }
        await result;
    }

    const metadataId = getFlowMetadataId();

    loadFlowMetadata(metadataId).then((newMetadata) => {
        Object.assign(metadata, newMetadata);
        initFlowContent(flowType.value, metadata).then(async (success) => {
            if (!success) {
                notifyService.error('加载流程扩展信息失败');
                throw new Error('Failed to load flow content');
            }
            initializeFlowMetadata(metadata);
            initVueFlowData(metadata);
            await loadAllTypes(metadata);
            await handleDesignerOpen();
            isLoaded.value = true;
        });
    });

    onPaneReady((instance) => {
        instance.fitView({
            padding: 0.2,
            includeHiddenNodes: true,
            duration: 0,
        }).finally(() => {
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

const MOCK_FLOW_METADATA: FlowMetadata = {
    id: 'example',
    kind: 'workflow',
    code: 'example',
    name: 'example',
    description: '',
    version: '',
    nodes: [],
    edges: [],
    extension: {},
};

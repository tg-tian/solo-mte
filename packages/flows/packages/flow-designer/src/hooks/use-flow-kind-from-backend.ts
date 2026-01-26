import { ref } from 'vue';
import {
    type FlowRegistry,
    type FlowMetadata,
    type FlowNode,
    type FlowInitialData,
    type NodeGraphMeta,
    type NodeData,
    uuid,
    nodeRegistry,
    registerNodes,
    registerCustomComponents,
    useNotify,
    BuiltinNodeType,
} from '@farris/flow-devkit';
import { BUILTIN_NODES } from '@flow-designer/components/builtin-nodes';
import { FlowKindApi } from '@flow-designer/api';
import type {
    FlowKindInfo,
    FlowNodeGroupInfo,
    FlowNodeInfo,
    NodePanelCategory,
    NodePanelItem,
} from '@flow-designer/types';
import { useCanvasMask } from './use-canvas-mask';
import type { FlowDesignerProps } from '@flow-designer/components/flow-designer';
import type { UseFlowKind } from './types';
import { useEdgeTypes } from './use-edge-types';
import { useDeviceNodes } from './use-device-nodes';

declare const System: any;

export function useFlowKindFromBackend(flowDesignerProps?: FlowDesignerProps): UseFlowKind {
    const mockFlowRegistry = flowDesignerProps?.flowRegistry;

    /** 所有的节点注册信息 */
    const allFlowNodes = ref<FlowNodeInfo[]>([]);
    /** 当前流程的注册信息 */
    const currentFlowKindInfo = ref<FlowKindInfo>();
    /** 当前流程的节点分组注册信息 */
    const currentFlowNodeGroups = ref<FlowNodeGroupInfo[]>([]);
    /** 包含所有节点的节点分组注册信息 */
    const allFlowNodeGroups = ref<FlowNodeGroupInfo[]>([]);

    /** 当前流程节点的分组 */
    const currentNodeCategories = ref<NodePanelCategory[]>([]);
    /** 全部节点的分组 */
    const allNodeCategories = ref<NodePanelCategory[]>([]);

    /** 当前流程的扩展内容 */
    const flowRegistry = ref<FlowRegistry>();

    /** 已加载的扩展脚本 */
    const loadedJsUrls = new Set<string>();

    const canvasMask = useCanvasMask();
    const notifyService = useNotify();
    const { registerCustomEdges } = useEdgeTypes();
    const { registerDeviceNodes } = useDeviceNodes();

    function getNodeCategories() {
        return currentNodeCategories;
    }

    function getAllNodeCategories() {
        return allNodeCategories;
    }

    async function getFlowKindInfo(flowType: string): Promise<FlowKindInfo> {
        const result = await FlowKindApi.getFlowKindList();
        const flowKindList = result.data || [];
        const flowKindInfo = flowKindList.find(item => item.id === flowType);
        if (!flowKindInfo) {
            throw new Error('流程分类不存在');
        }
        return flowKindInfo;
    }

    function removeDuplicates<T>(values: T[]): T[] {
        const valueSet = new Set<T>();
        const result: T[] = [];
        values.forEach((value) => {
            if (!valueSet.has(value) && value) {
                valueSet.add(value);
                result.push(value);
            }
        });
        return result;
    }

    async function getFlowContent(jsUrls: string[]): Promise<(FlowRegistry | undefined)[]> {
        const allPromises: Promise<FlowRegistry>[] = [];
        jsUrls.forEach(url => {
            const newPromise = System.import(`${url}?v=${new Date().getTime()}`).then((flowExtension: any) => {
                return flowExtension.FLOW_REGISTRY as FlowRegistry;
            }).catch((error: any) => {
                console.error(error);
                return undefined;
            });
            allPromises.push(newPromise);
        });
        if (!allPromises.length) {
            return [];
        }
        return Promise.all(allPromises);
    }

    function registerFlowContent(flowContent: FlowRegistry): void {
        const nodes = flowContent.nodes || [];
        const componentRegistries = flowContent.componentRegistries || [];
        nodes.forEach(node => {
            const nodeRegistryInfo = allFlowNodes.value.find(nodeInfo => nodeInfo.id === node.metadata.type);
            if (!nodeRegistryInfo) {
                return;
            }
            // 优先使用数据库中注册的信息
            node.metadata.label = nodeRegistryInfo.name || node.metadata.label;
            node.metadata.icon = nodeRegistryInfo.iconUrl || node.metadata.icon;
            node.metadata.description = nodeRegistryInfo.note || node.metadata.description;
        });
        registerNodes(nodes);
        registerCustomEdges(flowContent.edges);
        registerCustomComponents(componentRegistries);
    }

    async function loadFlowContent(jsUrls: string | string[]): Promise<FlowRegistry[]> {
        if (!Array.isArray(jsUrls)) {
            jsUrls = [jsUrls];
        }
        jsUrls = removeDuplicates(jsUrls);
        jsUrls = jsUrls.filter(url => !loadedJsUrls.has(url));
        const flowContents = await getFlowContent(jsUrls);
        for (let i = 0; i < flowContents.length; i++) {
            const flowContent = flowContents[i];
            if (flowContent) {
                loadedJsUrls.add(jsUrls[i]);
                registerFlowContent(flowContent);
            }
        }
        return flowContents.filter(item => !!item);
    }

    function generateEmptyFlowRegistry(flowInfo: FlowKindInfo): FlowRegistry {
        return {
            name: flowInfo.name || flowInfo.code || flowInfo.id,
            description: flowInfo.note,
            nodes: [],
        };
    }

    async function loadAllRegistryInfo(flowType: string): Promise<boolean> {
        const result = await Promise.all([
            getFlowKindInfo(flowType),
            FlowKindApi.getFlowNodeGroups(flowType).then(result => result.data || []),
            FlowKindApi.getAllFlowNodes().then(result => result.data || []),
            FlowKindApi.getAllFlowNodeGroups().then(result => result.data || []),
        ]).catch((error) => {
            console.error(error);
            return undefined;
        });
        if (!result) {
            return false;
        }
        currentFlowKindInfo.value = result[0];
        currentFlowNodeGroups.value = result[1];
        allFlowNodes.value = result[2];
        allFlowNodeGroups.value = result[3];
        const currentFlowJsUrl = currentFlowKindInfo.value.jsUrl;  // 流程分类的`jsUrl`允许为空
        const flowKindInfo = currentFlowKindInfo.value;
        if (currentFlowJsUrl) {
            const flowContents = await loadFlowContent(currentFlowJsUrl);
            const currentFlowContent = flowContents[0];
            if (!currentFlowContent) {
                return false;
            }
            currentFlowContent.name = flowKindInfo.name || currentFlowContent.name;
            currentFlowContent.description = flowKindInfo.note || currentFlowContent.description;
            flowRegistry.value = currentFlowContent;
        } else {
            flowRegistry.value = generateEmptyFlowRegistry(flowKindInfo);
        }
        return true;
    }

    function collectAllJsUrls(flowMetadata: FlowMetadata): string[] {
        const resultSet = new Set<string>();
        currentFlowNodeGroups.value.forEach(nodeGroup => {
            nodeGroup.nodes?.forEach(node => {
                if (node.jsUrl) {
                    resultSet.add(node.jsUrl);
                }
            });
        });
        function handleFlowNode(node: FlowNode): void {
            const nodeRegistryInfo = allFlowNodes.value.find(nodeInfo => nodeInfo.id === node.kind);
            if (nodeRegistryInfo?.jsUrl) {
                resultSet.add(nodeRegistryInfo.jsUrl);
            }
        }
        function traverseNodes(nodes: FlowNode[]): void {
            (nodes || []).forEach(node => {
                if (!node || !node.kind || !node.code) {
                    return;
                }
                handleFlowNode(node);
                if (Array.isArray(node.nodes) && node.nodes.length) {
                    traverseNodes(node.nodes);
                }
            });
        }
        traverseNodes(flowMetadata.nodes);
        return Array.from(resultSet);
    }

    async function loadOtherFlowContents(flowMetadata: FlowMetadata) {
        const jsUrls = collectAllJsUrls(flowMetadata);
        await loadFlowContent(jsUrls);
    }

    function updateNodeCategoriesByMockFlowRegistry(mockRegistry: FlowRegistry): void {
        if (!mockRegistry.nodeCategories) {
            mockRegistry.nodeCategories = [{
                id: 'all',
                label: '全部节点',
                nodeTypes: mockRegistry.nodes.map((node) => node.metadata.type),
            }];
        }
        const nodePanelCategories: NodePanelCategory[] = mockRegistry.nodeCategories.map((nodeCategory) => {
            const nodeTypes = nodeCategory.nodeTypes;
            const nodes: NodePanelItem[] = nodeTypes.map((nodeType) => {
                const nodeMeta = nodeRegistry.getNodeMetadata(nodeType);
                if (!nodeMeta) {
                    return;
                }
                return {
                    type: nodeMeta.type,
                    label: nodeMeta.label,
                    icon: nodeMeta.icon,
                    description: nodeMeta.description,
                };
            }).filter(node => !!node);
            return {
                id: nodeCategory.id || uuid(),
                label: nodeCategory.label,
                nodes,
            };
        });
        currentNodeCategories.value = nodePanelCategories;
        allNodeCategories.value = nodePanelCategories;
    }

    function handleMockFlowRegistry(mockRegistry: FlowRegistry): void {
        flowRegistry.value = mockRegistry;
        registerFlowContent(flowRegistry.value);
        updateNodeCategoriesByMockFlowRegistry(flowRegistry.value);
    }

    function generateNodePanelCategories(nodeGroups: FlowNodeGroupInfo[]): NodePanelCategory[] {
        return nodeGroups.map(group => {
            const nodes: NodePanelItem[] = group.nodes.map(node => {
                if (node.displayInToolBar === false) {
                    return;
                }
                const nodeType = node.id;
                const nodeMeta = nodeRegistry.getNodeMetadata(nodeType);
                return {
                    type: nodeType,
                    label: nodeMeta?.label || node.name,
                    icon: nodeMeta?.icon || node.iconUrl,
                    description: nodeMeta?.description || node.note,
                    raw: node,
                };
            }).filter(item => !!item);
            return {
                id: group.id || uuid(),
                label: group.name || group.code,
                nodes,
            };
        });
    }

    function updateNodeCategories(): void {
        currentNodeCategories.value = generateNodePanelCategories(currentFlowNodeGroups.value);
        allNodeCategories.value = generateNodePanelCategories(allFlowNodeGroups.value);
    }

    function appendNodePanelCategories(categories: NodePanelCategory[]): void {
        currentNodeCategories.value.push(...categories);
    }

    async function initFlowContent(flowType: string, flowMetadata: FlowMetadata): Promise<boolean> {
        registerNodes(BUILTIN_NODES);
        if (mockFlowRegistry) {
            handleMockFlowRegistry(mockFlowRegistry);
            const newNodePanelCategories = await registerDeviceNodes();
            appendNodePanelCategories(newNodePanelCategories);
            return true;
        }
        const isRegistryInfoLoaded = await loadAllRegistryInfo(flowType);
        if (!isRegistryInfoLoaded) {
            return false;
        }
        await loadOtherFlowContents(flowMetadata);
        updateNodeCategories();
        const newNodePanelCategories = await registerDeviceNodes();
        appendNodePanelCategories(newNodePanelCategories);
        return true;
    }

    async function loadNodeByType(nodeType: string): Promise<boolean> {
        if (nodeRegistry.get(nodeType)) {
            return true;
        }
        const nodeRegistryInfo = allFlowNodes.value.find(nodeInfo => {
            return nodeInfo.id === nodeType;
        });
        const jsUrl = nodeRegistryInfo?.jsUrl;
        const errorTip = `节点信息加载失败`;
        if (!jsUrl || loadedJsUrls.has(jsUrl)) {
            notifyService.error(errorTip);
            return false;
        }
        canvasMask.show();
        await loadFlowContent(jsUrl);
        canvasMask.hide();
        if (nodeRegistry.get(nodeType)) {
            return true;
        }
        notifyService.error(errorTip);
        return false;
    }

    function findStartNodeType(): string {
        let startNodeType: string = '';
        for (const group of currentFlowNodeGroups.value) {
            for (const node of group.nodes) {
                const nodeMeta = nodeRegistry.getNodeMetadata(node.id);
                if (nodeMeta?.isStartNode) {
                    startNodeType = node.id;
                    break;
                }
            }
            if (startNodeType) {
                break;
            }
        }
        if (!startNodeType) {
            startNodeType = BuiltinNodeType.Start;
        }
        return startNodeType;
    }

    function findEndNodeType(): string {
        let endNodeType: string = '';
        for (const group of currentFlowNodeGroups.value) {
            for (const node of group.nodes) {
                const nodeMeta = nodeRegistry.getNodeMetadata(node.id);
                if (nodeMeta?.isEndNode) {
                    endNodeType = node.id;
                    break;
                }
            }
            if (endNodeType) {
                break;
            }
        }
        if (!endNodeType) {
            endNodeType = BuiltinNodeType.End;
        }
        return endNodeType;
    }

    function initFlowNodeByType(nodeType: string, graphMeta: NodeGraphMeta): FlowNode {
        const nodeDef = nodeRegistry.get(nodeType)!;
        const nodeMeta = nodeDef.metadata;
        const initialData = nodeDef.initialData;
        let data: Partial<NodeData> = {};
        if (typeof initialData === 'function') {
            data = initialData();
        }
        return {
            ...data,
            id: nodeType,
            kind: nodeType,
            code: nodeType,
            name: nodeMeta.label || nodeType,
            description: nodeMeta.description || '',
            inputParams: data.inputParams || [],
            outputParams: data.outputParams || [],
            inputPorts: [],
            outputPorts: [],
            graphMeta,
        };
    }

    function initializeFlowDataByDefault(): FlowInitialData {
        const startNodeType = findStartNodeType();
        const endNodeType = findEndNodeType();
        const startNode = initFlowNodeByType(startNodeType, {
            position: { x: 0, y: 0 },
        });
        const endNode = initFlowNodeByType(endNodeType, {
            position: { x: 1000, y: 0 },
        });
        return {
            nodes: [startNode, endNode],
        };
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

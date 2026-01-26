import type {
    FlowMetadata,
    FlowNode,
    FlowEdge,
    NodeData,
    Parameter,
    NodeVariableExpr,
    EdgeGraphMeta,
    JsonSchema,
} from '@farris/flow-devkit';
import {
    uuid,
    nodeRegistry,
    JsonSchemaUtils,
    NODE_OUTPUT_PARAMS_KEY,
    NODE_OUTPUT_PARAMS_FOR_CHILD_NODES_KEY,
    NODE_VALIDATION_DETAILS_KEY,
    NODE_VARIABLES_KEY,
    WRITABLE_NODE_VARIABLES_KEY,
} from '@farris/flow-devkit';
import type { Node, Edge, GraphNode, GraphEdge } from '@vue-flow/core';
import { NodeUtils } from '@flow-designer/hooks';

interface VueFlowData {
    nodes: Node[];
    edges: Edge[];
}

export function useVueFlowDataConverter() {

    /**
     * 判断是否为节点变量引用表达式
     * @param value 值
     */
    function isNodeVariableExpr(value: any): value is NodeVariableExpr {
        return !!value &&
            typeof value === 'object' &&
            'kind' in value &&
            value.kind === 'nodeVariable' &&
            'nodeCode' in value &&
            typeof value.nodeCode === 'string' &&
            value.nodeCode.trim() !== '' &&
            'variable' in value &&
            typeof value.variable === 'string' &&
            value.variable.trim() !== '';
    }

    /**
     * 处理节点数据中所有的节点变量引用表达式
     * @param data    节点数据
     * @param handler 对节点变量引用表达式的回调方法
     */
    function processAllNodeVariableExpr(
        data: Record<string, any>,
        handler: (valueExpr: NodeVariableExpr) => void,
    ): void {
        const processed = new Set<object>();
        function recurse(value: any) {
            if (value === null || typeof value !== 'object') {
                return;
            }
            if (processed.has(value)) {
                return;
            }
            processed.add(value);
            if (Array.isArray(value)) {
                value.forEach(recurse);
                return;
            }
            if (isNodeVariableExpr(value)) {
                handler(value);
            }
            Object.values(value).forEach(recurse);
        }
        recurse(data);
    }

    function ensureJsonSchemaHaveId(schema?: JsonSchema): void {
        if (!schema) {
            return;
        }
        if (!schema.id) {
            schema.id = uuid();
        }
        if (schema.items) {
            ensureJsonSchemaHaveId(schema.items);
        }
        if (Array.isArray(schema.properties)) {
            schema.properties.forEach(property => ensureJsonSchemaHaveId(property));
        }
    }

    /**
     * 保证参数具有唯一ID
     * @description 后端仅存储参数的编号，不存储id，由于编号可编辑不方便作为标识，所以前端额外维护id字段
     * @param params 参数列表
     */
    function ensureAllParamsHaveIds(params: Parameter[]): void {
        params.forEach(param => {
            if (!param.id) {
                param.id = uuid();
            }
            ensureJsonSchemaHaveId(param.schema);
        });
    }

    function getNodeCode2ParamCode2Param(nodes: Node[], useParamId?: boolean): Map<string, Map<string, Parameter>> {
        const resultMap = new Map<string, Map<string, Parameter>>();
        nodes.forEach(node => {
            const nodeData = node.data as NodeData;
            const nodeCode = nodeData.code;
            if (!nodeCode) {
                return;
            }
            const paramCode2Param = new Map<string, Parameter>();
            const outputParams = NodeUtils.getAllOutputParams(node);
            ensureAllParamsHaveIds(outputParams);
            outputParams.forEach(param => {
                const paramCode = useParamId ? param.id : param.code;
                if (!paramCode) {
                    return;
                }
                paramCode2Param.set(paramCode, param);
            });
            resultMap.set(nodeCode, paramCode2Param);
        });
        return resultMap;
    }

    function syncParamId(valueExpr: NodeVariableExpr, param?: Parameter): void {
        if (!valueExpr || !param) {
            return;
        }
        valueExpr.variableId = param.id;
        if (valueExpr.fields && valueExpr.fields.length) {
            valueExpr.fieldIds = JsonSchemaUtils.getIdPathByCodePath(param.schema, valueExpr.fields);
            if (!valueExpr.fieldIds.length) {
                valueExpr.fieldIds = undefined;
            }
        } else {
            valueExpr.fieldIds = undefined;
        }
    }

    function syncParamCodeById(valueExpr: NodeVariableExpr, param?: Parameter): void {
        if (!valueExpr || !param) {
            return;
        }
        valueExpr.variable = param.code || '';
        if (valueExpr.fieldIds && valueExpr.fieldIds.length) {
            const codes = JsonSchemaUtils.getCodePathByIdPath(param.schema, valueExpr.fieldIds);
            if (codes.length) {
                valueExpr.fields = codes;
            }
        }
    }

    function validAllNodeParams(nodes: Node[]): void {
        nodes.forEach(node => {
            const nodeData: NodeData = node.data;
            ensureAllParamsHaveIds(nodeData.inputParams);
            ensureAllParamsHaveIds(nodeData.outputParams);
        });
        const nodeCode2ParamCode2Param = getNodeCode2ParamCode2Param(nodes);
        const handleNodeVariableExpr = (valueExpr: NodeVariableExpr): void => {
            const paramCode2Param = nodeCode2ParamCode2Param.get(valueExpr.nodeCode);
            if (!paramCode2Param) {
                return;
            }
            const param = paramCode2Param.get(valueExpr.variable);
            syncParamId(valueExpr, param);
        };
        nodes.forEach(node => {
            processAllNodeVariableExpr(node.data, handleNodeVariableExpr);
        });
    }

    function syncAllNodeVariableRef(nodes: Node[]): void {
        const nodeCode2ParamId2Param = getNodeCode2ParamCode2Param(nodes, true);
        const handleNodeVariableExpr = (valueExpr: NodeVariableExpr): void => {
            const paramId2Param = nodeCode2ParamId2Param.get(valueExpr.nodeCode);
            if (!paramId2Param || !valueExpr.variableId) {
                return;
            }
            const param = paramId2Param.get(valueExpr.variableId);
            syncParamCodeById(valueExpr, param);
        };
        nodes.forEach(node => {
            processAllNodeVariableExpr(node.data, handleNodeVariableExpr);
        });
    }

    function convertFlowNode2VueFlowNode(node: FlowNode): Node | undefined {
        if (!node || !node.id || !node.kind || !node.code) {
            return;
        }

        const nodeData = { ...node } as NodeData;
        delete nodeData.graphMeta;
        delete nodeData.nodes;
        delete nodeData.edges;
        const graphMeta = node.graphMeta;
        nodeData.name = nodeData.name || '';
        nodeData.description = nodeData.description || '';
        nodeData.inputParams = nodeData.inputParams || [];
        nodeData.outputParams = nodeData.outputParams || [];
        nodeData.inputPorts = nodeData.inputPorts || [];
        nodeData.outputPorts = nodeData.outputPorts || [];
        nodeData.subFlowCanvasSize = graphMeta?.subFlowCanvasSize;
        Object.defineProperty(nodeData, 'id', {
            value: node.id,
            writable: false,
            enumerable: true,
            configurable: false,
        });
        Object.defineProperty(nodeData, 'code', {
            value: node.code,
            writable: false,
            enumerable: true,
            configurable: false,
        });
        Object.defineProperty(nodeData, 'kind', {
            value: node.kind,
            writable: false,
            enumerable: true,
            configurable: false,
        });
        const nodeMeta = nodeRegistry.getNodeMetadata(node.kind);

        return {
            id: node.id,
            type: node.kind,
            position: graphMeta?.position,
            deletable: typeof graphMeta?.deletable === 'boolean' ? graphMeta.deletable : nodeMeta?.deletable,
            draggable: typeof graphMeta?.draggable === 'boolean' ? graphMeta.draggable : nodeMeta?.draggable,
            selectable: typeof graphMeta?.selectable === 'boolean' ? graphMeta.selectable : nodeMeta?.selectable,
            connectable: nodeMeta?.connectable,
            data: nodeData,
        };
    }

    function convertVueFlowNode2FlowNode(node: GraphNode): FlowNode | undefined {
        if (!node || !node.id || !node.type || !node.data) {
            return;
        }
        const nodeData: NodeData = { ...node.data };
        const subFlowCanvasSize = nodeData.subFlowCanvasSize;
        const isContainerNode = nodeRegistry.isContainerNode(node.type);

        delete nodeData.subFlowCanvasSize;
        delete nodeData[NODE_OUTPUT_PARAMS_KEY];
        delete nodeData[NODE_OUTPUT_PARAMS_FOR_CHILD_NODES_KEY];
        delete nodeData[NODE_VALIDATION_DETAILS_KEY];
        delete nodeData[NODE_VARIABLES_KEY];
        delete nodeData[WRITABLE_NODE_VARIABLES_KEY];

        const flowNode: FlowNode = {
            ...nodeData,
            id: node.id,
            kind: node.type,
            code: nodeData.code || '',
            name: nodeData.name || '',
            description: nodeData.description || '',
            inputParams: nodeData.inputParams || [],
            outputParams: nodeData.outputParams || [],
            inputPorts: nodeData.inputPorts || [],
            outputPorts: nodeData.outputPorts || [],
            graphMeta: {
                position: node.position,
                subFlowCanvasSize,
                deletable: typeof node.deletable === 'boolean' ? node.deletable : undefined,
                draggable: typeof node.draggable === 'boolean' ? node.draggable : undefined,
                selectable: typeof node.selectable === 'boolean' ? node.selectable : undefined,
            },
        };
        if (isContainerNode) {
            flowNode.nodes = [];
            flowNode.edges = [];
        }
        return flowNode;
    }

    function convertFlowEdge2VueFlowEdge(edge: FlowEdge): Edge | undefined {
        if (!edge || !edge.sourceNodeId || !edge.targetNodeId) {
            return;
        }
        const graphMeta = edge.graphMeta;
        return {
            id: uuid(),
            type: typeof graphMeta?.type === 'string' ? graphMeta.type : 'common',
            source: edge.sourceNodeId,
            target: edge.targetNodeId,
            sourceHandle: edge.sourcePort,
            targetHandle: edge.targetPort,
            data: graphMeta?.data ?? {},
            deletable: typeof graphMeta?.deletable === 'boolean' ? graphMeta.deletable : undefined,
            selectable: typeof graphMeta?.selectable === 'boolean' ? graphMeta.selectable : undefined,
            animated: typeof graphMeta?.animated === 'boolean' ? graphMeta.animated : undefined,
            style: graphMeta?.style ?? {},
        };
    }

    function convertVueFlowEdge2FlowEdge(edge: GraphEdge): FlowEdge | undefined {
        if (!edge || !edge.source || !edge.target) {
            return;
        }
        const graphMeta: EdgeGraphMeta = {
            type: edge.type,
            data: edge.data,
            deletable: edge.deletable,
            selectable: edge.selectable,
            animated: edge.animated,
            style: typeof edge.style === 'object' ? edge.style : undefined,
        };
        return {
            sourceNodeId: edge.source,
            targetNodeId: edge.target,
            sourcePort: edge.sourceHandle || '',
            targetPort: edge.targetHandle || '',
            graphMeta,
        };
    }

    /**
     * 处理流程元数据的扩展信息对象
     * @description 将流程的编号、名称、描述字段添加到`extension`对象中，统一通过属性面板进行编辑
     * @param metadata 流程元数据
     */
    function handleFlowExtension(metadata: FlowMetadata): void {
        const extension = metadata.extension;
        extension.id = metadata.id;
        extension.code = metadata.code;
        extension.name = metadata.name;
        extension.description = metadata.description;
    }

    function convertFlowMetadata2VueFlowData(metadata: FlowMetadata): VueFlowData {
        const allNodes: Node[] = [];
        const allEdges: Edge[] = [];

        function collectNodesAndEdges(nodes: FlowNode[], edges: FlowEdge[], parentNodeId?: string) {
            const vueFlowEdges = edges.map(edge => convertFlowEdge2VueFlowEdge(edge)).filter(edge => !!edge);
            allEdges.push(...vueFlowEdges);

            nodes.forEach(node => {
                const vueFlowNode = convertFlowNode2VueFlowNode(node);
                if (!vueFlowNode) {
                    return;
                }
                if (parentNodeId) {
                    vueFlowNode.parentNode = parentNodeId;
                }
                allNodes.push(vueFlowNode);
                if (Array.isArray(node.nodes) && node.nodes.length) {
                    collectNodesAndEdges(node.nodes, node.edges || [], node.id);
                }
            });
        }

        collectNodesAndEdges(metadata.nodes || [], metadata.edges || []);
        validAllNodeParams(allNodes);
        handleFlowExtension(metadata);
        return {
            nodes: allNodes,
            edges: allEdges,
        };
    }

    function createNewFlowMetadata(nodes: FlowNode[], edges: FlowEdge[], oldMetadata: FlowMetadata): FlowMetadata {
        const newMetadata: FlowMetadata = { ...oldMetadata };
        newMetadata.nodes = nodes;
        newMetadata.edges = edges;

        const extension = { ...oldMetadata.extension };
        newMetadata.code = extension.code || newMetadata.code;
        newMetadata.name = extension.name || newMetadata.name;
        newMetadata.description = extension.description || newMetadata.description;
        delete extension.id;
        delete extension.code;
        delete extension.name;
        delete extension.description;
        newMetadata.extension = extension;

        return newMetadata;
    }

    function isRootNode(node: Node): boolean {
        return !node.parentNode;
    }

    function isValidEdge(edge: GraphEdge): boolean {
        const { sourceNode, targetNode } = edge;
        const sourceNodeParentId = sourceNode.parentNode;
        const targetNodeParentId = targetNode.parentNode;
        if (!sourceNodeParentId && !targetNodeParentId) {
            return true;
        }
        return sourceNodeParentId === targetNodeParentId;
    }

    function isRootEdge(edge: GraphEdge): boolean {
        const { sourceNode, targetNode } = edge;
        const sourceNodeParentId = sourceNode.parentNode;
        const targetNodeParentId = targetNode.parentNode;
        return !sourceNodeParentId && !targetNodeParentId;
    }

    function getEdgeParentNodeId(edge: GraphEdge): string {
        return edge.sourceNode.parentNode!;
    }

    function convertVueFlowData2FlowMetadata(
        nodes: GraphNode[],
        edges: GraphEdge[],
        oldMetadata: FlowMetadata,
    ): FlowMetadata {
        syncAllNodeVariableRef(nodes);
        const rootNodes: FlowNode[] = [];
        const rootEdges: FlowEdge[] = [];
        const nodeId2FlowNode = new Map<string, FlowNode>();
        nodes.forEach((node) => {
            const flowNode = convertVueFlowNode2FlowNode(node);
            if (!flowNode) {
                return;
            }
            nodeId2FlowNode.set(flowNode.id, flowNode);
            if (isRootNode(node)) {
                rootNodes.push(flowNode);
            }
        });
        nodes.forEach((node) => {
            if (isRootNode(node)) {
                return;
            }
            const subFlowNode = nodeId2FlowNode.get(node.id);
            const parentNodeId = node.parentNode!;
            const parentNode = nodeId2FlowNode.get(parentNodeId);
            if (subFlowNode && parentNode) {
                parentNode.nodes = parentNode.nodes || [];
                parentNode.nodes.push(subFlowNode);
            }
        });
        edges.forEach((edge) => {
            const flowEdge = convertVueFlowEdge2FlowEdge(edge);
            if (!isValidEdge(edge) || !flowEdge) {
                return;
            }
            if (isRootEdge(edge)) {
                rootEdges.push(flowEdge);
            } else {
                const parentNodeId = getEdgeParentNodeId(edge);
                const parentFlowNode = nodeId2FlowNode.get(parentNodeId);
                if (parentFlowNode) {
                    parentFlowNode.edges = parentFlowNode.edges || [];
                    parentFlowNode.edges.push(flowEdge);
                }
            }
        });
        return createNewFlowMetadata(rootNodes, rootEdges, oldMetadata);
    }

    return {
        convertFlowMetadata2VueFlowData,
        convertVueFlowData2FlowMetadata,
    };
}

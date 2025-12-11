import { provide, reactive, ref, computed } from 'vue';
import { useVueFlow, type EdgeChange, type NodeChange, type GraphNode, type GraphEdge } from '@vue-flow/core';
import {
    nodeRegistry,
    NODE_PREDECESSORS_KEY,
    NODE_PARENTIDS_KEY,
    NODE_OUTPUT_PARAMS_KEY,
    NODE_OUTPUT_PARAMS_FOR_CHILD_NODES_KEY,
    type FlowNodeInstance,
    type Parameter,
    type NodeData,
    type NodeDefinition,
} from '@farris/flow-devkit';

export function useNodePredecessors() {

    /** 节点ID到节点的所有前序节点的映射 */
    const nodePredecessorMap = reactive(new Map<string, FlowNodeInstance[]>());
    /** 节点ID到节点的所有祖先节点ID集合的映射 */
    const nodeParentIdsMap = new Map<string, Set<string>>();

    const {
        nodes: allNodes,
        edges: allEdges,
        onNodesChange,
        onEdgesChange,
    } = useVueFlow();

    const nodeId2Node = ref<Map<string, FlowNodeInstance>>(new Map());

    function updateNodeData(nodeData: NodeData, nodeDefinition: NodeDefinition): void {
        if (nodeData[NODE_OUTPUT_PARAMS_KEY] && nodeData[NODE_OUTPUT_PARAMS_FOR_CHILD_NODES_KEY]) {
            return;
        }
        const isStartNode = nodeDefinition.metadata.isStartNode;
        const getOutputParams = nodeDefinition.getOutputParams;
        const getOutputParamsForChildNodes = nodeDefinition.getOutputParamsForChildNodes;

        const outputParams = computed<Parameter[]>(() => {
            if (typeof getOutputParams === 'function') {
                return getOutputParams(nodeData);
            }
            if (isStartNode) {
                if (Array.isArray(nodeData.outputParams) && nodeData.outputParams.length) {
                    return nodeData.outputParams;
                }
                return nodeData.inputParams || [];
            }
            return nodeData.outputParams || [];
        });

        const outputParamsForChildNodes = computed<Parameter[]>(() => {
            if (typeof getOutputParamsForChildNodes === 'function') {
                return getOutputParamsForChildNodes(nodeData);
            }
            return outputParams.value;
        });

        nodeData[NODE_OUTPUT_PARAMS_KEY] = outputParams;
        nodeData[NODE_OUTPUT_PARAMS_FOR_CHILD_NODES_KEY] = outputParamsForChildNodes;
    }

    function updateNodeId2Node(): void {
        const nodeMap = new Map<string, FlowNodeInstance>();
        allNodes.value.forEach((node) => {
            const flowNodeInstance = node as any as FlowNodeInstance;
            const nodeDefinition = nodeRegistry.get(flowNodeInstance.type);
            if (!nodeDefinition) {
                return;
            }
            flowNodeInstance.metadata = nodeDefinition.metadata;
            updateNodeData(flowNodeInstance.data, nodeDefinition);
            nodeMap.set(node.id, flowNodeInstance);
        });
        nodeId2Node.value = nodeMap;
    }

    /**
     * 获取节点的所有祖先节点ID列表
     * @param nodeId 节点ID
     * @returns 节点的所有祖先节点ID列表
     */
    function getParentChain(nodeId: string): string[] {
        const parentChain: string[] = [];
        let currentNodeId = nodeId;

        while (true) {
            const currentNode = nodeId2Node.value.get(currentNodeId);
            if (!currentNode) {
                break;
            }
            const parentNodeId = currentNode.parentNode;
            if (!parentNodeId) {
                break;
            }
            if (parentChain.includes(parentNodeId)) {
                break;
            }

            parentChain.push(parentNodeId);
            currentNodeId = parentNodeId;
        }
        return parentChain;
    }

    function getPredecessors(nodes: GraphNode[], edges: GraphEdge[]): Map<string, string[]> {
        const reverseAdjacencyList = new Map<string, string[]>();
        nodes.forEach(node => reverseAdjacencyList.set(node.id, []));

        edges.forEach(edge => {
            if (reverseAdjacencyList.has(edge.target)) {
                reverseAdjacencyList.get(edge.target)!.push(edge.source);
            }
        });

        const sameLevelMap = new Map<string, string[]>();
        nodes.forEach(node => {
            const predecessors: string[] = [];
            const visited = new Set<string>();
            const queue: string[] = [];

            const directPredecessors = reverseAdjacencyList.get(node.id) || [];
            directPredecessors.forEach(predecessorId => {
                if (!visited.has(predecessorId)) {
                    visited.add(predecessorId);
                    queue.push(predecessorId);
                    predecessors.push(predecessorId);
                }
            });

            while (queue.length > 0) {
                const currentId = queue.shift()!;
                const currentPredecessors = reverseAdjacencyList.get(currentId) || [];
                currentPredecessors.forEach(predecessorId => {
                    if (!visited.has(predecessorId)) {
                        visited.add(predecessorId);
                        queue.push(predecessorId);
                        predecessors.push(predecessorId);
                    }
                });
            }
            sameLevelMap.set(node.id, predecessors);
        });

        nodeParentIdsMap.clear();
        const resultMap = new Map<string, string[]>();
        nodes.forEach(node => {
            const parentNodeIds = getParentChain(node.id);
            nodeParentIdsMap.set(node.id, new Set(parentNodeIds));
            if (parentNodeIds.length === 0) {
                resultMap.set(node.id, sameLevelMap.get(node.id) || []);
                return;
            }
            const predecessors: string[] = [...(sameLevelMap.get(node.id) || [])];
            parentNodeIds.forEach(parentNodeId => {
                predecessors.push(parentNodeId);
                predecessors.push(...(sameLevelMap.get(parentNodeId) || []));
            });
            resultMap.set(node.id, predecessors);
        });
        return resultMap;
    }

    function getNodesByIds(nodeIds: string[]): FlowNodeInstance[] {
        return nodeIds.map((nodeId) => nodeId2Node.value.get(nodeId)).filter(node => !!node);
    }

    function isSameNodes(nodeIds: string[], nodes: FlowNodeInstance[]): boolean {
        if (!nodes || nodeIds.length !== nodes.length) {
            return false;
        }
        for (let i = 0; i < nodeIds.length; i++) {
            if (nodeIds[i] !== nodes[i].id) {
                return false;
            }
        }
        return true;
    }

    function rebuildNodePredecessorMap(): void {
        updateNodeId2Node();
        const newMap = getPredecessors(allNodes.value, allEdges.value);
        for (const nodeId of nodePredecessorMap.keys()) {
            if (!newMap.has(nodeId)) {
                nodePredecessorMap.delete(nodeId);
            }
        }
        for (const nodeId of newMap.keys()) {
            const predecessorNodeIds = newMap.get(nodeId)!;
            if (nodePredecessorMap.has(nodeId)) {
                const nodes = nodePredecessorMap.get(nodeId)!;
                if (!isSameNodes(predecessorNodeIds, nodes)) {
                    nodePredecessorMap.set(nodeId, getNodesByIds(predecessorNodeIds));
                }
            } else {
                nodePredecessorMap.set(nodeId, getNodesByIds(predecessorNodeIds));
            }
        }
    }

    function shouldRebuildMap(changes: NodeChange[] | EdgeChange[]): boolean {
        for (const change of changes) {
            if (change.type === 'add' || change.type === 'remove') {
                return true;
            }
        }
        return false;
    }

    function onChange(changes: NodeChange[] | EdgeChange[]): void {
        if (shouldRebuildMap(changes)) {
            rebuildNodePredecessorMap();
        }
    }

    onNodesChange(onChange);
    onEdgesChange(onChange);

    provide(NODE_PREDECESSORS_KEY, nodePredecessorMap);
    provide(NODE_PARENTIDS_KEY, nodeParentIdsMap);

    return {
        rebuildNodePredecessorMap,
    };
}

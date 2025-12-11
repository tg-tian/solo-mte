import { type Ref } from 'vue';
import type { FlowNodeInstance } from '../types';
import { useVueFlow } from '@vue-flow/core';
import { nodeRegistry } from '@farris/flow-devkit/composition';

/**
 * 流程数据操作
 */
export interface UseFlow {
    /**
     * 更新节点数据
     * @param nodeId 节点ID
     * @param data   节点数据，将与旧数据对象合并
     */
    updateNodeData(nodeId: string, data: Record<string, any>): void;

    /**
     * 移除节点
     * @param nodeId 节点ID
     */
    removeNode(nodeId: string): void;

    /**
     * 根据节点编号获取节点实例
     * @param nodeCode 节点编号
     */
    getNodeByCode(nodeCode: string): FlowNodeInstance | undefined;

    /**
     * 获取所有节点
     */
    getAllNodes(): Ref<FlowNodeInstance[]>;

    /**
     * 移除连接点上的所有连接线
     * @param nodeId 节点ID
     * @param portId 连接点ID
     */
    removeAttachedEdgesByPortId(nodeId: string, portId: string): void;
}

export function useFlow(): UseFlow {

    const {
        updateNodeData: _updateNodeData,
        removeNodes,
        getConnectedEdges,
        removeEdges,
        nodes: allNodes,
    } = useVueFlow();

    function updateNodeData(nodeId: string, data: Record<string, any>): void {
        if (typeof data !== 'object' || !data) {
            return;
        }
        _updateNodeData(nodeId, data);
    }

    function removeNode(nodeId: string): void {
        removeNodes(nodeId);
    }

    function getNodeByCode(nodeCode: string): FlowNodeInstance | undefined {
        if (!nodeCode) {
            return;
        }
        const targetNode = allNodes.value.find(node => node.data.code === nodeCode);
        if (!targetNode) {
            return;
        }
        const nodeDef = nodeRegistry.get(targetNode.type);
        (targetNode as any).metadata = nodeDef?.metadata;
        return targetNode as any as FlowNodeInstance;
    }

    function getAllNodes() {
        allNodes.value.forEach(node => {
            const flowNode = node as any as FlowNodeInstance;
            if (!flowNode.metadata) {
                const nodeDef = nodeRegistry.get(flowNode.type);
                if (nodeDef) {
                    flowNode.metadata = nodeDef.metadata;
                }
            }
        });
        return allNodes as Ref<any[]> as Ref<FlowNodeInstance[]>;
    }

    function removeAttachedEdgesByPortId(nodeId: string, portId: string): void {
        const allConnectedEdges = getConnectedEdges(nodeId);
        const attachedEdges = allConnectedEdges.filter((edge) => {
            return (
                (edge.source === nodeId && edge.sourceHandle === portId) ||
                (edge.target === nodeId && edge.targetHandle === portId)
            );
        });
        removeEdges(attachedEdges);
    }

    return {
        updateNodeData,
        removeNode,
        getNodeByCode,
        getAllNodes,
        removeAttachedEdgesByPortId,
    };
}

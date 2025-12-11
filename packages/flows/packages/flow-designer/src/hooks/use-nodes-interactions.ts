import {
    useVueFlow,
    type GraphNode,
    type NodeChange,
    type EdgeChange,
    type EdgeAddChange,
    type EdgeRemoveChange,
} from "@vue-flow/core";
import { ref, nextTick } from "vue";
import { usePosition } from './use-position';
import { getHelperLines } from './helper-line.utils';
import { nodeRegistry, type FlowNodeInstance } from '@farris/flow-devkit';

export function useNodesInteractions() {

    const {
        onNodeDrag,
        onNodeDragStop,
        onNodesChange,
        onEdgesChange,
        applyNodeChanges,
        applyEdgeChanges,
        removeNodes,
        onConnect,
        addEdges,
        getConnectedEdges,
        getIncomers,
        getOutgoers,
        nodes: allNodes,
    } = useVueFlow();
    const { repositionContainerNode, throttleRepositionContainerNode } = usePosition();

    const helperLineHorizontal = ref<number | undefined>(undefined);
    const helperLineVertical = ref<number | undefined>(undefined);

    function handleNodeDrag(node: GraphNode, useThrottle: boolean): void {
        const parentNodeId = node.parentNode;
        if (parentNodeId) {
            if (useThrottle) {
                throttleRepositionContainerNode(parentNodeId);
            } else {
                repositionContainerNode(parentNodeId);
            }
        }
    }

    onNodeDrag((event) => {
        nextTick(() => {
            handleNodeDrag(event.node, true);
        });
    });

    onNodeDragStop((event) => {
        handleNodeDrag(event.node, false);
    });

    function removeChildNodes(nodeId: string): void {
        const childNodeIds: string[] = allNodes.value.filter(
            node => node.parentNode === nodeId
        ).map(node => node.id);
        removeNodes(childNodeIds);
    }

    function updateHelperLines(changes: NodeChange[], nodes: GraphNode[]): NodeChange[] {
        helperLineHorizontal.value = undefined;
        helperLineVertical.value = undefined;

        if (changes.length === 1 && changes[0].type === 'position' && changes[0].dragging && changes[0].position) {
            const helperLines = getHelperLines(changes[0], nodes);
            changes[0].position.x = helperLines.snapPosition.x ?? changes[0].position.x;
            changes[0].position.y = helperLines.snapPosition.y ?? changes[0].position.y;
            helperLineHorizontal.value = helperLines.horizontal;
            helperLineVertical.value = helperLines.vertical;
        }
        return changes;
    }

    function isNotContainerNode(nodeId: string): boolean {
        const nodeType = allNodes.value.find(node => node.id === nodeId)?.type ?? '';
        return !nodeRegistry.isContainerNode(nodeType);
    }

    function getParentNodeId(nodeId: string): string | undefined {
        const node = allNodes.value.find(node => node.id === nodeId);
        return node?.parentNode;
    }

    onNodesChange((changes) => {
        const nextChanges: NodeChange[] = [];
        const pendingDeleteNodeIds: string[] = [];
        const parentNodeIds: string[] = [];
        for (const change of changes) {
            if (change.type === 'remove') {
                pendingDeleteNodeIds.push(change.id);
            } else if (change.type === 'dimensions' && isNotContainerNode(change.id)) {
                const parentNodeId = getParentNodeId(change.id);
                parentNodeId && parentNodeIds.push(parentNodeId);
            }
            nextChanges.push(change);
        }
        pendingDeleteNodeIds.forEach((targetNodeId) => {
            const parentNodeId = getParentNodeId(targetNodeId);
            parentNodeId && parentNodeIds.push(parentNodeId);
        });
        pendingDeleteNodeIds.forEach((targetNodeId) => {
            removeChildNodes(targetNodeId);
        });
        const modifiedChanges = updateHelperLines(nextChanges, allNodes.value);
        applyNodeChanges(modifiedChanges);
        nextTick(() => {
            parentNodeIds.forEach((parentNodeId) => {
                repositionContainerNode(parentNodeId);
            });
        });
    });

    function isEdgeAddChange(change: EdgeChange): change is EdgeAddChange {
        return change.type === 'add';
    }

    function isEdgeRemoveChange(change: EdgeChange): change is EdgeRemoveChange {
        return change.type === 'remove';
    }

    function triggerAfterEdgeAddOrRemoveCallback(nodeId: string): void {
        const targetNode = allNodes.value.find(node => node.id === nodeId);
        if (!targetNode) {
            return;
        }
        const nodeType = targetNode.type;
        const nodeDef = nodeRegistry.get(nodeType);
        if (typeof nodeDef?.afterEdgeAddOrRemove !== 'function') {
            return;
        }
        const incomingNodes = getIncomers(nodeId) as any[] as FlowNodeInstance[];
        const outgoingNodes = getOutgoers(nodeId) as any[] as FlowNodeInstance[];
        const connectedNodes = [...incomingNodes, ...outgoingNodes];
        const connectedEdges = getConnectedEdges(nodeId);
        try {
            nodeDef.afterEdgeAddOrRemove(
                targetNode.data,
                connectedNodes,
                incomingNodes,
                outgoingNodes,
                connectedEdges,
            );
        } catch (error) {
            console.error(error);
        }
    }

    function processEdgeChanges(changes: EdgeChange[]): void {
        const relatedNodeIdSet = new Set<string>();
        changes.forEach((change) => {
            if (isEdgeAddChange(change)) {
                const newEdge = change.item;
                relatedNodeIdSet.add(newEdge.source);
                relatedNodeIdSet.add(newEdge.target);
            } else if (isEdgeRemoveChange(change)) {
                relatedNodeIdSet.add(change.source);
                relatedNodeIdSet.add(change.target);
            }
        });
        const relatedNodeIds = Array.from(relatedNodeIdSet);
        relatedNodeIds.forEach(nodeId => triggerAfterEdgeAddOrRemoveCallback(nodeId));
    }

    onEdgesChange((changes) => {
        applyEdgeChanges(changes);
        nextTick(() => {
            processEdgeChanges(changes);
        });
    });

    onConnect((connection) => {
        addEdges({
            type: 'common',
            ...connection,
        });
    });

    return {
        helperLineHorizontal,
        helperLineVertical,
    };
}

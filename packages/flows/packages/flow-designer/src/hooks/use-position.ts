import { ref, watch, computed, nextTick } from 'vue';
import { useVueFlow, type GraphNode, type XYPosition } from "@vue-flow/core";
import {
    nodeRegistry,
    type PaddingSchema,
    type SizeSchema,
    type NodeMetadata,
    type NodeData,
    DEFAULT_SUB_FLOW_CANVAS_PADDING,
    DEFAULT_SUB_FLOW_CANVAS_SIZE,
    useSubFlowCanvasRegistry,
} from "@farris/flow-devkit";
import { throttle } from 'lodash-es';

interface Rect {
    top: number;
    left: number;
    bottom: number;
    right: number;
}

interface UsePosition {
    repositionContainerNode(nodeId: string): void;
    throttleRepositionContainerNode(nodeId: string): void;
    getSubFlowNodeOffset(containerNodeId?: string): XYPosition;
    getCanvasSizeByNodeTypeAndChildNodes(nodeType: string, childNodes: GraphNode[]): SizeSchema;
    waitPositionEffect(): Promise<void>;
}

let positionInstance: UsePosition;

export function usePosition(): UsePosition {

    if (positionInstance) {
        return positionInstance;
    }

    const THROTTLE_MIN_INTERVAL = 60;
    const WAIT_POSITION_EFFECT = 50;
    const { nodes: allNodes, updateNode } = useVueFlow();
    const { getCanvasRelativePosition } = useSubFlowCanvasRegistry();

    function getChildNodesRect(nodes: GraphNode[]): Rect {
        const rect: Rect = {
            top: Number.MAX_SAFE_INTEGER,
            left: Number.MAX_SAFE_INTEGER,
            bottom: Number.MIN_SAFE_INTEGER,
            right: Number.MIN_SAFE_INTEGER,
        };
        for (const node of nodes) {
            const position = node.computedPosition;
            const size = node.dimensions;
            const topPos = position.y;
            const leftPos = position.x;
            const bottomPos = position.y + size.height;
            const rightPos = position.x + size.width;
            if (topPos < rect.top) {
                rect.top = topPos;
            }
            if (leftPos < rect.left) {
                rect.left = leftPos;
            }
            if (bottomPos > rect.bottom) {
                rect.bottom = bottomPos;
            }
            if (rightPos > rect.right) {
                rect.right = rightPos;
            }
        }
        return rect;
    }

    function getSubFlowNodeOffset(containerNodeId?: string): XYPosition {
        const notApplication: XYPosition = { x: 0, y: 0 };
        const containerNode = allNodes.value.find(node => node.id === containerNodeId);
        if (!containerNodeId || !containerNode) {
            return notApplication;
        }
        const canvasPadding = getCanvasPaddingByNodeType(containerNode.type);
        const canvasRelativePosition = getCanvasRelativePosition(containerNodeId);
        return {
            x: canvasRelativePosition.x + canvasPadding.left,
            y: canvasRelativePosition.y + canvasPadding.top,
        };
    }

    function getCanvasPaddingByNodeType(nodeType?: string): PaddingSchema {
        const notApplication: PaddingSchema = { top: 0, left: 0, bottom: 0, right: 0 };
        if (!nodeType) {
            return notApplication;
        }
        const nodeMeta = nodeRegistry.getNodeMetadata(nodeType);
        if (!nodeMeta) {
            return notApplication;
        }
        return getCanvasPadding(nodeMeta);
    }

    function getCanvasPadding(nodeMeta: NodeMetadata): PaddingSchema {
        return nodeMeta.subFlowCanvasPadding || DEFAULT_SUB_FLOW_CANVAS_PADDING;
    }

    function getCanvasSize(nodesRect: Rect, canvasPadding: PaddingSchema): SizeSchema {
        return {
            width: nodesRect.right - nodesRect.left + canvasPadding.left + canvasPadding.right,
            height: nodesRect.bottom - nodesRect.top + canvasPadding.top + canvasPadding.bottom,
        };
    }

    function getCanvasSizeByNodeTypeAndChildNodes(nodeType: string, childNodes: GraphNode[]): SizeSchema {
        const canvasPadding = getCanvasPaddingByNodeType(nodeType);
        const nodesRect = getChildNodesRect(childNodes);
        return getCanvasSize(nodesRect, canvasPadding);
    }

    function getContainerNewAbsPosition(
        childNodesRect: Rect,
        canvasPadding: PaddingSchema,
        canvasRelativePosition: XYPosition,
    ): XYPosition {
        return {
            x: childNodesRect.left - canvasPadding.left - canvasRelativePosition.x,
            y: childNodesRect.top - canvasPadding.top - canvasRelativePosition.y,
        };
    }

    function getNewRelativePosition(node: GraphNode, newAbsPos: XYPosition): XYPosition {
        if (!node.parentNode) {
            return newAbsPos;
        }
        const parentNode = allNodes.value.find(n => n.id === node.parentNode);
        if (!parentNode) {
            return newAbsPos;
        }
        return {
            x: newAbsPos.x - parentNode.computedPosition.x,
            y: newAbsPos.y - parentNode.computedPosition.y,
        };
    }

    function repositionParentNode(node: GraphNode): void {
        const parentNodeId = node.parentNode;
        if (parentNodeId) {
            // @todo 考虑优化
            setTimeout(() => {
                throttleRepositionContainerNode(parentNodeId);
            }, WAIT_POSITION_EFFECT);
        }
    }

    function recoverFlowCanvasSize(containerNode: GraphNode, containerNodeMeta: NodeMetadata): void {
        const canvasSize = Object.assign(
            {},
            containerNodeMeta.subFlowCanvasSize || DEFAULT_SUB_FLOW_CANVAS_SIZE,
        );
        const nodeData = containerNode.data as NodeData;
        nodeData.subFlowCanvasSize = canvasSize;
    }

    function repositionContainerNode(nodeId: string): void {
        const containerNode = allNodes.value.find(node => node.id === nodeId);
        const childNodes = allNodes.value.filter(node => node.parentNode === nodeId);
        const containerNodeMeta = nodeRegistry.getNodeMetadata(containerNode?.type || '');
        const isContainerNode = !!containerNodeMeta?.isSubFlowContainer;
        if (!nodeId || !containerNode || !containerNodeMeta || !isContainerNode) {
            return;
        }
        if (childNodes.length === 0) {
            recoverFlowCanvasSize(containerNode, containerNodeMeta);
            repositionParentNode(containerNode);
            return;
        }
        const childNodesRect = getChildNodesRect(childNodes);
        const canvasPadding = getCanvasPadding(containerNodeMeta);
        const canvasNewSize = getCanvasSize(childNodesRect, canvasPadding);
        const canvasRelativePosition = getCanvasRelativePosition(nodeId);
        const containerNewAbsPosition = getContainerNewAbsPosition(
            childNodesRect, canvasPadding, canvasRelativePosition
        );
        const newChildNodesRelativePositions: XYPosition[] = childNodes.map((childNode) => {
            const childNodeAbsPos = childNode.computedPosition;
            return {
                x: childNodeAbsPos.x - containerNewAbsPosition.x,
                y: childNodeAbsPos.y - containerNewAbsPosition.y,
            };
        });
        const containerNewPosition = getNewRelativePosition(containerNode, containerNewAbsPosition);
        // 更新画布大小
        const containerNodeData: NodeData = containerNode.data;
        containerNodeData.subFlowCanvasSize = canvasNewSize;
        // 更新父节点位置
        updateNode(containerNode.id, { position: containerNewPosition });
        // 更新子节点位置
        for (let i = 0; i < childNodes.length; i++) {
            const childNodeId = childNodes[i].id;
            const childNodePos = newChildNodesRelativePositions[i];
            updateNode(childNodeId, { position: childNodePos });
        }
        // 如果子流程节点还有父节点，则需要递归更新祖父节点的位置
        repositionParentNode(containerNode);
    }

    const nodeId2ThrottleRepositionFunc = ref<Map<string, (nodeId: string) => void>>(new Map());

    function createThrottleRepositionFunc() {
        return throttle(repositionContainerNode, THROTTLE_MIN_INTERVAL, {
            leading: true,
            trailing: true,
        });
    }

    const allNodeIds = computed<string[]>(() => {
        return allNodes.value.map(node => node.id);
    });

    watch(
        allNodeIds,
        () => {
            const oldNodeIds = nodeId2ThrottleRepositionFunc.value.keys();
            for (const oldNodeId of oldNodeIds) {
                if (allNodeIds.value.findIndex(id => id === oldNodeId) < 0) {
                    nodeId2ThrottleRepositionFunc.value.delete(oldNodeId);
                }
            }
            for (const newNodeId of allNodeIds.value) {
                if (nodeId2ThrottleRepositionFunc.value.has(newNodeId)) {
                    continue;
                }
                nodeId2ThrottleRepositionFunc.value.set(newNodeId, createThrottleRepositionFunc());
            }
        },
        { immediate: true },
    );

    function throttleRepositionContainerNode(nodeId: string): void {
        const throttleRepositionFunc = nodeId2ThrottleRepositionFunc.value.get(nodeId);
        if (throttleRepositionFunc) {
            throttleRepositionFunc(nodeId);
        }
    }

    async function waitPositionEffect(): Promise<void> {
        await nextTick();
        return new Promise((resolve) => {
            setTimeout(() => resolve(), WAIT_POSITION_EFFECT);
        });
    }

    positionInstance = {
        repositionContainerNode,
        throttleRepositionContainerNode,
        getSubFlowNodeOffset,
        getCanvasSizeByNodeTypeAndChildNodes,
        waitPositionEffect,
    };
    return positionInstance;
}

import { useVueFlow, type Node, type GraphNode, type Rect, type XYPosition } from '@vue-flow/core';
import { reactive, watch, provide, inject, toRefs, type Ref, ref } from 'vue';
import { cloneDeep } from 'lodash-es';
import { type FNotifyService, F_NOTIFY_SERVICE_TOKEN } from '@farris/ui-vue';
import {
    nodeRegistry,
    uuid,
    INTERSECTED_CONTAINER_NODE_ID_KEY,
    DEFAULT_SUB_FLOW_CANVAS_SIZE,
    type NodeData,
    type NodeMetadata,
} from '@farris/flow-devkit';
import type { NodePanelItem } from '@flow-designer/types';
import { usePosition } from './use-position';
import { useFlowKind } from '@flow-designer/hooks';

export type UseDragNewNode = {
    draggedType: Ref<string | null>;
    isDragOver: Ref<boolean>;
    isDragging: Ref<boolean>;
    onDragStart: (event: DragEvent, type: string, nodePanelItem: NodePanelItem) => void;
    onDrag: (event: DragEvent) => void;
    onDragLeave: () => void;
    onDragOver: (event: DragEvent) => void;
    onDrop: (event: DragEvent) => void;
};

const MAX_NODE_NESTING_LEVEL = 2;

let dragNewNodeInstance: UseDragNewNode;

export function useDragNewNode(): UseDragNewNode {
    if (dragNewNodeInstance) {
        return dragNewNodeInstance;
    }

    const notifyService = inject<FNotifyService>(F_NOTIFY_SERVICE_TOKEN);

    const intersectedContainerNodeId = ref<string>('');
    provide(INTERSECTED_CONTAINER_NODE_ID_KEY, intersectedContainerNodeId);

    const { repositionContainerNode } = usePosition();
    const { loadNodeByType } = useFlowKind();

    const state = reactive({
        draggedElementWidth: 0,
        draggedElementHeight: 0,
        dragOffsetX: 0,
        dragOffsetY: 0,
        draggedType: null as string | null,
        nodePanelItem: null as NodePanelItem | null,
        isDragOver: false,
        isDragging: false,
    });

    const {
        addNodes,
        screenToFlowCoordinate,
        onNodesInitialized,
        isNodeIntersecting,
        nodes: allNodes,
    } = useVueFlow();

    watch(
        () => state.isDragging,
        (dragging) => {
            document.body.style.userSelect = dragging ? 'none' : '';
        }
    );

    function getDraggedNodePosition(event: DragEvent): XYPosition {
        return screenToFlowCoordinate({
            x: event.clientX - state.dragOffsetX,
            y: event.clientY - state.dragOffsetY,
        });
    }

    function getDraggedElementRect(event: DragEvent): Rect {
        const { x, y } = getDraggedNodePosition(event);
        return {
            x,
            y,
            width: state.draggedElementWidth,
            height: state.draggedElementHeight,
        };
    }

    function getIntersectedContainerNode(rect: Rect): GraphNode | undefined {
        const intersectedNodes = allNodes.value.filter((node) => {
            return isNodeIntersecting(node, rect);
        });
        const intersectedContainerNodes = intersectedNodes.filter(
            (node) => nodeRegistry.isContainerNode(node.type)
        );
        if (intersectedContainerNodes.length === 0) {
            return undefined;
        }
        let topNodeIndex = -1;
        let topNodeZPos = Number.MIN_SAFE_INTEGER;
        for (let i = 0; i < intersectedContainerNodes.length; i++) {
            const node = intersectedContainerNodes[i];
            const nodeZPos = node.computedPosition.z;
            if (nodeZPos > topNodeZPos) {
                topNodeIndex = i;
                topNodeZPos = nodeZPos;
            }
        }
        return intersectedContainerNodes[topNodeIndex];
    }

    function clearNodeIntersection(): void {
        intersectedContainerNodeId.value = '';
    }

    function onDragStart(event: DragEvent, type: string, nodePanelItem: NodePanelItem) {
        const draggedEl = event.currentTarget as HTMLElement;
        if (!draggedEl) {
            return;
        }
        if (event.dataTransfer) {
            event.dataTransfer.setData('application/vueflow', type);
            event.dataTransfer.effectAllowed = 'move';
        }
        state.draggedElementWidth = draggedEl.offsetWidth;
        state.draggedElementHeight = draggedEl.offsetHeight;
        const draggedElementRect = draggedEl.getBoundingClientRect();
        state.dragOffsetX = event.clientX - draggedElementRect.left;
        state.dragOffsetY = event.clientY - draggedElementRect.top;
        state.draggedType = type;
        state.nodePanelItem = nodePanelItem;
        state.isDragging = true;
    }

    function onDrag(event: DragEvent): void {
        if (!state.isDragOver) {
            return;
        }
        const rect = getDraggedElementRect(event);
        const intersectedContainerNode = getIntersectedContainerNode(rect);
        intersectedContainerNodeId.value = intersectedContainerNode?.id || '';
    }

    function onDragOver(event: DragEvent) {
        event.preventDefault();
        if (state.draggedType) {
            state.isDragOver = true;
            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = 'move';
            }
        }
    }

    function onDragLeave() {
        state.isDragOver = false;
        clearNodeIntersection();
    }

    function onDragEnd() {
        state.isDragging = false;
        state.isDragOver = false;
        state.draggedType = null;
        state.nodePanelItem = null;
        clearNodeIntersection();
    }

    function getNewCode(node: Node): string {
        const type = node.type || '';
        const id = node.id || '';
        return `${type}_${id}`;
    }

    function hasSameName(nodeName: string): boolean {
        return !!allNodes.value.find(node => node.data.name === nodeName);
    }

    function getNewName(nodeMetadata?: NodeMetadata): string {
        const baseName = state.nodePanelItem?.initialData?.data?.name || nodeMetadata?.label || '未命名';
        if (!hasSameName(baseName)) {
            return baseName;
        }
        let count = 1;
        while (true) {
            count++;
            const newName = `${baseName}_${count}`;
            if (!hasSameName(newName)) {
                return newName;
            }
        }
    }

    function initNewNode(node: Node): void {
        const type = node.type || '';
        const nodeDef = nodeRegistry.get(type);
        const initialData = nodeDef?.initialData;
        const nodeMetadata = nodeDef?.metadata;
        if (typeof initialData === 'function') {
            node.data = initialData();
        }
        const nodeData: NodeData = node.data || {};
        Object.defineProperty(nodeData, 'id', {
            value: node.id,
            writable: false,
            enumerable: true,
            configurable: false,
        });
        Object.defineProperty(nodeData, 'code', {
            value: getNewCode(node),
            writable: false,
            enumerable: true,
            configurable: false,
        });
        Object.defineProperty(nodeData, 'kind', {
            value: node.type!,
            writable: false,
            enumerable: true,
            configurable: false,
        });
        nodeData.name = getNewName(nodeMetadata);
        nodeData.description = '';
        nodeData.inputParams = nodeData.inputParams || [];
        nodeData.outputParams = nodeData.outputParams || [];
        nodeData.inputPorts = nodeData.inputPorts || [];
        nodeData.outputPorts = nodeData.outputPorts || [];
        if (nodeMetadata) {
            node.deletable = nodeMetadata.deletable;
            node.draggable = nodeMetadata.draggable;
            node.connectable = nodeMetadata.connectable;
            node.selectable = nodeMetadata.selectable;
            if (nodeMetadata.isSubFlowContainer) {
                nodeData.subFlowCanvasSize = {
                    width: DEFAULT_SUB_FLOW_CANVAS_SIZE.width,
                    height: DEFAULT_SUB_FLOW_CANVAS_SIZE.height,
                };
            }
        }
        node.data = nodeData;
    }

    function transToRelativePosition(position: XYPosition, parentNode?: GraphNode): XYPosition | undefined {
        if (!parentNode) {
            return undefined;
        }
        const parentNodePosition = parentNode.computedPosition;
        return {
            x: position.x - parentNodePosition.x,
            y: position.y - parentNodePosition.y,
        };
    }

    function getNodeNestingLevel(nodeType: string, parentNode?: string): number {
        let level = 0;
        if (nodeRegistry.isContainerNode(nodeType)) {
            ++level;
        }
        let currentNodeId = parentNode;
        while (currentNodeId) {
            ++level;
            const currentNode = allNodes.value.find(node => node.id === currentNodeId);
            currentNodeId = currentNode?.parentNode;
        }
        return level;
    }

    function mergeObject(target: any, source: any): void {
        if (!source || typeof source !== 'object') {
            source = {};
        }
        source = cloneDeep(source);
        Object.assign(target, source);
    }

    async function onDrop(event: DragEvent): Promise<void> {
        if (!state.draggedType) {
            return;
        }
        const nodeType = state.draggedType;
        const isNodeLoaded = await loadNodeByType(nodeType);
        if (!isNodeLoaded) {
            return;
        }
        const position = getDraggedNodePosition(event);
        const rect = getDraggedElementRect(event);
        const parentContainerNode = getIntersectedContainerNode(rect);
        const parentNode = parentContainerNode?.id;
        if (getNodeNestingLevel(nodeType, parentNode) > MAX_NODE_NESTING_LEVEL) {
            onDragEnd();
            const message = `节点最多嵌套${MAX_NODE_NESTING_LEVEL}层`;
            notifyService?.warning({ message, position: 'top-center', showCloseButton: true, timeout: 3000 });
            return;
        }
        const relativePosition = transToRelativePosition(position, parentContainerNode);

        const newNodes: Node[] = [];
        const nodeId = uuid();
        const newNode: Node = {
            id: nodeId,
            type: nodeType,
            position: relativePosition || position,
            parentNode,
            data: {},
        };
        mergeObject(newNode, state.nodePanelItem?.initialData);
        initNewNode(newNode);
        newNodes.push(newNode);

        const { off } = onNodesInitialized(() => {
            if (parentNode) {
                repositionContainerNode(parentNode);
            }
            off();
        });

        addNodes(newNodes);
        onDragEnd();
    }

    dragNewNodeInstance = {
        ...toRefs(state),
        onDragStart,
        onDrag,
        onDragLeave,
        onDragOver,
        onDrop,
    };
    return dragNewNodeInstance;
}

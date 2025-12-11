import { type Ref, onMounted, onUnmounted, type InjectionKey, inject, provide } from "vue";
import { useNodeId } from "./use-node-id";
import { useVueFlow, type XYPosition } from "@vue-flow/core";

interface UseSubFlowCanvasRegistry {
    registerSubFlowCanvas(nodeId: string, wrapperElementRef: Ref<HTMLElement | undefined>): void;
    unregisterSubFlowCanvas(nodeId: string): void;
    getCanvasRelativePosition(nodeId: string): XYPosition;
}

const subFlowCanvasRegistryKey: InjectionKey<UseSubFlowCanvasRegistry> = Symbol('subFlowCanvasRegistry');

export function useSubFlowCanvasRegistry(): UseSubFlowCanvasRegistry {
    const existingContext = inject(subFlowCanvasRegistryKey, null);
    if (existingContext) {
        return existingContext;
    }

    const { nodes: allNodes, screenToFlowCoordinate } = useVueFlow();
    const nodeId2ElRef = new Map<string, Ref<HTMLElement | undefined>>();

    function registerSubFlowCanvas(nodeId: string, wrapperElementRef: Ref<HTMLElement | undefined>): void {
        if (!nodeId || !wrapperElementRef) {
            return;
        }
        nodeId2ElRef.set(nodeId, wrapperElementRef);
    }

    function unregisterSubFlowCanvas(nodeId: string): void {
        nodeId2ElRef.delete(nodeId);
    }

    function getCanvasRelativePosition(nodeId: string): XYPosition {
        const containerNode = allNodes.value.find(node => node.id === nodeId);
        const canvasWrapperElementRef = nodeId2ElRef.get(nodeId);
        if (!containerNode || !canvasWrapperElementRef || !canvasWrapperElementRef.value) {
            return { x: 0, y: 0 };
        }
        const rect = canvasWrapperElementRef.value.getBoundingClientRect();
        const { x: canvasAbsXPos, y: canvasAbsYPos } = screenToFlowCoordinate({
            x: rect.x,
            y: rect.y,
        });
        const absPos = containerNode.computedPosition;
        return {
            x: canvasAbsXPos - absPos.x,
            y: canvasAbsYPos - absPos.y,
        };
    }

    const context: UseSubFlowCanvasRegistry = {
        registerSubFlowCanvas,
        unregisterSubFlowCanvas,
        getCanvasRelativePosition,
    };
    provide(subFlowCanvasRegistryKey, context);
    return context;
}

export function useSubFlowCanvas(wrapperElementRef: Ref<HTMLElement | undefined>) {
    const subFlowCanvasRegistry = inject(subFlowCanvasRegistryKey)!;
    const nodeId = useNodeId();

    onMounted(() => {
        subFlowCanvasRegistry.registerSubFlowCanvas(nodeId.value, wrapperElementRef);
    });

    onUnmounted(() => {
        subFlowCanvasRegistry.unregisterSubFlowCanvas(nodeId.value);
    });
}

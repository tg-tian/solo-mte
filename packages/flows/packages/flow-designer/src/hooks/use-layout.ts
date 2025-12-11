import ELK from 'elkjs/lib/elk.bundled.js';
import { inject, ref, nextTick } from 'vue';
import type { NodePortConfig, NodeData } from '@farris/flow-devkit';
import { ALL_NODE_PORTS_REGISTRY_KEY, uuid } from '@farris/flow-devkit';
import { useVueFlow, type GraphNode } from '@vue-flow/core';
import { usePosition } from './use-position';

export function useLayout() {

    const {
        nodes: allNodes,
        edges: allEdges,
        fitView,
    } = useVueFlow();

    const elk = new ELK();

    const processing = ref(false);

    const nodePortsRegistry = inject(ALL_NODE_PORTS_REGISTRY_KEY)!;

    const {
        getSubFlowNodeOffset,
        getCanvasSizeByNodeTypeAndChildNodes,
        waitPositionEffect,
    } = usePosition();

    function getNodeLayoutOptions(): Record<string, string> {
        return {
            'elk.algorithm': 'layered',
            'elk.direction': 'RIGHT',
            'elk.edgeRouting': 'POLYLINE',
            'elk.portConstraints': 'FIXED_ORDER',
            'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
            'elk.layered.nodePlacement.favorStraightEdges': 'true',
            'elk.layered.nodePlacement.bk.edgeStraightening': 'IMPROVE_STRAIGHTNESS',
            'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
            'elk.layered.spacing.edgeNodeBetweenLayers': '100',
            'elk.layered.spacing.edgeEdgeBetweenLayers': '25',
            'elk.spacing.edgeNode': '25',
            'elk.spacing.edgeEdge': '25',
            'elk.spacing.nodeNode': '100',
            'elk.layered.spacing.nodeNodeBetweenLayers': '100',
            'elk.padding': 'top=0, right=0, bottom=0, left=0',
        };
    }

    function getChildNodeLayoutOptions(): Record<string, string> {
        return {
            'elk.portConstraints': 'FIXED_ORDER',
        };
    }

    function getElkPortSide(port: NodePortConfig): string {
        const { position, type } = port;
        switch (position) {
            case 'top': return 'NORTH';
            case 'right': return 'EAST';
            case 'bottom': return 'SOUTH';
            case 'left': return 'WEST';
        }
        return type === 'source' ? 'EAST' : 'WEST';
    }

    function getElkPortConfig(node: GraphNode, port: NodePortConfig) {
        return {
            id: `${node.id}_${port.id}`,
            layoutOptions: {
                'elk.port.side': getElkPortSide(port),
            },
        };
    }

    function comparePort(a: NodePortConfig, b: NodePortConfig): number {
        const aIndex = a.sortIndex ?? 0;
        const bIndex = b.sortIndex ?? 0;
        return aIndex - bIndex;
    }

    async function updateContainerNodeSize(childNodes: GraphNode[], containerNode?: GraphNode): Promise<void> {
        if (!containerNode) {
            return;
        }
        const containerNodeData = containerNode.data as NodeData;
        const oldCanvasSize = containerNodeData.subFlowCanvasSize;
        if (!oldCanvasSize) {
            return;
        }
        await nextTick();
        const newCanvasSize = getCanvasSizeByNodeTypeAndChildNodes(containerNode.type, childNodes);
        containerNodeData.subFlowCanvasSize = newCanvasSize;
        await waitPositionEffect();
    }

    async function layoutRecursive(parentNodeId?: string): Promise<void> {
        const parentNode = allNodes.value.find(node => parentNodeId === node.id);
        const currentLevelNodes = allNodes.value.filter(node => {
            if (!parentNode) {
                return !node.parentNode;
            }
            return node.parentNode === parentNodeId;
        });
        for (const node of currentLevelNodes) {
            await layoutRecursive(node.id);
        }
        const currentLevelEdges = allEdges.value.filter(edge => {
            const { source, target } = edge;
            return !!currentLevelNodes.find(node => node.id === source) && !!currentLevelNodes.find(node => node.id === target);
        });
        const graph = {
            id: parentNodeId || uuid(),
            layoutOptions: getNodeLayoutOptions(),
            children: currentLevelNodes.map(node => {
                const ports = nodePortsRegistry.getPortsByNodeId(node.id);
                const inputPorts = ports.filter((port: NodePortConfig) => port.type === 'target').sort(comparePort);
                const outputPorts = ports.filter((port: NodePortConfig) => port.type === 'source').sort(comparePort);
                const targetPorts = inputPorts.map(port => getElkPortConfig(node, port));
                const sourcePorts = outputPorts.map(port => getElkPortConfig(node, port));

                return {
                    id: node.id,
                    width: node.dimensions.width ?? 240,
                    height: node.dimensions.height ?? 100,
                    layoutOptions: getChildNodeLayoutOptions(),
                    ports: [...targetPorts, ...sourcePorts],
                };
            }),
            edges: currentLevelEdges.map(edge => ({
                id: edge.id,
                sources: [edge.sourceHandle ? `${edge.source}_${edge.sourceHandle}` : edge.source],
                targets: [edge.targetHandle ? `${edge.target}_${edge.targetHandle}` : edge.target],
            })),
        };
        const layoutedGraph = await elk.layout(graph);
        currentLevelNodes.forEach((node) => {
            const layoutedNode = layoutedGraph.children?.find((lgNode) => lgNode.id === node.id);
            if (!layoutedNode) {
                return;
            }
            const offset = getSubFlowNodeOffset(parentNodeId);
            node.position = {
                x: (layoutedNode.x ?? 0) + offset.x,
                y: (layoutedNode.y ?? 0) + offset.y,
            };
        });
        await updateContainerNodeSize(currentLevelNodes, parentNode);
    }

    async function layout(): Promise<void> {
        await layoutRecursive();
    }

    async function layoutAndFitView(): Promise<void> {
        if (processing.value) {
            return;
        }
        processing.value = true;
        try {
            await layout();
            nextTick(() => {
                fitView({
                    padding: 0.2,
                    includeHiddenNodes: true,
                });
            });
        } finally {
            processing.value = false;
        }
    }

    return {
        layoutAndFitView,
    };
}

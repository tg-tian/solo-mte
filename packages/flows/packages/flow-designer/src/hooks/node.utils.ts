import type { Node } from '@vue-flow/core';
import type { Parameter, NodeDefinition, NodeMetadata, NodeData } from '@farris/flow-devkit';
import { nodeRegistry } from '@farris/flow-devkit';

export class NodeUtils {

    public static getNodeDefinition(nodeType: string): NodeDefinition | undefined {
        if (!nodeType) {
            return undefined;
        }
        const nodeDef = nodeRegistry.get(nodeType);
        return nodeDef;
    }

    public static getNodeMetadata(nodeType: string): NodeMetadata | undefined {
        const nodeDef = this.getNodeDefinition(nodeType);
        return nodeDef?.metadata;
    }

    public static isStartNode(node: Node): boolean {
        if (!node || !node.type) {
            return false;
        }
        const nodeMeta = this.getNodeMetadata(node.type);
        return !!nodeMeta?.isStartNode;
    }

    public static getOutputParams(node: Node): Parameter[] {
        const isStartNode = this.isStartNode(node);
        const nodeData = (node.data || {}) as NodeData;
        if (isStartNode) {
            if (nodeData.outputParams && nodeData.outputParams.length) {
                return nodeData.outputParams;
            }
            return nodeData.inputParams || [];
        }
        return nodeData.outputParams || [];
    }

}

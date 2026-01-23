import type { Node } from '@vue-flow/core';
import type { Parameter, NodeDefinition, NodeMetadata, NodeData } from '@farris/flow-devkit';
import { nodeRegistry, uuid } from '@farris/flow-devkit';

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

    private static visitParameter(collection: Parameter[], visitedParamIdSet: Set<string>, parameter: Parameter): void {
        if (!parameter.id) {
            parameter.id = uuid();
        }
        if (visitedParamIdSet.has(parameter.id)) {
            return;
        }
        collection.push(parameter);
        visitedParamIdSet.add(parameter.id);
    }

    private static getOutputParamsByDefault(node: Node): Parameter[] {
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

    public static getAllOutputParams(node: Node): Parameter[] {
        const visitedParamIdSet = new Set<string>();
        const allParams: Parameter[] = [];
        const nodeData = (node.data || {}) as NodeData;
        const nodeDef = this.getNodeDefinition(node.type!);
        const outputParams = typeof nodeDef?.getOutputParams === 'function'
            ? nodeDef.getOutputParams(nodeData)
            : this.getOutputParamsByDefault(node);
        outputParams.forEach(param => this.visitParameter(allParams, visitedParamIdSet, param));
        if (typeof nodeDef?.getOutputParamsForChildNodes === 'function') {
            const outputParamsForChildNodes = nodeDef.getOutputParamsForChildNodes(nodeData);
            outputParamsForChildNodes.forEach(param => this.visitParameter(allParams, visitedParamIdSet, param));
        }
        return allParams;
    }

}

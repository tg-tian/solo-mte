import {
    NODE_VALIDATION_DETAILS_KEY,
    type NodeValidationDetails,
    nodeRegistry,
    type NodeMetadata,
    type NodeData,
} from '@farris/flow-devkit';
import { useVueFlow } from '@vue-flow/core';

export function useValidate() {

    const {
        nodes: allNodes,
    } = useVueFlow();

    function isNodeForbidDuplicateName(nodeMeta?: NodeMetadata): boolean {
        return nodeMeta?.canRename !== false;
    }

    function isFlowValid(): boolean {
        const nodes = allNodes.value;
        for (const node of nodes) {
            const nodeData = node.data as NodeData;
            const nodeName = nodeData.name;
            const nodeType = node.type;
            const nodeMeta = nodeRegistry.getNodeMetadata(nodeType);
            const sameNameNodes = allNodes.value.filter(n => n.data.name === nodeName);
            if (sameNameNodes.length > 1 && isNodeForbidDuplicateName(nodeMeta)) {
                return false;
            }
            const validationDetails = nodeData[NODE_VALIDATION_DETAILS_KEY] as NodeValidationDetails;
            if (validationDetails?.errors?.length) {
                return false;
            }
        }
        return true;
    }

    function isNodeValid(nodeId: string): boolean {
        const node = allNodes.value.find(n => n.id === nodeId);
        if (!node) {
            return false;
        }
        const nodeData = node.data as NodeData;
        const nodeName = nodeData.name;
        const nodeType = node.type;
        const nodeMeta = nodeRegistry.getNodeMetadata(nodeType);
        const sameNameNodes = allNodes.value.filter(n => n.data.name === nodeName);
        if (sameNameNodes.length > 1 && isNodeForbidDuplicateName(nodeMeta)) {
            return false;
        }
        const validationDetails = nodeData[NODE_VALIDATION_DETAILS_KEY] as NodeValidationDetails;
        if (validationDetails?.errors?.length) {
            return false;
        }
        return true;
    }

    return {
        isFlowValid,
        isNodeValid,
    };
}

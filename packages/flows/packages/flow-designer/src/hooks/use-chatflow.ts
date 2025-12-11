import { nextTick } from 'vue';
import { useFlowMetadata, BuiltinNodeType } from '@farris/flow-devkit';
import { useVueFlow, type NodeChange, type EdgeChange } from '@vue-flow/core';

/** 处理对话流独有的业务逻辑 */
export function useChatflow() {
    const { getFlowKind } = useFlowMetadata();

    if (getFlowKind() !== 'chatflow') {
        return;
    }

    const {
        nodes: allNodes,
        getOutgoers,
        onEdgesChange,
        onNodesChange,
    } = useVueFlow();

    function checkNodeConnectionsToEndNode() {
        allNodes.value.forEach(node => {
            const outgoingNodes = getOutgoers(node);
            const hasEndNodeConnection = outgoingNodes.some(outgoingNode => {
                return BuiltinNodeType.End === outgoingNode.type;
            });
            const currentNodeData = node.data;
            currentNodeData.hasConnectedToEndNode = hasEndNodeConnection;
            currentNodeData.streamingOutput = hasEndNodeConnection;
        });
    }

    function handleChanges(changes: (NodeChange | EdgeChange)[]): void {
        const hasAddOrRemove = changes.some(change => change.type === 'add' || change.type === 'remove');
        if (hasAddOrRemove) {
            nextTick(checkNodeConnectionsToEndNode);
        }
    }

    onEdgesChange(handleChanges);
    onNodesChange(handleChanges);
    checkNodeConnectionsToEndNode();
}

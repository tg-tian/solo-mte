import { BuiltinNodeType, useFlowMetadata } from '@farris/flow-devkit';
import type { FlowNodeInstance } from '@farris/flow-devkit';

/**
 * 通用流式输出连接检查函数
 * 在 chatflow 模式下，检查节点是否连接到结束节点，并自动设置相应的流式输出状态
 * 不需要用户手动控制，完全根据连接状态自动设置
 */
export function createStreamingOutputChecker() {
    return function (
        nodeData: any,
        connectedNodes: FlowNodeInstance[],
        incomingNodes: FlowNodeInstance[],
        outgoingNodes: FlowNodeInstance[],
        connectedEdges: any[]
    ) {
        try {
            // 动态获取 flowKind，避免在模块导入时调用
            const { getFlowKind } = useFlowMetadata();
            const flowKind = getFlowKind() || 'workflow';

            if (flowKind !== 'chatflow') {
                return;
            }

            // 检查是否有连接到结束节点的输出连接
            const hasEndNodeConnection = outgoingNodes.some(node => node.type === BuiltinNodeType.End);

            // 根据连接状态自动设置流式输出，无需用户手动控制
            if (hasEndNodeConnection) {
                nodeData.hasConnectedToEndNode = true;
                nodeData.streamingOutput = true;
            } else {
                nodeData.hasConnectedToEndNode = false;
                nodeData.streamingOutput = false;
            }
        } catch (error) {
            // 如果获取 flowKind 失败，默认不执行流式输出逻辑
            console.warn('Failed to get flow kind, streaming output logic disabled:', error);
        }
    };
}

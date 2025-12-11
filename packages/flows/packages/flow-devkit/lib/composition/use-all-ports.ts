import { type InjectionKey, inject, onMounted, onUnmounted } from 'vue';
import type { NodePortConfig } from '@farris/flow-devkit/types';
import { useNodeId } from './use-node-id';
import { useFlow } from './use-flow';

interface PortConfigRegistry {
    /**
     * 注册连接点
     * @param nodeId     节点ID
     * @param portConfig 连接点配置
     */
    registerPort: (nodeId: string, portConfig: NodePortConfig) => void;
    /**
     * 注销连接点
     * @param nodeId 节点ID
     * @param portId 连接点ID
     */
    unregisterPort: (nodeId: string, portId: string) => void;
    /**
     * 获取连接点配置
     * @param nodeId 节点ID
     * @param portId 连接点ID
     * @returns 连接点配置
     */
    getPortConfig: (nodeId: string, portId: string) => NodePortConfig | undefined;

    /**
     * 获取节点的所有连接点配置
     * @param nodeId 节点ID
     */
    getPortsByNodeId(nodeId: string): NodePortConfig[];
}

export const ALL_NODE_PORTS_REGISTRY_KEY: InjectionKey<PortConfigRegistry> = Symbol('AllNodePortsRegistry');

export function usePortConfig(portConfig: NodePortConfig) {
    const registry = inject(ALL_NODE_PORTS_REGISTRY_KEY);
    const currentNodeId = useNodeId();
    const { removeAttachedEdgesByPortId } = useFlow();

    if (!registry) {
        throw new Error('Cannot find port registry');
    }

    onMounted(() => {
        registry.registerPort(currentNodeId.value, portConfig);
    });

    onUnmounted(() => {
        registry.unregisterPort(currentNodeId.value, portConfig.id);
        if (portConfig.removeAttachedEdgesOnUnmounted) {
            removeAttachedEdgesByPortId(currentNodeId.value, portConfig.id);
        }
    });
}

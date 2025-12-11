import { provide } from 'vue';
import {
    ALL_NODE_PORTS_REGISTRY_KEY,
    type NodePortConfig,
} from '@farris/flow-devkit';

export function useAllNodePortsRegistry() {

    const nodeId2Ports = new Map<string, NodePortConfig[]>();

    function registerPort(nodeId: string, portConfig: NodePortConfig): void {
        if (!nodeId || !portConfig || !portConfig.id) {
            return;
        }
        const ports = nodeId2Ports.get(nodeId) || [];
        nodeId2Ports.set(nodeId, ports);
        const newPortId = portConfig.id;
        if (ports.findIndex(port => port.id === newPortId) >= 0) {
            return;
        }
        ports.push(portConfig);
    }

    function unregisterPort(nodeId: string, portId: string): void {
        const ports = nodeId2Ports.get(nodeId);
        if (!ports) {
            return;
        }
        const targetIndex = ports.findIndex(port => port.id === portId);
        if (targetIndex >= 0) {
            ports.splice(targetIndex, 1);
        }
        if (ports.length === 0) {
            nodeId2Ports.delete(nodeId);
        }
    }

    function getPortConfig(nodeId: string, portId: string): NodePortConfig | undefined {
        return nodeId2Ports.get(nodeId)?.find(port => port.id === portId);
    }

    function getPortsByNodeId(nodeId: string): NodePortConfig[] {
        return nodeId2Ports.get(nodeId) || [];
    }

    provide(ALL_NODE_PORTS_REGISTRY_KEY, {
        registerPort,
        unregisterPort,
        getPortConfig,
        getPortsByNodeId,
    });
}

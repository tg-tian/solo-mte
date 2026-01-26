import {
    BuiltinNodeType,
    useDeviceInfo,
    nodeRegistry,
    uuid,
    type DeviceCategory,
    type NodeMetadata,
    type NodeDefinition,
} from '@farris/flow-devkit';
import type {
    NodePanelItem,
    NodePanelCategory,
} from '@flow-designer/types';
import { DEVICE_CALL_NODE, DEVICE_EVENT_LISTEN_NODE } from '@flow-designer/components/builtin-nodes';

export function useDeviceNodes() {

    const {
        shouldShowDeviceNodes,
        getDeviceCategories,
        deviceCategoriesWithAction,
        deviceCategoriesWithEvent,
    } = useDeviceInfo();

    function registerDeviceCallNode(device: DeviceCategory): void {
        const originalMetadata = DEVICE_CALL_NODE.metadata;
        const newMetadata = Object.assign({}, originalMetadata, {
            type: device.category,
            label: device.modelName,
            extensionConfig: device,
        } as Partial<NodeMetadata>);
        const nodeDefinition = Object.assign({}, DEVICE_CALL_NODE, {
            metadata: newMetadata,
        } as Partial<NodeDefinition>);
        nodeRegistry.register(nodeDefinition);
    }

    async function registerDeviceNodes(): Promise<NodePanelCategory[]> {
        if (!shouldShowDeviceNodes()) {
            return [];
        }
        await getDeviceCategories();
        const actionNodes: NodePanelItem[] = [];
        const eventNodes: NodePanelItem[] = [];
        const newNodePanelCategories: NodePanelCategory[] = [];
        deviceCategoriesWithAction.value.forEach((device) => {
            actionNodes.push({
                type: device.category,
                label: device.modelName,
                icon: DEVICE_CALL_NODE.metadata.icon,
                description: '',
            });
            registerDeviceCallNode(device);
        });
        if (deviceCategoriesWithEvent.value.length) {
            eventNodes.push({
                type: BuiltinNodeType.DeviceEventListen,
                label: '设备事件',
                icon: DEVICE_EVENT_LISTEN_NODE.metadata.icon,
                description: '',
            });
        }
        if (actionNodes.length) {
            newNodePanelCategories.push({
                id: uuid(),
                label: '设备调用',
                nodes: actionNodes,
            });
        }
        if (eventNodes.length) {
            newNodePanelCategories.push({
                id: uuid(),
                label: '事件监听',
                nodes: eventNodes,
            });
        }
        return newNodePanelCategories;
    }

    return { registerDeviceNodes };
}

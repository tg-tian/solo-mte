import { markRaw } from 'vue';
import type { NodeDefinition } from '@farris/flow-devkit';
import { BuiltinNodeType } from '@farris/flow-devkit';
import { deviceEventIcon } from '@flow-designer/assets/images';
import DeviceEventListenComponent from './node.component.vue';
import { NodeProperty } from './property-config';

export const DEVICE_EVENT_LISTEN_NODE: NodeDefinition = {
    metadata: {
        type: BuiltinNodeType.DeviceEventListen,
        label: '设备事件',
        icon: deviceEventIcon,
        debuggable: false,
        ports: [
            {
                id: 'output',
                position: 'right',
                type: 'source',
            }
        ]
    },
    component: markRaw(DeviceEventListenComponent),
    getPropertyPanelConfig: (nodeData) => {
        const config = new NodeProperty();
        return config.getPropertyConfig(nodeData);
    },
};

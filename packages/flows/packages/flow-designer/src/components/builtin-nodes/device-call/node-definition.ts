import { markRaw } from 'vue';
import type { NodeDefinition } from '@farris/flow-devkit';
import { BuiltinNodeType } from '@farris/flow-devkit';
import { defaultIcon } from '@flow-designer/assets/images';
import DeviceCallComponent from './node.component.vue';
import { NodeProperty } from './property-config';

export const DEVICE_CALL_NODE: NodeDefinition = {
    metadata: {
        type: BuiltinNodeType.DeviceCall,
        label: '设备调用',
        icon: defaultIcon,
        debuggable: false,
        ports: [
            {
                id: 'input',
                position: 'left',
                type: 'target',
            },
            {
                id: 'output',
                position: 'right',
                type: 'source',
            }
        ]
    },
    component: markRaw(DeviceCallComponent),
    getPropertyPanelConfig: (nodeData) => {
        const config = new NodeProperty();
        return config.getPropertyConfig(nodeData);
    },
};

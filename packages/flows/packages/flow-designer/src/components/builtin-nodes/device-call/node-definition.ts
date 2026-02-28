import { markRaw } from 'vue';
import type { NodeDefinition, DeviceCategory } from '@farris/flow-devkit';
import { BuiltinNodeType, useDeviceInfo } from '@farris/flow-devkit';
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
    getNodeIconUrl: (nodeData) => {
        const deviceType = nodeData.deviceCategory;
        const { deviceCategories } = useDeviceInfo();
        const deviceCategory: DeviceCategory = deviceCategories.value.find((device: DeviceCategory) => {
            return device.category === deviceType;
        });
        return deviceCategory?.icon || '';
    },
};

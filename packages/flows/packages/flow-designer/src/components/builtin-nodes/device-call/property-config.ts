import {
    BaseControlProperty,
    useDeviceInfo,
    DeviceUtils,
    type NodeData,
    type DeviceCategory,
    type Parameter,
    type FvComboListData,
} from '@farris/flow-devkit';

export class NodeProperty extends BaseControlProperty {

    public getPropertyConfig(nodeData: NodeData) {
        const category = nodeData.deviceCategory;
        const { deviceCategoriesWithAction } = useDeviceInfo();
        const deviceCategory: DeviceCategory = deviceCategoriesWithAction.value.find((device: DeviceCategory) => {
            return device.category === category;
        });
        const actions: FvComboListData = Object.keys(deviceCategory?.actions || {}).map((actionCode) => ({
            name: actionCode, value: actionCode,
        }));

        this.propertyConfig.categories['basic'] = {
            hideTitle: true,
            title: "基本信息",
            description: "Basic Information",
            properties: {
                name: {
                    type: "object",
                    editor: {
                        type: 'fvf-node-header',
                        nodeData,
                    },
                }
            }
        };
        this.propertyConfig.categories['action'] = {
            title: '设备操作',
            description: 'Device Action',
            properties: {
                deviceId: {
                    title: '指定设备',
                    type: 'string',
                    editor: {
                        type: "fvf-device-selector",
                        category,
                        modelName: deviceCategory?.modelName,
                    },
                },
                deviceAction: {
                    title: '设备操作',
                    type: 'enum',
                    editor: {
                        type: "combo-list",
                        textField: "name",
                        valueField: "value",
                        data: actions,
                    },
                },
            },
            setPropertyRelates(changeObject) {
                // `设备操作`变更时，需要更新操作参数列表
                if (changeObject?.propertyID === 'deviceAction') {
                    const action = (deviceCategory?.actions || {})[nodeData.deviceAction];
                    const actionArgs = action?.arguments || {};
                    const newParams: Parameter[] = Object.keys(actionArgs).map((argCode) => {
                        const actionArg = actionArgs[argCode];
                        return DeviceUtils.convertDeviceParameter2Parameter(argCode, actionArg);
                    });
                    nodeData.inputParams = newParams;
                }
            },
        };
        this.propertyConfig.categories['arguments'] = {
            title: '操作参数',
            description: 'Action Arguments',
            properties: {
                inputParams: {
                    type: "array",
                    editor: {
                        type: 'fvf-input-params',
                        isFixedSchema: true,
                    }
                }
            },
        };
        return this.propertyConfig;
    }
}

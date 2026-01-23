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
        const { deviceCategoriesWithEvent } = useDeviceInfo();
        const deviceCategoryData: FvComboListData = deviceCategoriesWithEvent.value.map((device: DeviceCategory) => ({
            name: device.modelName,
            value: device.category,
        }));
        const currentDeviceCategory: DeviceCategory = deviceCategoriesWithEvent.value.find((device: DeviceCategory) => {
            return device.category === nodeData.deviceCategory;
        });

        const deviceEventData: FvComboListData = Object.keys(currentDeviceCategory?.events || []).map((eventCode) => ({
            name: eventCode,
            value: eventCode,
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
        this.propertyConfig.categories['event'] = {
            title: '设备事件',
            description: 'Device Event',
            properties: {
                deviceCategory: {
                    title: '设备类型',
                    type: 'enum',
                    refreshPanelAfterChanged: true,
                    editor: {
                        type: "combo-list",
                        textField: "name",
                        valueField: "value",
                        data: deviceCategoryData,
                    },
                },
                deviceEvent: {
                    title: '设备事件',
                    type: 'enum',
                    editor: {
                        type: "combo-list",
                        textField: "name",
                        valueField: "value",
                        data: deviceEventData,
                    },
                },
            },
            setPropertyRelates(changeObject) {
                // 如果`设备类型`更新，需要清空`设备事件`字段
                if (changeObject?.propertyID === 'deviceCategory') {
                    nodeData.deviceEvent = undefined;
                }
                // `设备事件`变更时，需要更新事件参数列表
                const currentDeviceCategory: DeviceCategory = deviceCategoriesWithEvent.value.find((device: DeviceCategory) => {
                    return device.category === nodeData.deviceCategory;
                });
                const eventArgs = currentDeviceCategory?.events?.[nodeData.deviceEvent]?.fields;
                if (!eventArgs) {
                    nodeData.outputParams = [];
                    return;
                }
                const newOutputParams: Parameter[] = [];
                Object.keys(eventArgs).forEach((eventArgCode) => {
                    const eventArg = eventArgs[eventArgCode];
                    const newParam = DeviceUtils.convertDeviceParameter2Parameter(eventArgCode, eventArg);
                    newOutputParams.push(newParam);
                });
                nodeData.outputParams = newOutputParams;
            },
        };
        this.propertyConfig.categories['args'] = {
            title: '事件参数',
            properties: {
                outputParams: {
                    type: "array",
                    editor: {
                        type: 'fvf-json-schema-editor',
                        readonly: true,
                    }
                }
            }
        };
        return this.propertyConfig;
    }
}

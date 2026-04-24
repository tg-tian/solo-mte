import {
    BaseControlProperty,
    useDeviceInfo,
    DeviceUtils,
    BasicTypeRefer,
    ValueExpressUtils,
    type NodeData,
    type DeviceModel,
    type Parameter,
    type FvComboListData,
    type ValueExpress,
} from '@farris/flow-devkit';

export class NodeProperty extends BaseControlProperty {

    public getPropertyConfig(nodeData: NodeData) {
        const self = this;
        this.setupOutputParams(nodeData);
        const deviceModelId = nodeData.deviceModelId;
        const { deviceCategoriesWithAction } = useDeviceInfo();
        const deviceCategory: DeviceModel = deviceCategoriesWithAction.value.find((device: DeviceModel) => {
            return device.modelId === deviceModelId;
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
                        modelId: deviceModelId,
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
                if (changeObject?.propertyID === 'deviceId') {
                    self.updateDeviceIdInOutputParams(nodeData.deviceId, nodeData);
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
        this.propertyConfig.categories['outputParams'] = {
            title: '输出参数',
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

    private getDeviceIdValueExpress(deviceId?: string): ValueExpress | undefined {
        if (typeof deviceId === 'string' && deviceId) {
            return ValueExpressUtils.createStringConstExpr(deviceId);
        } else {
            return undefined;
        }
    }

    private setupOutputParams(nodeData: NodeData): void {
        if (Array.isArray(nodeData.outputParams) && nodeData.outputParams.length === 1) {
            return;
        }
        const DEVICE_ID_PARAM_CODE = 'deviceId';
        nodeData.outputParams = [{
            id: DEVICE_ID_PARAM_CODE,
            code: DEVICE_ID_PARAM_CODE,
            type: BasicTypeRefer.StringType,
            valueExpr: this.getDeviceIdValueExpress(nodeData.deviceId),
        }];
    }

    private updateDeviceIdInOutputParams(newDeviceId: string, nodeData: NodeData): void {
        const newValueExpr = this.getDeviceIdValueExpress(newDeviceId);
        nodeData.outputParams[0].valueExpr = newValueExpr;
    }
}

export interface PropertyDefinition {
    type: "string" | "number" | "boolean" | "enum" | "object" | "array";
    unit?: string;
    readOnly?: boolean;
    min?: number;
    max?: number;
    enumValues?: string[];
    description?: string;
}

export interface ActionDefinition {
    arguments: Record<string, PropertyDefinition>;
    description?: string;
}

export interface EventDefinition {
    fields: Record<string, PropertyDefinition>;
    outputs?: Record<string, PropertyDefinition>;
    level: "info" | "warning" | "error";
    description?: string;
}

export interface BaseDeviceModel {
    modelId: string;
    modelName: string;
    provider?: string;
    category: string;
    properties: Record<string, PropertyDefinition>;
    actions: Record<string, ActionDefinition>;
    events: Record<string, EventDefinition>;
    extensions?: {
        rawModel?: any;
        extraMeta?: any;
    }
}

export interface DeviceModel {
    id: number;
    modelName: string;
    provider?: string;
    category: string;
    createTime?: string;
    updateTime?: string;
    model: BaseDeviceModel;
    domainIds?: Array<number>;
}

export interface Device {
    id?: number;
    provider: string; // 设备厂商
    modelId: string; // 设备模型ID (对应 DeviceModel.modelId)
    deviceId: string; // 设备ID (唯一标识)
    deviceName?: string; // 设备名称
    deviceMapperPath?: string; // 设备Mapper路径
    propertyMap?: Record<string, string>; // 属性映射规则
    actionMap?: Record<string, string>; // 操作实现映射
    eventMap?: Record<string, string>; // 事件映射规则
    createTime?: string;
    updateTime?: string;
}

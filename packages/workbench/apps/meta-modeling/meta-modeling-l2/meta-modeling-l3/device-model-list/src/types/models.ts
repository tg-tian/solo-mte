//设备类型
export interface DeviceModel {
    id: number;
    modelName: string;
    provider?: string;
    category: string;
    createTime?: string;
    updateTime?: string;
    model: BaseDeviceModel;
}

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

import type { Parameter } from './flow-metadata';

/** 参数类型 */
export type DeviceParameterType = 'string' | 'number' | 'boolean' | 'enum' | 'object' | 'array';

/** 设备事件级别 */
export type DeviceEventLevel = 'info' | 'error';

/** 参数 */
export interface DeviceParameter {
    type: DeviceParameterType;
    unit?: string;
    min?: number;
    max?: number;
    enumValues?: any[];
    description?: string;
}

/** 设备操作 */
export interface DeviceAction {
    arguments: Record<string, DeviceParameter>;
    description?: string;
}

/** 设备事件 */
export interface DeviceEvent {
    fields: Record<string, DeviceParameter>;
    level: DeviceEventLevel;
    description?: string;
}

/** 设备类型 */
export interface DeviceCategory {
    category: string;
    modelName: string;
    icon?: string;
    actions: Record<string, DeviceAction>;
    events: Record<string, DeviceEvent>;
}

/** 设备实例 */
export interface DeviceInstance {
    deviceId: string;
    deviceName: string;
}

/** 设备调用节点 */
export interface DeviceCallNode {
    /** 节点类型，与设备元模型中的`category`字段对应 */
    kind: string;

    /** 指定设备的ID */
    deviceId: string;
    /** 要执行的设备操作 */
    deviceAction: string;
    /** 调用操作需要传递的参数 */
    inputParams: Parameter[];
}

/** 设备事件监听节点 */
export interface DeviceEventListenNode {
    /** 节点类型 */
    kind: 'deviceEventListen';

    /** 设备类型，与设备元模型中的`category`字段对应 */
    deviceCategory: string;
    /** 设备事件名 */
    deviceEvent: string;
    /** 事件参数 */
    outputParams: Parameter[];
}

export interface Domain {
    id: number;
    domainName: string;
    description: string;
    createTime: string;
    updateTime: string;
    sceneCount: number;
    status: '1' | '0';
}

// 模板
export interface Template {
    id: number;
    template_id?: number;
    name: string;
    category: string;
    description: string;
    tags: string;//模板标签
    domain: string;//业务标签
    image_url: string;
    describing_the_model: string;//DSL/平台
    url: string;
}

export interface Scene {
    id: number;
    domainId: number;
    name: string;
    description: string;
    createTime: string;
    updateTime: string;
    deviceCount: number;
    status: '1' | '0';
    url: string;
    imageUrl?: string;
    location?: {
        lng: number; // longitude
        lat: number; // latitude
    };
}

// 设备
export interface Device {
    id: number;
    deviceCode: string;
    deviceName: string;
    deviceTypeId: number;
    deviceType?: DeviceType;//获取设备时会返回
    sceneId: number;
    scene?: Scene;//获取设备时会返回
    status: number;//0-离线，1-在线，2-未激活，初始默认未激活
    protocolType: string;// MQTT/HTTP
    protocolConfig: ProtocolConfig;// 协议连接配置参数
    createTime: string;
    updateTime: string;
    lastOnlineTime: string;
    deviceLocation: string;
}

export interface ProtocolConfig {
    type: string;// 连接的物联网平台：none/aliyun/inspur
    configs: Record<string, string>
}

//设备类型
export interface DeviceType {
    id: number;
    modelName: string;
    provider?: string;
    category: string;
    createTime?: string;
    updateTime?: string;
    model: BaseDeviceModel;
    domainIds?: Array<number>;
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
    outputs?: Record<string, PropertyDefinition>;
    level: "info" | "warning" | "error";
    description?: string;
}

export interface BaseDeviceModel {
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

export interface User {
    id: number;
    username: string;
    displayName: string;
    role: string;
    avatar?: string;
    email?: string;
}

// Component types
export enum ComponentType {
    Node = 'node',
    Edge = 'edge'
}

// Purpose types
export enum PurposeType {
    BusinessFlow = 'businessFlow',
    InterfaceFlow = 'interfaceFlow',
    DeviceLogic = 'deviceLogic'
}

// Constraint interface
export interface Constraint {
    quantity: number;
    type: string;
}

// Input parameter interface
export interface InputParam {
    name: string;
    type: string;
}

// Component interface
export interface Component {
    id?: number;
    code: string;
    name: string;
    description: string;
    type: string; // 'start', 'end', 'process', 'condition', 'device'
    purpose: PurposeType; // 'businessFlow', 'interfaceFlow', or 'deviceLogic'
    createTime?: string;
    updateTime?: string;
    // 入口参数列表
    inputs?: InputParam[];
    // 出口参数列表
    outputs?: Array<{ type: string }>;
    // 出口类型 (旧字段，向后兼容)
    outputType?: string;
    // 属性定义
    properties?: Record<string, PropertyDefinition>;
    // 旧字段保留向后兼容 (可选)
    inputConstraint?: Constraint;
    outputConstraint?: Constraint;
    startConstraint?: Constraint;
    endConstraint?: Constraint;
}

// area interface
export interface Area {
    id: number;
    name: string;
    image: string | null;
    description: string;
    position: string;
    parentId: number; // 父区域ID
    children: Area[]; // 子区域列表
}

export interface Connection {
    id: number; //连接设备id
    name: string; //连接设备名称
    position: string; //连接位置
}

export interface DeviceConnection {
    id: number;
    deviceCode: string;
    name: string;
    deviceTypeId: number;
    deviceType: DeviceType;//获取设备时会返回
    sceneId: number;
    scene?: Scene;//获取设备时会返回
    status: number;//0-离线，1-在线，2-未激活，初始默认未激活
    protocolType: string;// MQTT/HTTP
    protocolConfig: ProtocolConfig;// 协议连接配置参数
    createTime: string;
    updateTime: string;
    lastOnlineTime: string;
    deviceLocation: string;
    connections: Connection[]; // 连接设备列表
    intelligent: boolean; // 是否智能设备
}

export interface DeviceLibrary {
    id?: number;
    provider: string; // 设备厂商
    deviceTypeId?: number; // 设备类型ID
    deviceTypeName: string; // 设备类型名称
    deviceModel: string; // 设备型号
    deviceName?: string; // 设备名称
    deviceMapperPath?: string; // 设备Mapper路径
    propertyMap?: Record<string, string>; // 属性映射规则
    actionMap?: Record<string, string>; // 操作实现映射
    createTime?: string;
    updateTime?: string;
}

// 保持向前兼容，如果 UI 仍然称其为 DeviceModel
export type DeviceModel = DeviceLibrary;

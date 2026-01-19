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
    code: string;
    name: string;
    description: string;
    createTime: string;
    updateTime: string;
    domainIds?: Array<number>,
    model: Model
}

//设备型号
export interface DeviceModel {
    id: number;
    code: string;
    name: string;
    deviceTypeId: number;
    deviceType?: DeviceType; //获取设备型号时会返回
    mapper: Record<string, any>; // mapper配置
    description: string;
    createTime: string;
    updateTime: string;
}

export interface Model {
    properties: Array<Property>
    services: Array<Service>
    events: Array<Event>
}

export interface Property {
    identify: string;//属性标识符
    name: string;//属性名称
    accessMode?: string;//属性读写类型
    dataType: DataType;//属性数据类型
}

export interface DataType {
    type: string;//类型：int\float\bool\string
    specs: Record<string, any>;//对象，int&float类型包括min\max\step属性，bool类型包括0\1，string类型包括length
}

export interface Service {
    identify: string;//服务标识符
    name: string;//服务名称
    inputData: Array<Property>;//输入参数
    outputData: Array<Property>;//输出参数
}

export interface Event {
    identify: string;//事件标识符
    name: string;//事件名称
    type: string;//事件类型：信息info、告警warning、故障error
    outputData: Array<Property>;//输出参数，指事件的返回值类型
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

// Component interface
export interface Component {
  id?: number;
  code: string;
  name: string;
  description: string;
  type: ComponentType; // 'node' or 'edge'
  purpose: PurposeType; // 'businessFlow', 'interfaceFlow', or 'deviceLogic'
  createTime?: string;
  updateTime?: string;
  // For Node type
  inputConstraint: Constraint;
  outputConstraint: Constraint;
  // For Edge type
  startConstraint: Constraint;
  endConstraint: Constraint;
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
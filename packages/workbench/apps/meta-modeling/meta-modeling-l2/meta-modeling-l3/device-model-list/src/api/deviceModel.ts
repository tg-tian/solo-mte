import request from '../utils/request'
import { DeviceModel } from '../types/models'

// 实际环境下的API接口
// 根据DeviceModelController调整接口URL
export function getDeviceModels(domainId?: number) {
    return request({
        url: '/meta/device-models', // 改为 device-models
        method: 'get',
        params: { domainId }
    })
}

export function getDeviceModelPage(params: {
    current: number;
    size: number;
    modelName?: string;
    type?: string;
}) {
    return request({
        url: '/meta/device-models/page', // 改为 device-models
        method: 'get',
        params
    })
}

export function getDeviceModelById(id: number) {
    return request({
        url: `/meta/device-models/${id}`, // 改为 device-models
        method: 'get'
    })
}

// 确保创建设备类型接口与文档一�?
export function createDeviceModel(data: any) {
    return request({
        url: '/meta/device-models', // 改为 device-models
        method: 'post',
        data
    })
}

// 添加更新设备类型接口
export function updateDeviceModel(id: number, data: any) {
    return request({
        url: `/meta/device-models/${id}`, // 改为 device-models
        method: 'put',
        data
    })
}

export function deleteDeviceModel(id: number) {
    return request({
        url: `/meta/device-models/${id}`, // 改为 device-models
        method: 'delete'
    })
}

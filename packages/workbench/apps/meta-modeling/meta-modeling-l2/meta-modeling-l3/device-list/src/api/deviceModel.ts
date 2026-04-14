import request from '../utils/request'
import { DeviceModel } from '../types/models'

// 实际环境下的API接口
export function getDeviceModels(deviceTypeId?: number) {
    return request({
        url: '/meta/device-models',
        method: 'get',
        params: { deviceTypeId }
    })
}

export function getDeviceModelById(id: number) {
    return request({
        url: `/meta/device-models/${id}`,
        method: 'get'
    })
}

export function createDeviceModel(data: any) {
    return request({
        url: '/meta/device-models',
        method: 'post',
        data
    })
}

export function updateDeviceModel(id: number, data: any) {
    return request({
        url: `/meta/device-models/${id}`,
        method: 'put',
        data
    })
}

export function deleteDeviceModel(id: number) {
    return request({
        url: `/meta/device-models/${id}`,
        method: 'delete'
    })
}

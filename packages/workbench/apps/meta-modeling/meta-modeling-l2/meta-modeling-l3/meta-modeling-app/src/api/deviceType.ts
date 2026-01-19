import request from '@/utils/request'
import { mockDeviceTypes } from './mock'
import { DeviceType } from '@/types/models'

// 实际环境下的API接口
export function getDeviceTypes(domainId?: number) {
    return request({
        url: '/devicetypes',
        method: 'get',
        params: { domainId }
    })
}

export function getDeviceTypeById(id: number) {
    return request({
        url: `/devicetypes/${id}`,
        method: 'get'
    })
}

// 确保创建设备类型接口与文档一致
export function createDeviceType(data: any) {
    return request({
        url: '/devicetypes',
        method: 'post',
        data
    })
}

// 添加更新设备类型接口
export function updateDeviceType(id: number, data: any) {
    return request({
        url: `/devicetypes/${id}`,
        method: 'put',
        data
    })
}

// 确保更新设备类型模型接口与文档一致
export function updateDeviceTypeModel(id: number, model: any) {
    return request({
        url: `/devicetypes/model`,
        method: 'post',
        data: {
            deviceTypeId: id,
            model: model
        }
    })
}

export function deleteDeviceType(id: number) {
    return request({
        url: `/devicetypes/${id}`,
        method: 'delete'
    })
}

export function bindingDeviceType(domainId: number, deviceTypeId: number) {
    return request({
        url: `/domain/devicetype/binding`,
        method: 'post',
        data: {
            domainId: domainId,
            deviceTypeId: deviceTypeId
        }
    })
}

export function unbindingDeviceType(domainId: number, deviceTypeId: number) {
    return request({
        url: `/domain/devicetype/unbinding`,
        method: 'post',
        data: {
            domainId: domainId,
            deviceTypeId: deviceTypeId
        }
    })
}

// Mock API functions
export function getMockDeviceTypes(domainId?: number) {
    return new Promise((resolve) => {
        setTimeout(() => {
            let data = [...mockDeviceTypes]
            if (domainId) {
                data = data.filter(d => d.domainIds && d.domainIds.includes(domainId))
            }
            resolve({
                status: 200,
                data
            })
        }, 300)
    })
}

export function getMockDeviceTypeById(id: number) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const deviceType = mockDeviceTypes.find(d => d.id === id)
            resolve({
                status: 200,
                data: deviceType
            })
        }, 300)
    })
}

export function createMockDeviceType(data: any) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const newDeviceType: DeviceType = {
                id: mockDeviceTypes.length + 1,
                ...data,
                createTime: new Date().toISOString().split('.')[0].replace('T', ' ')
            }
            mockDeviceTypes.push(newDeviceType)
            resolve({
                status: 200,
                data: newDeviceType
            })
        }, 300)
    })
}

export function updateMockDeviceType(id: number, data: any) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const index = mockDeviceTypes.findIndex(d => d.id === id)
            if (index !== -1) {
                mockDeviceTypes[index] = {
                    ...mockDeviceTypes[index],
                    ...data
                }
                resolve({
                    status: 200,
                    data: mockDeviceTypes[index]
                })
            } else {
                resolve({
                    status: 404,
                    data: 'Device not found'
                })
            }
        }, 300)
    })
}

export function deleteMockDeviceType(id: number) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const index = mockDeviceTypes.findIndex(d => d.id === id)
            if (index !== -1) {
                mockDeviceTypes.splice(index, 1)
                resolve({
                    status: 200,
                    data: null
                })
            } else {
                resolve({
                    status: 404,
                    data: 'Device not found'
                })
            }
        }, 300)
    })
}

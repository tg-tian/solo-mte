import request from '../utils/request'
import { mockDevices } from './mock'

// 实际环境下的API接口
export function getDevices(sceneId?: number) {
    return request({
        url: '/devices',
        method: 'get',
        params: { sceneId }
    })
}

export function getDeviceById(id: number) {
    return request({
        url: `/devices/${id}`,
        method: 'get'
    })
}

export function createDevice(data: any) {
    return request({
        url: '/devices',
        method: 'post',
        data
    })
}

export function updateDevice(id: number, data: any) {
    return request({
        url: `/devices/${id}`,
        method: 'put',
        data
    })
}

export function deleteDevice(id: number) {
    return request({
        url: `/devices/${id}`,
        method: 'delete'
    })
}

export function getDeviceConnections(sceneId?: number) {
    return request({
        url: '/devices/connections',
        method: 'get',
        params: { sceneId }
    })
}   

export function deleteDeviceConnection(sourceId?: number,targetId?: number) {
    return request({
        url: '/devices/delete-connection',
        method: 'delete',
        params: { sourceId, targetId }
    })
}   

export function addDeviceConnection(sourceId?: number,targetId?: number,position?: string) {
    return request({
        url: '/devices/add-connection',
        method: 'post',
        params: { sourceId, targetId , position }
    })
}   


// Mock API functions
export function getMockDevices(sceneId?: number) {
    return new Promise((resolve) => {
        setTimeout(() => {
            let data = [...mockDevices]
            if (sceneId) {
                data = data.filter(d => d.sceneId === sceneId)
            }
            resolve({
                data: {
                    code: 200,
                    message: 'success',
                    data
                }
            })
        }, 300)
    })
}

export function getMockDeviceById(id: number) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const device = mockDevices.find(d => d.id === id)
            resolve({
                data: {
                    code: 200,
                    message: 'success',
                    data: device
                }
            })
        }, 300)
    })
}

export function createMockDevice(data: any) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const newDevice = {
                id: mockDevices.length + 1,
                ...data,
                lastUpdated: new Date().toISOString().split('.')[0].replace('T', ' '),
                status: 'online'
            }
            mockDevices.push(newDevice)
            resolve({
                data: {
                    code: 200,
                    message: 'success',
                    data: newDevice
                }
            })
        }, 300)
    })
}

export function updateMockDevice(id: number, data: any) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const index = mockDevices.findIndex(d => d.id === id)
            if (index !== -1) {
                mockDevices[index] = {
                    ...mockDevices[index],
                    ...data,
                    lastUpdated: new Date().toISOString().split('.')[0].replace('T', ' ')
                }
                resolve({
                    data: {
                        code: 200,
                        message: 'success',
                        data: mockDevices[index]
                    }
                })
            } else {
                resolve({
                    data: {
                        code: 404,
                        message: 'Device not found',
                        data: null
                    }
                })
            }
        }, 300)
    })
}

export function deleteMockDevice(id: number) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const index = mockDevices.findIndex(d => d.id === id)
            if (index !== -1) {
                mockDevices.splice(index, 1)
                resolve({
                    data: {
                        code: 200,
                        message: 'success',
                        data: null
                    }
                })
            } else {
                resolve({
                    data: {
                        code: 404,
                        message: 'Device not found',
                        data: null
                    }
                })
            }
        }, 300)
    })
}

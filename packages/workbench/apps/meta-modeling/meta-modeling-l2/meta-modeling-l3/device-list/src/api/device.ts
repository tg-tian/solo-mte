import request from '../utils/request'

export function getDevicePage(params: any) {
    return request({
        url: '/device/page',
        method: 'get',
        params
    })
}

export function getDeviceList() {
    return request({
        url: '/device/list',
        method: 'get'
    })
}

export function getDeviceById(id: number) {
    return request({
        url: `/device/${id}`,
        method: 'get'
    })
}

export function saveDevice(data: any) {
    return request({
        url: '/device',
        method: 'post',
        data
    })
}

export function updateDevice(data: any) {
    return request({
        url: '/device',
        method: 'put',
        data
    })
}

export function deleteDevice(id: number) {
    return request({
        url: `/device/${id}`,
        method: 'delete'
    })
}

export function getMapperContent(params: any) {
    return request({
        url: '/device/mapper',
        method: 'get',
        params
    })
}

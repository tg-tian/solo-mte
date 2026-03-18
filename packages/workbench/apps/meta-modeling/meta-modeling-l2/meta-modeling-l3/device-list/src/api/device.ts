import request from '../utils/request'

export function getDevicePage(params: any) {
    return request({
        url: '/device-library/page',
        method: 'get',
        params
    })
}

export function getDeviceList() {
    return request({
        url: '/device-library/list',
        method: 'get'
    })
}

export function getDeviceById(id: number) {
    return request({
        url: `/device-library/${id}`,
        method: 'get'
    })
}

export function saveDevice(data: any) {
    return request({
        url: '/device-library',
        method: 'post',
        data
    })
}

export function updateDevice(data: any) {
    return request({
        url: '/device-library',
        method: 'put',
        data
    })
}

export function deleteDevice(id: number) {
    return request({
        url: `/device-library/${id}`,
        method: 'delete'
    })
}

export function getMapperContent(params: any) {
    return request({
        url: '/device-library/mapper',
        method: 'get',
        params
    })
}

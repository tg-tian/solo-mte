import request from '@/utils/request'
import { DeviceLibrary } from '@/types/models'

export function getDeviceLibraryPage(params: {
    current: number;
    size: number;
    provider?: string;
    deviceTypeName?: string;
}) {
    return request({
        url: '/device-library/page',
        method: 'get',
        params
    })
}

export function getDeviceLibraryList() {
    return request({
        url: '/device-library/list',
        method: 'get'
    })
}

export function getDeviceLibraryById(id: number) {
    return request({
        url: `/device-library/${id}`,
        method: 'get'
    })
}

export function saveDeviceLibrary(data: DeviceLibrary) {
    return request({
        url: '/device-library',
        method: 'post',
        data
    })
}

export function updateDeviceLibrary(data: DeviceLibrary) {
    return request({
        url: '/device-library',
        method: 'put',
        data
    })
}

export function deleteDeviceLibrary(id: number) {
    return request({
        url: `/device-library/${id}`,
        method: 'delete'
    })
}

export function getMapperContent(params: {
    provider: string;
    deviceTypeName: string;
    deviceModel: string;
}) {
    return request({
        url: '/device-library/mapper',
        method: 'get',
        params
    })
}

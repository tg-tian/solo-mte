import { Area } from '@/types/models';
import request from '@/utils/request';

// 实际环境下的API接口

// 获取区域列表
export function getAreas(sceneId?: number) {
    return request({
        url: '/areas',
        method: 'get',
        params: { sceneId }
    });
}

// 根据 ID 获取区域详情
export function getAreaById(id: number) {
    return request({
        url: `/areas/${id}`,
        method: 'get'
    });
}

// 创建区域
export function createArea(data: any) {
    return request({
        url: '/areas',
        method: 'post',
        data
    });
}

// 更新区域
export function updateArea(id: number, data: any) {
    return request({
        url: `/areas/${id}`,
        method: 'put',
        data
    });
}

// 删除区域
export function deleteArea(id: number) {
    return request({
        url: `/areas/${id}`,
        method: 'delete'
    });
}

export function addChildren(parentId: number, childIds: number[]) {
    return request({
        url: `/areas/addChildren`,
        method: 'put',
        params: { parentId },
        data: childIds, 
    });
}

export function buildAreaTree(id: number, areaId: number) {
    return request({
        url: `/areas/buildAreaTree/${id}`,
        method: 'get',
        params: { areaId },
    });
}

export function deleteParent(id: number) {
    return request({
        url: `/areas/deleteParent/${id}`,
        method: 'put',
    });
}
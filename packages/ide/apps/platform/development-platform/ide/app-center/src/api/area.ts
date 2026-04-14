import request from '../utils/request'
import type { Area } from '../types/scene'

export function getAreas(sceneId?: number) {
  return request({
    url: '/areas',
    method: 'get',
    params: { sceneId },
  })
}

export function createArea(data: Partial<Area> & { sceneId: number }) {
  return request({
    url: '/areas',
    method: 'post',
    data,
  })
}

export function updateArea(id: number, data: Partial<Area> & { sceneId?: number }) {
  return request({
    url: `/areas/${id}`,
    method: 'put',
    data,
  })
}

export function deleteArea(id: number) {
  return request({
    url: `/areas/${id}`,
    method: 'delete',
  })
}

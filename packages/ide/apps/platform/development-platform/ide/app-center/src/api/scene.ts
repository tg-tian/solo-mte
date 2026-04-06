import request from '../utils/request'

export function getScenes(domainId?: number) {
  return request({
    url: '/scenes',
    method: 'get',
    params: { domainId },
  })
}

export function getSceneById(id: number) {
  return request({
    url: `/scenes/${id}`,
    method: 'get',
  })
}

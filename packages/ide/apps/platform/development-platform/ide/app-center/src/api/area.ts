import request from '../utils/request'

export function getAreas(sceneId?: number) {
  return request({
    url: '/areas',
    method: 'get',
    params: { sceneId },
  })
}

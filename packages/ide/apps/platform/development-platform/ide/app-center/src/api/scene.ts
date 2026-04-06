import request from '../utils/request'

export function getSceneById(id: number) {
  return request({
    url: `/scenes/${id}`,
    method: 'get',
  })
}

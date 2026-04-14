import request from '../utils/request'
import { Component as ComponentModel } from '../types/models'

export const getComponents = (domainId?: number) => {
  return request({
    url: '/components',
    method: 'get',
    params: { domainId }
  })
}

export const getComponentById = (id: number) => {
  return request({
    url: `/components/${id}`,
    method: 'get'
  })
}

export const createComponent = (component: ComponentModel) => {
  return request({
    url: '/components',
    method: 'post',
    data: component
  })
}

export const updateComponent = (id: number, component: ComponentModel) => {
  return request({
    url: `/components/${id}`,
    method: 'put',
    data: component
  })
}

export const deleteComponent = (id: number) => {
  return request({
    url: `/components/${id}`,
    method: 'delete'
  })
}

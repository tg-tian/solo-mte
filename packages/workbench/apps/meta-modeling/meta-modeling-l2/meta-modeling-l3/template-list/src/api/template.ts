import request from '../utils/request'
import { Template as TemplateModel } from '../types/models'

export const getTemplates = () => {
  return request({
    url: '/templates',
    method: 'get'
  })
}

export const getTemplateById = (id: number) => {
  return request({
    url: `/templates/${id}`,
    method: 'get'
  })
}

export const createTemplate = (template: TemplateModel) => {
  return request({
    url: '/templates',
    method: 'post',
    data: template
  })
}

export const updateTemplate = (id: number, template: TemplateModel) => {
  return request({
    url: `/templates/${id}`,
    method: 'put',
    data: template
  })
}

export const deleteTemplate = (id: number) => {
  return request({
    url: `/templates/${id}`,
    method: 'delete'
  })
}

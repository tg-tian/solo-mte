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

export const updateTemplate = (templateId: number, template: TemplateModel) => {
  return request({
    url: `/templates/${templateId}`,
    method: 'put',
    data: template
  })
}

export const deleteTemplate = (templateId: number) => {
  return request({
    url: `/templates/${templateId}`,
    method: 'delete'
  })
}

/** 从外部模板库导入模板到本地 */
export const importTemplate = (externalTemplateId: number) => {
  return request({
    url: '/templates/import',
    method: 'post',
    data: { templateId: externalTemplateId }
  })
}

const EXTERNAL_API_BASE = 'https://lctemplates.gitlink.org.cn'

/** 搜索外部模板库（前端直调，不走后端代理） */
export async function searchExternalTemplates(params: {
  page?: number
  per?: number
  q_tag_fuzzy?: string
  schema?: string
}): Promise<{ data: TemplateModel[]; page_info: { total_count: number; total_pages: number } }> {
  const url = new URL('/templates', EXTERNAL_API_BASE)
  if (params.page) url.searchParams.set('page', String(params.page))
  if (params.per) url.searchParams.set('per', String(params.per))
  if (params.q_tag_fuzzy) url.searchParams.set('q[tag_fuzzy]', params.q_tag_fuzzy)
  if (params.schema) url.searchParams.set('schema', params.schema)

  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' }
  })
  if (!res.ok) throw new Error(`外部模板库请求失败: ${res.status}`)
  const json = await res.json()
  // 外部系统 id → template_id 映射
  if (json.data && Array.isArray(json.data)) {
    json.data = json.data.map((item: any) => ({
      ...item,
      template_id: item.id,
    }))
  }
  return json
}
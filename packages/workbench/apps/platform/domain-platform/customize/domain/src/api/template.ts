import request from '../utils/request';
import type { TemplateRecord } from '../types/models';

const EXTERNAL_API_BASE = (import.meta as any).env?.VITE_TEMPLATE_PATH || 'https://lctemplates.gitlink.org.cn';

/** 获取所有模板列表（从元建模后端） */
export function getTemplates(params?: Record<string, any>) {
  return request.get('/templates', { params });
}

/** 获取领域已绑定的模板列表 */
export function getDomainTemplates(domainCode: string) {
  return request.get('/templates/domain', { params: { domainCode } });
}

/** 领域绑定模板 */
export function bindingTemplates(domainCode: string, templateId: number) {
  return request.post('/templates/binding', {
    domainCode,
    templateId
  });
}

/** 领域取消绑定模板 */
export function unbindingTemplates(domainCode: string, templateId: number) {
  return request.post('/templates/unbinding', {
    domainCode,
    templateId
  });
}

/** 领域模板库保存模板 */
export function saveTemplate(data: Record<string, any>) {
  return request.post('/templates', data);
}

/** 领域模板库更新模板 */
export function updateTemplate(templateId: number, data: Record<string, any>) {
  return request.put(`/templates/${templateId}`, data);
}

/** 从外部模板库导入模板到本地模板表 */
export function importTemplate(externalTemplateId: number) {
  return request.post('/templates/import', { templateId: externalTemplateId });
}

/** 搜索外部模板库（前端直调，不走后端代理） */
export async function searchExternalTemplates(params: {
  page?: number;
  per?: number;
  q_tag_fuzzy?: string;
  schema?: string;
}): Promise<{ data: TemplateRecord[]; page_info: { total_count: number; total_pages: number } }> {
  const url = new URL('/templates', EXTERNAL_API_BASE);
  if (params.page) url.searchParams.set('page', String(params.page));
  if (params.per) url.searchParams.set('per', String(params.per));
  if (params.q_tag_fuzzy) url.searchParams.set('q[tag_fuzzy]', params.q_tag_fuzzy);
  if (params.schema) url.searchParams.set('schema', params.schema);

  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`外部模板库请求失败: ${res.status}`);
  const json = await res.json();
  if (json.data && Array.isArray(json.data)) {
    json.data = json.data.map((item: any) => ({ ...item, template_id: item.id }));
  }
  return json;
}

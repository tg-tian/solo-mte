import request from '../utils/request';

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
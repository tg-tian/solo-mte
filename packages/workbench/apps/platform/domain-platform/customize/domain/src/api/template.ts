import request from '../utils/request';
import type { TemplateRecord } from '../types/models';

const templateApiBase = (import.meta as any).env?.VITE_TEMPLATE_API_BASE || `${window.location.origin}/templates.json`;

export function getTemplates(query: Record<string, any>, page: number) {
  return request.get(templateApiBase, {
    params: {
      page,
      query
    }
  });
}

export function getDomainTemplates(domainId: number) {
  return request.get('/templates/domain', { params: { domainId } });
}

export function bindingTemplates(domainId: number, templateId: number) {
  return request.post('/templates/binding', {
    domainId,
    templateId
  });
}

export function unbindingTemplates(domainId: number, templateId: number) {
  return request.post('/templates/unbinding', {
    domainId,
    templateId
  });
}

export function saveTemplate(data: Record<string, any>) {
  return request.post(templateApiBase, data);
}

export function updateTemplate(id: number, data: Record<string, any>) {
  return request.put(`${templateApiBase.replace(/\.json$/, '')}/${id}.json`, data);
}

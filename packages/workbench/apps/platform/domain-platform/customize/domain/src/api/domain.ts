import request from '../utils/request';
import type { DomainFormData, DomainRecord } from '../types/models';

const domainSourceUri = '/domains';

export interface CreateDomainPayload {
  code: string;
  name: string;
  description: string;
  status?: '0' | '1';
}

export interface PublishDomainPayload {
  domainId: number;
  status: '0' | '1';
  url?: string;
  dslData?: Record<string, any>;
}

export interface UpdateDomainPayload {
  code: string;
  name: string;
  description: string;
  status: '0' | '1';
  url?: string;
  codeEditor?: string;
  modelEditor?: string;
  baseFramework?: string;
  dslStandard?: string;
}

const statusMap: Record<string, string> = {
  '0': '0',
  '1': '1',
  '2': '0',
  testing: '0',
  published: '1',
  editing: '0',
  developing: '0',
  development: '0'
};

export function normalizeDomain(domain: Record<string, any>): DomainRecord {
  const rawStatus = `${domain.status ?? ''}`.trim().toLowerCase();
  const status = rawStatus in statusMap ? statusMap[rawStatus] : '0';
  return {
    domainId: `${domain.domainId ?? domain.id ?? ''}`,
    domainName: domain.domainName ?? domain.title ?? '',
    domainCode: domain.domainCode ?? domain.code ?? domain.path ?? '',
    domainDescription: domain.domainDescription ?? domain.description ?? '',
    status,
    url: domain.url ?? '',
    codeEditor: domain.codeEditor ?? 'Monaco Editor',
    modelEditor: domain.modelEditor ?? 'GoJS / G6',
    framework: domain.framework ?? domain.baseFramework ?? 'springboot',
    dsl: domain.dsl ?? domain.dslStandard ?? 'default',
    domainTemplateId: domain.domainTemplateId ?? null
  };
}

function toCreatePayload(data: DomainFormData | UpdateDomainPayload) {
  return {
    code: data.code,
    name: data.name,
    description: data.description,
    status: data.status,
    codeEditor: data.codeEditor,
    modelEditor: data.modelEditor,
    baseFramework: data.baseFramework,
    dslStandard: data.dslStandard,
    url: data.url
  };
}

export async function getDomainList() {
  try {
    const response = await request.get(domainSourceUri);
    const responseData = response.data;
    const source = Array.isArray(responseData)
      ? responseData
      : Array.isArray(responseData?.data)
        ? responseData.data
        : [];
    return source.map((item: Record<string, any>) => normalizeDomain(item));
  } catch (error) {
    return [];
  }
}

export function getDomainById(domainId: number) {
  return request.get(`${domainSourceUri}/${domainId}`);
}

export async function createDomain(payload: DomainFormData | CreateDomainPayload) {
  const data = 'codeEditor' in payload ? toCreatePayload(payload) : payload;
  return request.post(domainSourceUri, data);
}

export async function publishDomain(domainId: number) {
  return request.post(`${domainSourceUri}/publish`, domainId, {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function updateDomain(domainId: string | number, payload: DomainFormData | UpdateDomainPayload) {
  const data = 'codeEditor' in payload
    ? toCreatePayload(payload)
    : payload;
  return request.put(`${domainSourceUri}/${domainId}`, data);
}

export async function createDomainFromTemplate(
  domainData: DomainFormData,
  templates: any[],
  deviceModels: any[],
  components: any[]
) {
  return request.post(`${domainSourceUri}/from-template`, {
    domainData: toCreatePayload(domainData),
    templates,
    deviceTypes: deviceModels,
    components
  });
}

export async function saveDomainTemplateId(domainId: number, templateId: number) {
  return request.post(`${domainSourceUri}/templateId`, {
    domainId,
    templateId
  });
}

export async function downloadDomain(domainId: number) {
  return request.get(`${domainSourceUri}/download/${domainId}`, { responseType: 'blob' });
}

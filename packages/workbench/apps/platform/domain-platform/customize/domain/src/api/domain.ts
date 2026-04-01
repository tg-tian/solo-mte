import request from '../utils/request';
import localDomains from '../assets/domains.json';
import type { DomainRecord } from '../types/models';

const domainSourceUri = 'http://139.196.147.52:8080/domains';

export interface CreateDomainPayload {
  code: string;
  name: string;
  description: string;
  status?: '0' | '1';
}

export interface PublishDomainPayload {
  domainId: string;
  status: '0' | '1';
  url?: string;
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

function normalizeDomain(domain: Record<string, any>): DomainRecord {
  const rawStatus = `${domain.status ?? ''}`.trim().toLowerCase();
  const status = rawStatus in statusMap ? statusMap[rawStatus] : '0';
  return {
    domainId: `${domain.domainId ?? domain.id ?? ''}`,
    domainName: domain.domainName ?? domain.title ?? '',
    domainCode: domain.domainCode ?? domain.code ?? domain.path ?? '',
    domainDescription: domain.domainDescription ?? domain.description ?? '',
    status,
    url: domain.url
  };
}

function getLocalDomains(): DomainRecord[] {
  return (localDomains as Record<string, any>[]).map((item) => normalizeDomain(item));
}

export async function getDomainList() {
  try {
    const response = await request.get(domainSourceUri);
    const source = Array.isArray(response.data) && response.data.length > 0 ? response.data : getLocalDomains();
    return source.map((item: Record<string, any>) => normalizeDomain(item));
  } catch (error) {
    return getLocalDomains();
  }
}

export async function createDomain(payload: CreateDomainPayload) {
  return request.post(domainSourceUri, payload);
}

export async function publishDomain(payload: PublishDomainPayload) {
  return request.post(`${domainSourceUri}/publish`, payload);
}

export async function updateDomain(domainId: string, payload: UpdateDomainPayload) {
  return request.put(`${domainSourceUri}/${domainId}`, payload);
}

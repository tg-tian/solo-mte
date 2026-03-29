import request from '../utils/request';
import localDomains from '../assets/domains.json';
import type { DomainRecord } from '../types/models';

const domainSourceUri = 'http://139.196.147.52:8080/domains';

const statusMap: Record<string, string> = {
  testing: '0',
  published: '1',
  editing: '2'
};

function normalizeDomain(domain: Record<string, any>): DomainRecord {
  const status = domain.status in statusMap ? statusMap[domain.status] : `${domain.status ?? '2'}`;
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

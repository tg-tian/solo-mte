import { defineStore } from 'pinia';
import { createDomain, createDomainFromTemplate, getDomainById, getDomainList, normalizeDomain, publishDomain, updateDomain } from '../api/domain';
import type { DomainFormData, DomainRecord } from '../types/models';

export const useDomainStore = defineStore('domain', {
  state: () => ({
    domains: [] as DomainRecord[],
    loading: false,
    currentDomain: null as DomainRecord | null
  }),
  actions: {
    async fetchDomains() {
      this.loading = true;
      try {
        this.domains = await getDomainList();
      } finally {
        this.loading = false;
      }
    },
    async fetchDomainById(domainId: number) {
      this.loading = true;
      try {
        const res = await getDomainById(domainId);
        if (res.status === 200) {
          this.currentDomain = normalizeDomain(res.data || {});
        }
        return this.currentDomain;
      } finally {
        this.loading = false;
      }
    },
    async createDomain(data: DomainFormData) {
      const res = await createDomain(data);
      if (res.status === 200) {
        await this.fetchDomains();
      }
      return res.data;
    },
    async createDomainFromTemplate(data: DomainFormData, templates: any[], deviceModels: any[], components: any[]) {
      const res = await createDomainFromTemplate(data, templates, deviceModels, components);
      if (res.status === 200) {
        await this.fetchDomains();
      }
      return res.data;
    },
    async updateDomain(domainId: number, data: DomainFormData) {
      const res = await updateDomain(domainId, data);
      if (res.status === 200) {
        await this.fetchDomains();
      }
      return res.data;
    },
    async publishDomain(domainId: number) {
      const res = await publishDomain(domainId);
      if (res.status === 200) {
        await this.fetchDomains();
      }
      return res.data;
    },
    setCurrentDomain(domain: DomainRecord | null) {
      this.currentDomain = domain;
    }
  },
  persist: true
});

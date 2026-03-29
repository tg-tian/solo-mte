import { defineStore } from 'pinia';
import { getDomainList } from '../api/domain';
import type { DomainRecord } from '../types/models';

export const useDomainStore = defineStore('domain', {
  state: () => ({
    domains: [] as DomainRecord[],
    loading: false
  }),
  actions: {
    async fetchDomains() {
      this.loading = true;
      try {
        this.domains = await getDomainList();
      } finally {
        this.loading = false;
      }
    }
  },
  persist: true
});

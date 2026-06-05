import { defineStore } from 'pinia';
import { bindingTemplates, getDomainTemplates, getTemplates, unbindingTemplates } from '../api/template';
import type { TemplateRecord } from '../types/models';

export const useDomainComponentTemplateStore = defineStore('domainComponentTemplate', {
  state: () => ({
    allTemplates: [] as TemplateRecord[],
    templates: [] as TemplateRecord[],
    loading: false,
    currentTemplate: {} as TemplateRecord,
    hasMore: true
  }),
  actions: {
    async fetchTemplates(domainCode: string) {
      if (!domainCode) {
        this.templates = [];
        return;
      }
      this.loading = true;
      try {
        const res = await getDomainTemplates(domainCode);
        if (res.status === 200) {
          this.templates = res.data;
        }
      } finally {
        this.loading = false;
      }
    },
    async fetchAllTemplates(params?: Record<string, any>) {
      this.loading = true;
      try {
        const res = await getTemplates(params);
        if (res.status === 200) {
          this.allTemplates = res.data || [];
          this.hasMore = false;
        }
      } finally {
        this.loading = false;
      }
    },
    async bindingTemplates(domainCode: string, templateIds: number[]) {
      this.loading = true;
      try {
        for (const templateId of templateIds) {
          await bindingTemplates(domainCode, templateId);
        }
        await this.fetchTemplates(domainCode);
        return true;
      } catch {
        return false;
      } finally {
        this.loading = false;
      }
    },
    async unbindingTemplates(domainCode: string, templateId: number) {
      const res = await unbindingTemplates(domainCode, templateId);
      if (res.status === 200) {
        await this.fetchTemplates(domainCode);
        return true;
      }
      return false;
    },
    setCurrentTemplate(template: TemplateRecord) {
      this.currentTemplate = template;
    },
    setTemplates(templates: TemplateRecord[]) {
      this.templates = templates;
    }
  },
  persist: true
});
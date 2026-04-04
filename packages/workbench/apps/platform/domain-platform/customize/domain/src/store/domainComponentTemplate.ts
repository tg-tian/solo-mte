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
    async fetchTemplates(domainId: number) {
      if (!domainId) {
        this.templates = [];
        return;
      }
      this.loading = true;
      try {
        const res = await getDomainTemplates(domainId);
        if (res.status === 200) {
          this.templates = res.data;
        }
      } finally {
        this.loading = false;
      }
    },
    async fetchAllTemplates(page: number, query?: Record<string, any>) {
      this.loading = true;
      try {
        const res = await getTemplates({
          name_or_category_or_description_or_domain_or_tags_or_code_key_word_string_cont:
            query?.name_or_category_or_description_or_domain_or_tags_or_code_key_word_string_cont || '',
          name_cont: query?.name_cont || '',
          category_cont: query?.category_cont || '',
          description_cont: query?.description_cont || '',
          domain_cont: query?.domain_cont || '',
          tags_cont: query?.tags_cont || '',
          code_key_word_string_cont: query?.code_key_word_string_cont || ''
        }, page);
        if (res.status === 200) {
          const rows = (res.data?.data || []).filter((item: TemplateRecord) => item.category !== '领域模板');
          this.allTemplates = page === 1 ? rows : [...this.allTemplates, ...rows];
          this.hasMore = rows.length > 0;
        }
      } finally {
        this.loading = false;
      }
    },
    async bindingTemplates(domainId: number, templateId: number) {
      this.loading = true;
      try {
        const res = await bindingTemplates(domainId, templateId);
        if (res.status === 200) {
          await this.fetchTemplates(domainId);
          return true;
        }
        return false;
      } finally {
        this.loading = false;
      }
    },
    async unbindingTemplates(domainId: number, templateId: number) {
      const res = await unbindingTemplates(domainId, templateId);
      if (res.status === 200) {
        await this.fetchTemplates(domainId);
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

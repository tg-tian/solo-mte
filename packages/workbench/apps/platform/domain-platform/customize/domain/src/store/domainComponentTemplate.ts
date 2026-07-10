import { defineStore } from 'pinia';
import {
  bindingTemplates,
  getDomainTemplates,
  getTemplates,
  importTemplate,
  searchExternalTemplates,
  unbindingTemplates
} from '../api/template';
import type { TemplateRecord } from '../types/models';

export const useDomainComponentTemplateStore = defineStore('domainComponentTemplate', {
  state: () => ({
    allTemplates: [] as TemplateRecord[],
    templates: [] as TemplateRecord[],
    externalTemplates: [] as TemplateRecord[],
    externalTotalPages: 0,
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
    async searchExternal(keyword: string, page = 1, per = 10) {
      this.loading = true;
      try {
        const result = await searchExternalTemplates({ q_tag_fuzzy: keyword, page, per });
        this.externalTemplates = result.data || [];
        this.externalTotalPages = result.page_info?.total_pages || 0;
      } catch (e) {
        console.error('搜索外部模板库失败:', e);
        this.externalTemplates = [];
        this.externalTotalPages = 0;
      } finally {
        this.loading = false;
      }
    },
    async importAndBindTemplates(domainCode: string, externalTemplateIds: number[]) {
      this.loading = true;
      try {
        if (this.allTemplates.length === 0) {
          await this.fetchAllTemplates();
        }
        for (const id of externalTemplateIds) {
          const exists = this.allTemplates.some((t) => t.template_id === id);
          if (!exists) {
            const res: any = await importTemplate(id);
            if (res?.data && typeof res.data === 'object') {
              this.allTemplates.push(res.data as TemplateRecord);
            }
          }
          await bindingTemplates(domainCode, id);
        }
        await this.fetchTemplates(domainCode);
        return true;
      } catch (e) {
        console.error('添加领域模板失败:', e);
        return false;
      } finally {
        this.loading = false;
      }
    },
    async importTemplatesForStaging(externalTemplateIds: number[]) {
      this.loading = true;
      try {
        if (this.allTemplates.length === 0) {
          await this.fetchAllTemplates();
        }
        const staged: TemplateRecord[] = [...this.templates];
        for (const id of externalTemplateIds) {
          const existing = this.allTemplates.find((t) => t.template_id === id);
          let local: TemplateRecord | undefined = existing;
          if (!local) {
            const res: any = await importTemplate(id);
            if (res?.data && typeof res.data === 'object') {
              local = res.data as TemplateRecord;
              this.allTemplates.push(local);
            }
          }
          if (local) {
            const localId = local.template_id;
            if (localId && !staged.some((t) => t.template_id === localId)) {
              staged.push(local);
            }
          }
        }
        this.templates = staged;
        return true;
      } catch (e) {
        console.error('暂存领域模板失败:', e);
        return false;
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

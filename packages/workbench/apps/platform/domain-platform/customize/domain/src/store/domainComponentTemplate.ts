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

const FILTER_KEYS = ['schema', 'domain', 'template_type', 'language_framework', 'file_extension', 'function'] as const;
const CLIENT_FILTER_KEYS = ['schema', 'template_type', 'function'] as const;
const MAX_POOL_PAGES = 50;
const POOL_FETCH_PER = 25;
const POOL_CONCURRENCY = 6;

const WEBSITE_LANGUAGE_FRAMEWORK = ['BPMN模板', 'Angular模板', 'html模板', 'React模板', 'Vue模板', 'Bemit模板', 'OmniEAR模板', 'Smart Data Models', 'Contentful模板', 'NodeRed模板', 'IFTTT规则模板', '其它语言和框架'];
const WEBSITE_FILE_EXTENSION = ['bpmn', 'html', 'jsx', 'js', 'tsx', 'ts', 'json', 'xaml', 'yaml', 'vue', '其它后缀名'];

function tagArr(tags: Record<string, string[]> | string | undefined, key: string): string[] {
  if (!tags) return [];
  let obj: Record<string, string[]> = {};
  if (typeof tags === 'string') {
    try { obj = JSON.parse(tags); } catch { return []; }
  } else {
    obj = tags;
  }
  return Array.isArray(obj[key]) ? obj[key] : [];
}

export const useDomainComponentTemplateStore = defineStore('domainComponentTemplate', {
  state: () => ({
    allTemplates: [] as TemplateRecord[],
    templates: [] as TemplateRecord[],
    externalTemplates: [] as TemplateRecord[],
    externalTotalPages: 0,
    loading: false,
    currentTemplate: {} as TemplateRecord,
    hasMore: true,
    filterPresets: {
      schema: [] as string[],
      domain: [] as string[],
      template_type: [] as string[],
      language_framework: [...WEBSITE_LANGUAGE_FRAMEWORK] as string[],
      file_extension: [...WEBSITE_FILE_EXTENSION] as string[],
      function: [] as string[]
    } as Record<string, string[]>,
    presetsSeeded: false,
    mode: 'server' as 'server' | 'pool',
    filteredPool: [] as TemplateRecord[],
    poolFilterSig: '',
    poolComplete: false,
    poolCapped: false,
    poolSupersetTotal: 0
  }),
  actions: {
    matchClientFilters(item: TemplateRecord, filters: Record<string, string>): boolean {
      for (const k of CLIENT_FILTER_KEYS) {
        const v = filters[k];
        if (v && !tagArr(item.tags, k).includes(v)) return false;
      }
      return true;
    },
    mergeTagsIntoPresets(items: TemplateRecord[]) {
      for (const item of items) {
        for (const key of FILTER_KEYS) {
          const arr = tagArr(item.tags, key);
          for (const v of arr) {
            if (v && !this.filterPresets[key].includes(v)) this.filterPresets[key].push(v);
          }
        }
      }
    },
    async preloadPresets(samplePages = 40) {
      if (this.presetsSeeded) return;
      const concurrency = POOL_CONCURRENCY;
      try {
        const first = await searchExternalTemplates({ page: 1, per: POOL_FETCH_PER }).catch(() => null);
        let totalPages = 8876;
        if (first?.page_info?.total_pages) totalPages = first.page_info.total_pages;
        if (first && Array.isArray(first.data)) this.mergeTagsIntoPresets(first.data);
        const step = Math.max(1, Math.floor(totalPages / samplePages));
        const pages: number[] = [];
        for (let i = 1; i < samplePages; i++) pages.push(Math.min(totalPages, 1 + i * step));
        for (let start = 0; start < pages.length; start += concurrency) {
          const batch = pages.slice(start, start + concurrency);
          const results = await Promise.all(batch.map((p) => searchExternalTemplates({ page: p, per: POOL_FETCH_PER }).catch(() => null)));
          for (const r of results) {
            if (r && Array.isArray(r.data)) this.mergeTagsIntoPresets(r.data);
          }
        }
      } catch (e) {
        console.error('预置值预取失败:', e);
      } finally {
        this.presetsSeeded = true;
      }
    },
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
    async searchExternal(keyword: string, filters: Record<string, string> = {}, page = 1, per = 10) {
      this.loading = true;
      try {
        const result = await searchExternalTemplates({
          q_tag_fuzzy: keyword,
          page,
          per,
          schema: filters.schema,
          domain: filters.domain,
          template_type: filters.template_type,
          language_framework: filters.language_framework,
          file_extension: filters.file_extension,
          function: filters.function
        });
        this.externalTemplates = result.data || [];
        this.externalTotalPages = result.page_info?.total_pages || 0;
        this.mergeTagsIntoPresets(this.externalTemplates);
      } catch (e) {
        console.error('搜索外部模板库失败:', e);
        this.externalTemplates = [];
        this.externalTotalPages = 0;
      } finally {
        this.loading = false;
      }
    },
    async buildPool(keyword: string, filters: Record<string, string>) {
      this.filteredPool = [];
      this.poolComplete = false;
      this.poolCapped = false;
      this.poolSupersetTotal = 0;
      this.loading = true;
      try {
        const q = [keyword, filters.schema, filters.template_type, filters.function].filter(Boolean).join(' ');
        const serverFilters = {
          domain: filters.domain,
          language_framework: filters.language_framework,
          file_extension: filters.file_extension
        };
        const boundIds = this.templates.map((t) => t.template_id);
        const seenIds = new Set<number>();
        const consume = (data: TemplateRecord[]) => {
          for (const item of data) {
            const id = item.template_id;
            if (id != null && seenIds.has(id)) continue;
            if (id != null) seenIds.add(id);
            if (boundIds.includes(id)) continue;
            if (!this.matchClientFilters(item, filters)) continue;
            this.filteredPool.push(item);
          }
          this.mergeTagsIntoPresets(data);
        };
        const first = await searchExternalTemplates({ q_tag_fuzzy: q, ...serverFilters, page: 1, per: POOL_FETCH_PER }).catch(() => null);
        let totalPages = 0;
        if (first) {
          this.poolSupersetTotal = first.page_info?.total_count || 0;
          totalPages = first.page_info?.total_pages || 0;
          if (Array.isArray(first.data)) consume(first.data);
        }
        const limit = Math.min(totalPages, MAX_POOL_PAGES);
        if (totalPages > MAX_POOL_PAGES) this.poolCapped = true;
        for (let p = 2; p <= limit; p += POOL_CONCURRENCY) {
          const batch: number[] = [];
          for (let x = p; x < p + POOL_CONCURRENCY && x <= limit; x++) batch.push(x);
          const results = await Promise.all(batch.map((pp) =>
            searchExternalTemplates({ q_tag_fuzzy: q, ...serverFilters, page: pp, per: POOL_FETCH_PER }).catch(() => null)
          ));
          for (const r of results) {
            if (r && Array.isArray(r.data)) consume(r.data);
          }
        }
      } catch (e) {
        console.error('筛选池构建失败:', e);
      } finally {
        this.poolComplete = true;
        this.loading = false;
      }
    },
    async search(keyword: string, filters: Record<string, string>, page: number, per: number) {
      const clientActive = CLIENT_FILTER_KEYS.some((k) => filters[k]);
      if (!clientActive) {
        this.mode = 'server';
        this.filteredPool = [];
        this.poolComplete = false;
        await this.searchExternal(keyword, filters, page, per);
        return;
      }
      this.mode = 'pool';
      const sig = JSON.stringify({
        k: keyword,
        s: filters.schema,
        tt: filters.template_type,
        fn: filters.function,
        d: filters.domain,
        lf: filters.language_framework,
        fe: filters.file_extension
      });
      if (sig !== this.poolFilterSig) {
        this.poolFilterSig = sig;
        await this.buildPool(keyword, filters);
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

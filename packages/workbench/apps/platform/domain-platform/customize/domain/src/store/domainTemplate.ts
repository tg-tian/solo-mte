import { defineStore } from 'pinia';
import { saveDomainTemplateId } from '../api/domain';
import { saveTemplate, updateTemplate } from '../api/template';

export const useDomainTemplateStore = defineStore('domainTemplate', {
  state: () => ({
    currentDomainTemplate: null as any
  }),
  actions: {
    setCurrentDomainTemplate(domainTemplate: any) {
      this.currentDomainTemplate = domainTemplate;
    },
    async saveDomainTemplate(domainData: any, templates: any[], deviceTypes: any[], components: any[], templateId?: number) {
      const dslData = {
        domainData,
        templates,
        deviceTypes,
        components
      };
      const payload = {
        name: domainData.name,
        category: '领域模板',
        description: domainData.description,
        tags: '领域',
        domain: domainData.name,
        describing_the_model: 'JSON',
        code: JSON.stringify(dslData)
      };
      const res = templateId ? await updateTemplate(templateId, payload) : await saveTemplate(payload);
      return res.data;
    },
    async saveTemplateId(domainId: number, templateId: number) {
      const res = await saveDomainTemplateId(domainId, templateId);
      return res.status === 200;
    }
  },
  persist: true
});

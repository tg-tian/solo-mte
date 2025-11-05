import { getDomainTemplate, saveTemplate, saveDomainTemplateId, updateTemplate } from '../api/template'
import { defineStore } from 'pinia'

export const useDomainTemplateStore = defineStore('domainTemplate', {
    state: () => ({
        domainTemplates: [],
        currentDomainTemplate: null ,
        loading: false,
        total: 0
    }),

    actions: {
        async fetchDomainTemplates(page = 1) {
            this.loading = true
            try {
                const res: any = await getDomainTemplate(page)
                if (res.data && res.status === 200) {
                    this.domainTemplates = res.data.data
                    this.total = res.data.page_info.total_count
                }
            } catch (error) {
                console.error('Failed to fetch domain templates:', error)
            } finally {
                this.loading = false
            }
        },

        setCurrentDomainTemplate(domainTemplate: any) {
            this.currentDomainTemplate = domainTemplate
        },

        //将领域本身保存为模版
        async saveDomainTemplate(domainData:any , templates:any , deviceTypes:any,components:any, templateId?:number){
            try {
                let dslData = {
                    domainData: domainData,
                    templates: templates,
                    deviceTypes: deviceTypes,
                    components: components
                }
                let data = {
                    name: domainData.name,
                    category: '领域模板',
                    description: domainData.description,
                    tags: '领域',
                    domain: domainData.name,
                    describing_the_model: 'JSON',
                    code: JSON.stringify(dslData)
                }
                // 更新是否保存为模板字段，判断创建模板还是更新模板
                let res: any;
                if(templateId){
                    console.log('update template')
                    res = await updateTemplate(data, templateId);
                }else{
                    console.log('save template')
                    res = await saveTemplate(data);
                }
                if (res.data && res.status === 200) {
                    return res.data
                }
            }catch (error){
                console.error('Failed to save template:', error)
                throw error
            }
        },

        async saveTemplateId(domainId: number, templateId: number) {
            try {
                const res: any = await saveDomainTemplateId(domainId, templateId)
                if (res.data && res.status === 200) {
                    return true
                }
            } catch (error) {
                console.error('Failed to save template id:', error)
                throw error
            }
        }
    },

    persist: true
})

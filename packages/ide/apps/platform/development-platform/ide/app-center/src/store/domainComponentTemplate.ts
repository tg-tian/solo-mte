import { mockTemplates } from '../api/mock'
import { bindingTemplates, getDomainTemplates, getTemplates, unbindingTemplates } from '../api/template'
import { Template } from '../types/models'
import { id } from 'element-plus/es/locale'
import { defineStore } from 'pinia'

export const useDomainComponentTemplateStore = defineStore('domainComponentTemplate', {
    state: () => ({
        allTemplates: [] as Template[],
        templates: [] as Template[],
        loading: false,
        currentTemplate: {} as Template ,
        currentDomainId: 0,
        allTemplatesPageSize: 0,
        hasMore: true
    }),

    actions: {
        async fetchTemplates(domainId: number) {
            if(!domainId){
                this.templates = []
                return
            }
            // 获取领域绑定的模板列表
            this.loading = true
            try{
                const res:any = await getDomainTemplates(domainId)
                if(res.data && res.status===200){
                    this.templates = res.data
                }
                // this.templates = mockTemplates
            } catch(error) {
                console.error('Failed to fetch domain templates:', error)
            } finally {
                this.loading = false
            }
        },

        async fetchAllTemplates(page: number, query?: any) {
            // 获取模板库的模板列表
            this.loading = true
            try {
                const queryData = {
                    query: {
                        name_or_category_or_description_or_domain_or_tags_or_code_key_word_string_cont: query?.name_or_category_or_description_or_domain_or_tags_or_code_key_word_string_cont || '',
                        name_cont: query?.name_cont || '',
                        category_cont: query?.category_cont || '',
                        description_cont: query?.description_cont || '',
                        domain_cont: query?.domain_cont || '',
                        tags_cont: query?.tags_cont || '',
                        code_key_word_string_cont: query?.code_key_word_string_cont || ''
                    }
                }
                const res: any = await getTemplates(queryData, page)
                if (res.data && res.status === 200) {
                    if(page === 1) {
                        this.allTemplates = res.data.data.filter((item:any)=>item.category!=='领域模板')
                    } else {
                        this.allTemplates = [...this.allTemplates, ...res.data.data.filter((item:any)=>item.category!=='领域模板')]
                    }
                    this.hasMore = res.data.data.length > 0
                }
            } catch (error) {
                console.error('Failed to fetch domains:', error)
            } finally {
                this.loading = false
            }
        },

        async bindingTemplates(domainId: number, templates: any[]){
            // 绑定模板
            this.loading = true
            try{
                const bindingData = {
                    domainId: domainId,
                    templates: templates.map((item:any)=>{
                        return {
                            id: item.id,
                            name: item.name,
                            category: item.category,
                            description: item.description,
                            domain: item.domain,
                            tags: item.tags,
                            image_url: item.image_url,
                            describing_the_model: item.describing_the_model,
                            url: item.url
                        }
                    })
                }
                const res:any = await bindingTemplates(bindingData)
                if(res.data && res.status===200){
                    await this.fetchTemplates(domainId)
                    return true
                }
            } catch(error) {
                console.error('Failed to bind templates:', error)
            } finally {
                this.loading = false
            }
        },

        async unbindingTemplates(domainId: number, id: number){
            // 取消绑定模板
            try {
                const res: any = await unbindingTemplates(domainId, id)
                if (res.data && res.status === 200) {
                    await this.fetchTemplates(domainId)
                    return true
                }
            } catch (error) {
                console.error('Failed to unbind template:', error)
                throw error
            }
        },

        setCurrentDomain(domainId: number) {
            this.currentDomainId = domainId
        },

        setCurrentTemplate(template: any) {
            this.currentTemplate = template
        },

        setAllTemplatesPageSize(pageSize: number) {
            this.allTemplatesPageSize = pageSize
        },

        setTemplates(templates: any[]) {
            this.templates = templates
        }
    },

    persist: true
})
import { defineStore } from 'pinia'
import { Template } from '../types/models'
import { getTemplates, getTemplateById, createTemplate, updateTemplate, deleteTemplate } from '../api/template'

export const useTemplateStore = defineStore('template', {
  state: () => ({
    templates: [] as Template[],
    allTemplates: [] as Template[],
    currentTemplate: null as Template | null,
    loading: false
  }),
  
  actions: {
    async fetchAllTemplates() {
      this.loading = true
      try {
        const response: any = await getTemplates()
        if (response.data && response.status === 200) {
          this.allTemplates = response.data
        } else {
          throw new Error(response)
        }
      } catch (error) {
        console.error('Failed to fetch templates:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchTemplates() {
      this.loading = true
      try {
          const res: any = await getTemplates()
          if (res.data && res.status === 200) {
              this.templates = res.data
          }
      } catch (error) {
          console.error('Failed to fetch templates:', error)
      } finally {
          this.loading = false
      }
  },
    
    async fetchTemplateById(id: number) {
      this.loading = true
      try {
        const response = await getTemplateById(id)
        if (response.data && response.status === 200) {
          this.currentTemplate = response.data
        }
      } catch (error) {
        console.error(`Failed to fetch template with id ${id}:`, error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async createTemplate(templateData: Template) {
      this.loading = true
      try {
        const response = await createTemplate(templateData)
        if (response.data && response.status === 200) {
          this.fetchAllTemplates()
          return response.data
        }
      } catch (error) {
        console.error('Failed to create template:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async updateTemplate(id: number, templateData: Template) {
      this.loading = true
      try {
        const response = await updateTemplate(id, templateData)
        if (response.data && response.status === 200) {
          this.fetchAllTemplates()
          return response.data
        }
        throw new Error('Template not found')
      } catch (error) {
        console.error(`Failed to update template with id ${id}:`, error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async deleteTemplate(id: number) {
      this.loading = true
      try {
        const response = await deleteTemplate(id)
        if (response.data && response.status === 200) {
          this.fetchAllTemplates()
          return true
        }
        throw new Error('Template not found')
      } catch (error) {
        console.error(`Failed to delete template with id ${id}:`, error)
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})

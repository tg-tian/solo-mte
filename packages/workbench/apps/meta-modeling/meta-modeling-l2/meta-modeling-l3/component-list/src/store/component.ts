import { defineStore } from 'pinia'
import { Component } from '../types/models'
import { getComponents, getComponentById, createComponent, updateComponent, deleteComponent } from '../api/component'

export const useComponentStore = defineStore('component', {
  state: () => ({
    components: [] as Component[],
    allComponents: [] as Component[],
    currentComponent: null as Component | null,
    loading: false
  }),
  
  actions: {
    async fetchAllComponents() {
      this.loading = true
      try {
        const response: any = await getComponents()
        if (response.data && response.status === 200) {
          this.allComponents = response.data
        } else {
          throw new Error(response)
        }
      } catch (error) {
        console.error('Failed to fetch components:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchComponents(domainId?: number) {
      if(domainId === null){
          this.components = []
          return
      }
      this.loading = true
      try {
          const res: any = await getComponents(domainId)
          if (res.data && res.status === 200) {
              this.components = res.data
          }
      } catch (error) {
          console.error('Failed to fetch components:', error)
      } finally {
          this.loading = false
      }
  },
    
    async fetchComponentById(id: number) {
      this.loading = true
      try {
        const response = await getComponentById(id)
        if (response.data && response.status === 200) {
          this.currentComponent = response.data
        }
      } catch (error) {
        console.error(`Failed to fetch component with id ${id}:`, error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async createComponent(componentData: Component) {
      this.loading = true
      try {
        const response = await createComponent(componentData)
        if (response.data && response.status === 200) {
          this.fetchAllComponents()
          return response.data
        }
      } catch (error) {
        console.error('Failed to create component:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async updateComponent(id: number, componentData: Component) {
      this.loading = true
      try {
        const response = await updateComponent(id, componentData)
        if (response.data && response.status === 200) {
          this.fetchAllComponents()
          return response.data
        }
        throw new Error('Component not found')
      } catch (error) {
        console.error(`Failed to update component with id ${id}:`, error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async deleteComponent(id: number) {
      this.loading = true
      try {
        const response = await deleteComponent(id)
        if (response.data && response.status === 200) {
          this.fetchAllComponents()
          return true
        }
        throw new Error('Component not found')
      } catch (error) {
        console.error(`Failed to delete component with id ${id}:`, error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    setCurrentComponent(component: Component) {
      this.currentComponent = component
    },

    setComponents(components: Component[]) {
      this.components = components
    }
  },
  
  persist: true
})

import { defineStore } from 'pinia'
import { Component } from '@/types/models'
import { getComponents, getComponentById, createComponent, updateComponent, deleteComponent, mockComponents, bindingComponent, unbindingComponent } from '@/api/component'

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
        // For production:
        const response: any = await getComponents()
        if (response.data && response.status === 200) {
          this.allComponents = response.data
        }else{
          throw new Error(response)
        }
        
        // For development with mock data:
        // this.components = mockComponents
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
        // For production:
        const response = await getComponentById(id)
        if (response.data && response.status === 200) {
          this.currentComponent = response.data
        }
        
        // For development with mock data:
        // const component = mockComponents.find(c => c.id === id)
        // if (component) {
        //   this.currentComponent = component
        // }
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
        // For production:
        const response = await createComponent(componentData)
        if (response.data && response.status === 200) {
          this.fetchAllComponents() // Refresh the list
          return response.data
        }
        
        // For development with mock data:
        // const newComponent = { ...componentData, id: mockComponents.length + 1 }
        // mockComponents.push(newComponent)
        // await this.fetchComponents()
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
        // For production:
        const response = await updateComponent(id, componentData)
        if (response.data && response.status === 200) {
          this.fetchAllComponents() // Refresh the list
          return response.data
        }
        
        // For development with mock data:
        // const index = mockComponents.findIndex(c => c.id === id)
        // if (index !== -1) {
        //   mockComponents[index] = { ...componentData, id }
        //   await this.fetchComponents()
        //   return mockComponents[index]
        // }
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
        // For production:
        const response = await deleteComponent(id)
        if (response.data && response.status === 200) {
          this.fetchAllComponents() // Refresh the list
          return true
        }
        
        // For development with mock data:
        // const index = mockComponents.findIndex(c => c.id === id)
        // if (index !== -1) {
        //   mockComponents.splice(index, 1)
        //   await this.fetchComponents()
        //   return true
        // }
        throw new Error('Component not found')
      } catch (error) {
        console.error(`Failed to delete component with id ${id}:`, error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async bindingComponent(id: number, domainId: number) {
      try {
          const res: any = await bindingComponent(domainId, id)
          if (res.data && res.status === 200) {
              await this.fetchComponents(domainId)
              return true
          }
      } catch (error) {
          console.error('Failed to bind deviceType:', error)
          throw error
      }
  },

  async unbindingComponent(id: number, domainId: number) {
      try {
          const res: any = await unbindingComponent(domainId, id)
          if (res.data && res.status === 200) {
              await this.fetchComponents(domainId)
              return true
          }
      } catch (error) {
          console.error('Failed to unbind deviceType:', error)
          throw error
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

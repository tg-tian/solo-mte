import { defineStore } from 'pinia';
import { bindingComponent, getComponents, unbindingComponent } from '../api/component';
import type { ComponentRecord } from '../types/models';

export const useComponentStore = defineStore('component', {
  state: () => ({
    components: [] as ComponentRecord[],
    loading: false,
    currentComponent: null as ComponentRecord | null
  }),
  actions: {
    async fetchComponents(domainId?: number) {
      this.loading = true;
      try {
        const res = await getComponents(domainId);
        if (res.status === 200) {
          this.components = res.data;
        }
      } finally {
        this.loading = false;
      }
    },
    async bindingComponent(componentId: number, domainId: number) {
      const res = await bindingComponent(domainId, componentId);
      if (res.status === 200) {
        await this.fetchComponents(domainId);
      }
      return res.status === 200;
    },
    async unbindingComponent(componentId: number, domainId: number) {
      const res = await unbindingComponent(domainId, componentId);
      if (res.status === 200) {
        await this.fetchComponents(domainId);
      }
      return res.status === 200;
    },
    setCurrentComponent(component: ComponentRecord | null) {
      this.currentComponent = component;
    },
    setComponents(components: ComponentRecord[]) {
      this.components = components;
    }
  },
  persist: true
});

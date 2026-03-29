import { defineStore } from 'pinia';
import { getScenarioList } from '../api/scenario';
import type { ScenarioRecord } from '../types/models';

export const useScenarioStore = defineStore('scenario', {
  state: () => ({
    scenarios: [] as ScenarioRecord[],
    loading: false
  }),
  actions: {
    async fetchScenarios() {
      this.loading = true;
      try {
        this.scenarios = await getScenarioList();
      } finally {
        this.loading = false;
      }
    }
  },
  persist: true
});

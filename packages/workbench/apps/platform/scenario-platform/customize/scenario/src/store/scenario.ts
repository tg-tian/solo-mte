import { defineStore } from 'pinia';
import { getScenarioList, deleteScenario } from '../api/scenario';
import type { ScenarioRecord } from '../types/models';

export const useScenarioStore = defineStore('scenario', {
  state: () => ({
    scenarios: [] as ScenarioRecord[],
    loading: false,
    currentScenario: null as ScenarioRecord | null
  }),
  actions: {
    async fetchScenarios(domainId?: number | string) {
      this.loading = true;
      try {
        this.scenarios = await getScenarioList(domainId ? String(domainId) : undefined);
      } finally {
        this.loading = false;
      }
    },
    setCurrentScenario(scenario: ScenarioRecord | null) {
      this.currentScenario = scenario;
    },
    async deleteScenario(sceneId: number | string) {
      this.loading = true;
      try {
        await deleteScenario(String(sceneId));
        this.scenarios = this.scenarios.filter((s) => String(s.sceneId) !== String(sceneId));
      } finally {
        this.loading = false;
      }
    }
  },
  persist: true
});

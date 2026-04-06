import { defineStore } from 'pinia'
import type { Area } from '../types/scene'
import { getAreas } from '../api/area'

export const useAreaStore = defineStore('area', {
  state: () => ({
    areas: [] as Area[],
    loading: false,
  }),

  actions: {
    async fetchAreas(sceneId: number) {
      if (!sceneId) {
        this.areas = []
        return
      }

      this.loading = true
      try {
        const res: any = await getAreas(sceneId)
        this.areas = Array.isArray(res?.data) ? res.data : []
      } finally {
        this.loading = false
      }
    },

    clearAreas() {
      this.areas = []
    },
  },
})

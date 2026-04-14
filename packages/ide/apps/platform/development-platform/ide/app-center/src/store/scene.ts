import { defineStore } from 'pinia'
import type { Scene } from '../types/scene'
import { getSceneById } from '../api/scene'

function normalizeScene(sceneData: any): Scene {
  return {
    id: sceneData.sceneId || sceneData.id,
    domainId: sceneData.domainId,
    name: sceneData.sceneName || sceneData.name,
    description: sceneData.sceneDescription || sceneData.description || '',
    createTime: sceneData.createTime || '',
    updateTime: sceneData.updateTime || '',
    deviceCount: sceneData.deviceCount || 0,
    status: sceneData.status || '0',
    url: sceneData.url || '',
    imageUrl: sceneData.imageUrl || '',
    location: sceneData.location || {
      lng: sceneData.longitude,
      lat: sceneData.latitude,
    },
  }
}

export const useSceneStore = defineStore('scene', {
  state: () => ({
    currentScene: null as Scene | null,
    loading: false,
  }),

  actions: {
    async fetchSceneById(id: number) {
      this.loading = true
      try {
        const res: any = await getSceneById(id)
        this.currentScene = normalizeScene(res.data)
        return this.currentScene
      } finally {
        this.loading = false
      }
    },
  },
})

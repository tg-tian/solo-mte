import { defineStore } from 'pinia'
import type { PolygonPoint, Scene } from '../types/scene'
import { getSceneById } from '../api/scene'

function parsePolygon(raw: unknown): PolygonPoint[] | null {
  if (!raw) return null
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (Array.isArray(parsed) && parsed.length >= 3) {
      return parsed.map((p: any) => ({ x: Number(p?.x), y: Number(p?.y) }))
        .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y)) as PolygonPoint[]
    }
  } catch {}
  return null
}

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
    polygon: parsePolygon(sceneData.polygon),
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

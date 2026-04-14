import { defineStore } from 'pinia'
import type { Area } from '../types/scene'
import { getAreas, createArea, updateArea, deleteArea } from '../api/area'
import request from '../utils/request'

function resolveImageUrl(image?: string | null) {
  if (!image) {
    return null
  }
  if (/^https?:\/\//i.test(image)) {
    return image
  }
  const baseURL = request.defaults.baseURL
  if (!baseURL) {
    return image
  }
  try {
    return new URL(image, baseURL).toString()
  } catch {
    const normalizedBase = `${baseURL}`.replace(/\/+$/, '')
    const normalizedPath = `${image}`.replace(/^\/+/, '')
    return `${normalizedBase}/${normalizedPath}`
  }
}

function normalizeArea(areaData: any): Area {
  const rawParentId = areaData?.parentId
  const parsedParentId = Number(rawParentId)

  return {
    id: Number(areaData?.id ?? 0),
    name: areaData?.name ?? '',
    image: resolveImageUrl(areaData?.image ?? areaData?.imageUrl ?? null),
    description: areaData?.description ?? '',
    position: areaData?.position ?? '',
    parentId:
      rawParentId === null || rawParentId === undefined || rawParentId === '' || Number.isNaN(parsedParentId)
        ? null
        : parsedParentId,
    children: [],
  }
}

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
        this.areas = Array.isArray(res?.data) ? res.data.map((item: any) => normalizeArea(item)) : []
      } finally {
        this.loading = false
      }
    },

    async createArea(sceneId: number, data: Partial<Area>) {
      const payload = {
        sceneId,
        name: data.name || '',
        description: data.description || '',
        position: data.position || '',
        parentId: data.parentId ?? -1,
        image: data.image || '',
      }
      return await createArea(payload)
    },

    async updateArea(id: number, sceneId: number, data: Partial<Area>) {
      const payload = {
        sceneId,
        name: data.name || '',
        description: data.description || '',
        position: data.position || '',
        parentId: data.parentId ?? -1,
        image: data.image || '',
      }
      return await updateArea(id, payload)
    },

    async deleteArea(id: number) {
      return await deleteArea(id)
    },
  },
})

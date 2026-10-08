import { defineStore } from 'pinia'
import type { Area, PolygonPoint } from '../types/scene'
import { getAreas, createArea, updateArea, deleteArea } from '../api/area'
import request from '../utils/request'

/**
 * Resolve a relative image path to an absolute URL for display purposes only.
 * The raw path is preserved in the Pinia store so that the edit form shows
 * the original value and no prefix accumulation occurs on re-fetch.
 */
export function resolveImageUrl(image?: string | null) {
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

function normalizeArea(areaData: any): Area {
  const rawParentId = areaData?.parentId
  const parsedParentId = Number(rawParentId)

  return {
    id: Number(areaData?.id ?? 0),
    name: areaData?.name ?? '',
    image: areaData?.image ?? areaData?.imageUrl ?? null,
    description: areaData?.description ?? '',
    polygon: parsePolygon(areaData?.polygon),
    parentId:
      rawParentId === null || rawParentId === undefined || rawParentId === '' || Number.isNaN(parsedParentId)
        ? null
        : parsedParentId,
    children: [],
  }
}

function serializePolygon(polygon: PolygonPoint[] | null | undefined): string {
  if (!polygon || polygon.length < 3) return ''
  return JSON.stringify(polygon)
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
        polygon: serializePolygon(data.polygon),
        parentId: data.parentId ?? -1,
        image: data.image || '',
      }
      return await createArea(payload as any)
    },

    async updateArea(id: number, sceneId: number, data: Partial<Area>) {
      const payload = {
        sceneId,
        name: data.name || '',
        description: data.description || '',
        polygon: serializePolygon(data.polygon),
        parentId: data.parentId ?? -1,
        image: data.image || '',
      }
      return await updateArea(id, payload as any)
    },

    async deleteArea(id: number) {
      return await deleteArea(id)
    },
  },
})

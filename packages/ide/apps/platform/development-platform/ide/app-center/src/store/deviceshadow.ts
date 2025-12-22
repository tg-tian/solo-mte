import { defineStore } from 'pinia'
import type { DeviceShadow } from '../types/models'
import { getDeviceShadows } from '../api/deviceshadow'

export const useDeviceShadowStore = defineStore('deviceShadow', {
  state: () => ({
    list: [] as DeviceShadow[],
    loading: false,
  }),

  actions: {
    async fetch() {
      this.loading = true
      try {
        const res: any = await getDeviceShadows()
        let raw = res?.data
        if (typeof raw === 'string') {
          try { raw = JSON.parse(raw) } catch {}
        }
        const data = Array.isArray(raw) ? raw : (raw?.data || raw?.devices || [])
        this.list = data
      } catch (error) {
        console.error('Failed to fetch device shadows:', error)
      } finally {
        this.loading = false
      }
    },

    setList(list: DeviceShadow[]) {
      this.list = list
    },

    add(shadow: DeviceShadow) {
      const exists = this.list.some((s) => s.deviceId === shadow.deviceId)
      if (!exists) this.list.push(shadow)
    },

    updateName(deviceId: string, name: string) {
      const idx = this.list.findIndex((s) => s.deviceId === deviceId)
      if (idx > -1) {
        const s = this.list[idx]
        this.list[idx] = {
          ...s,
          deviceName: name,
          metadata: {
            ...s.metadata,
            lastUpdated: Date.now(),
            version: (s.metadata?.version || 0) + 1,
          },
        }
      }
    },

    updateFields(deviceId: string, payload: { name?: string; provider?: string; category?: string; locationName?: string }) {
      const idx = this.list.findIndex((s) => s.deviceId === deviceId)
      if (idx > -1) {
        const s = this.list[idx]
        const reported = s?.state?.reported || {}
        const nextLocation = payload.locationName !== undefined
          ? { ...(reported.location || {}), name: payload.locationName }
          : reported.location
        this.list[idx] = {
          ...s,
          deviceName: payload.name !== undefined ? payload.name : s.deviceName,
          provider: payload.provider !== undefined ? payload.provider : s.provider,
          category: payload.category !== undefined ? payload.category : s.category,
          state: {
            ...s.state,
            reported: {
              ...reported,
              ...(nextLocation !== undefined ? { location: nextLocation } : {}),
            }
          },
          metadata: {
            ...s.metadata,
            lastUpdated: Date.now(),
            version: (s.metadata?.version || 0) + 1,
          },
        }
      }
    },

    remove(deviceId: string) {
      this.list = this.list.filter((s) => s.deviceId !== deviceId)
    },
  },

  persist: true,
})

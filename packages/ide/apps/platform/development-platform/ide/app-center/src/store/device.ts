import { defineStore } from 'pinia'
import type { Device } from '../types/models'
import {
    getDevices,
    createDevice,
    updateDevice,
    deleteDevice,
} from '../api/device'

export const useDeviceStore = defineStore('device', {
    state: () => ({
        devices: [] as Device[],
        loading: false,
        currentDevice: null as Device | null,
        ws: null as WebSocket | null
    }),

    actions: {
        mergeDeep(target: any, source: any) {
            if (!source) return target || {}
            if (!target) target = {}
            const isObj = (v: any) => v && typeof v === 'object' && !Array.isArray(v)
            const out: any = Array.isArray(target) ? [...target] : { ...target }
            Object.keys(source).forEach((k) => {
                const sv = source[k]
                const tv = out[k]
                if (isObj(sv) && isObj(tv)) {
                    out[k] = this.mergeDeep(tv, sv)
                } else {
                    out[k] = sv
                }
            })
            return out
        },
        async fetchDevices() {
            this.loading = true
            try {
                const res: any = await getDevices()
                if (res.data && res.status === 200) {
                    const list = (res.data || []) as Device[]
                    this.devices = list.map((d) => ({
                        ...d,
                        metadata: {
                            lastUpdated: d?.metadata?.lastUpdated ?? Date.now(),
                            isOnline: false,
                            version: d?.metadata?.version ?? 1,
                        }
                    }))
                }
            } catch (error) {
                console.error('Failed to fetch devices:', error)
            } finally {
                this.loading = false
            }
        },

        applyShadow(p: any) {
            const id = p?.deviceId
            if (!id) return
            const i = this.devices.findIndex((d) => d.deviceId === id)
            if (i === -1) return
            const cur = this.devices[i]
            const meta = {
                lastUpdated: p?.metadata?.lastUpdated ?? Date.now(),
                isOnline: p?.metadata?.isOnline ?? true,
                version: p?.metadata?.version ?? (cur?.metadata?.version ?? 1)
            }
            const state = {
                reported: this.mergeDeep(cur?.state?.reported ?? {}, p?.state?.reported ?? {}),
                desired: this.mergeDeep(cur?.state?.desired ?? {}, p?.state?.desired ?? {})
            }
            this.devices[i] = {
                ...cur,
                provider: p?.provider ?? cur.provider,
                category: p?.category ?? cur.category,
                deviceName: p?.deviceName ?? cur.deviceName,
                state,
                metadata: meta
            }
        },

        connectShadowStream() {
            if (this.ws) return
            const ws = new WebSocket('ws://localhost:3000/ws/shadow')
            this.ws = ws
            ws.onopen = () => { console.log('WS connected') }
            ws.onmessage = (e: MessageEvent) => {
                const handle = (raw: any) => {
                    let msg = raw
                    try { if (typeof msg === 'string') msg = JSON.parse(msg) } catch {}
                    const p = Array.isArray(msg) ? msg[0] : msg
                    this.applyShadow(p)
                }
                const data: any = e.data
                if (data && typeof Blob !== 'undefined' && data instanceof Blob) {
                    data.text().then((t: string) => handle(t)).catch(() => {})
                } else {
                    handle(data)
                }
            }
            ws.onclose = () => {
                console.log('WS closed')
                this.devices = (this.devices || []).map((d) => ({
                    ...d,
                    metadata: {
                        lastUpdated: d?.metadata?.lastUpdated ?? Date.now(),
                        isOnline: false,
                        version: d?.metadata?.version ?? 1
                    }
                }))
                this.ws = null
            }
            ws.onerror = (err) => {
                console.error('WS error', err)
            }
        },

        disconnectShadowStream() {
            try { this.ws?.close() } catch {}
            this.devices = (this.devices || []).map((d) => ({
                ...d,
                metadata: {
                    lastUpdated: d?.metadata?.lastUpdated ?? Date.now(),
                    isOnline: false,
                    version: d?.metadata?.version ?? 1
                }
            }))
            this.ws = null
        },

        async createDevice(deviceData: Device) {
            try {
                const res: any = await createDevice(deviceData)
                if (res.data?.ok === true) {
                    await this.fetchDevices()
                    return res.data
                }
            } catch (error) {
                console.error('Failed to create device:', error)
                throw error
            }
        },

        async updateDevice(id: number | string, deviceData: Partial<Device>) {
            try {
                const res: any = await updateDevice(id, deviceData)
                if (res.data?.ok === true) {
                    await this.fetchDevices()
                    return res.data
                }
            } catch (error) {
                console.error('Failed to update device:', error)
                throw error
            }
        },

        async deleteDevice(id: number | string) {
            try {
                const res: any = await deleteDevice(id)
                if (res.data?.ok === true) {
                    await this.fetchDevices()
                    return true
                }
            } catch (error) {
                console.error('Failed to delete device:', error)
                throw error
            }
        },

        setCurrentDevice(device: any) {
            this.currentDevice = device
        }
    },

    persist: true
})

import { defineStore } from 'pinia'
import type { Device, ProviderConfig } from '../types/models'
import {
    getDevices,
    createDevice,
    updateDevice,
    deleteDevice,
    discoverDevices,
    sendCommand
} from '../api/device'
import {
    getProviders,
    createProvider,
    deleteProvider,
} from '../api/provider'


let wsInstance: WebSocket | null = null

export const useDeviceStore = defineStore('device', {
    state: () => ({
        devices: [] as Device[],
        providers: [] as ProviderConfig[],
        loading: false,
        currentDevice: null as Device | null,
        discoveredDevices: [] as any[]
    }),

    actions: {
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
                reported:  p?.state?.reported ?? {},
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
        connectShadowStream() {
            if (wsInstance) return
            const ws = new WebSocket('ws://localhost:3000/ws')
            wsInstance = ws
            ws.onopen = () => { console.log('WS connected') }
            ws.onmessage = (e: MessageEvent) => {
                const handle = (raw: any) => {
                    let msg = raw
                    try { if (typeof msg === 'string') msg = JSON.parse(msg) } catch {}
                    
                    if (msg && msg.topic) {
                        if (msg.topic === 'device.updated') {
                            console.log('WS Device Updated:', msg.data)
                            this.applyShadow(msg.data)
                        } else if (msg.topic === 'device.discovery') {
                            console.log('WS Device Discovery:', msg.data)
                            this.handleDiscovery(msg.data)
                        }
                    } else {
                        // Fallback for direct shadow objects
                        const p = Array.isArray(msg) ? msg[0] : msg
                        if (p && (p.deviceId || p.metadata)) {
                            console.log('WS Received (Legacy):', p)
                            this.applyShadow(p)
                        }
                    }
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
                wsInstance = null
            }
            ws.onerror = (err) => {
                console.error('WS error', err)
            }
        },

        handleDiscovery(data: any) {
            if (data && typeof data === 'object') {
                const idx = this.discoveredDevices.findIndex((d) => d.deviceId === data.deviceId)
                if (idx > -1) {
                    this.discoveredDevices[idx] = { ...this.discoveredDevices[idx], ...data }
                } else {
                    this.discoveredDevices.push(data)
                }
            }
        },

        async discoverDevices() {
            try {
                const res: any = await discoverDevices()
                if (res.status === 200) {
                    this.discoveredDevices = res.data || []
                } else {
                    this.discoveredDevices = []
                }
            } catch (error) {
                console.error('Failed to discover devices:', error)
                this.discoveredDevices = []
            }
        },

        disconnectShadowStream() {
            try { wsInstance?.close() } catch {}
            this.devices = (this.devices || []).map((d) => ({
                ...d,
                metadata: {
                    lastUpdated: d?.metadata?.lastUpdated ?? Date.now(),
                    isOnline: false,
                    version: d?.metadata?.version ?? 1
                }
            }))
            wsInstance = null
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

        async sendCommand(command: any) {
            try {
                const res: any = await sendCommand(command)
                return res.status === 200 || res.data?.ok === true
            } catch (error) {
                console.error('Failed to send command:', error)
                throw error
            }
        },

        setCurrentDevice(device: any) {
            this.currentDevice = device
        },

        async fetchProviders() {
            try {
                const res: any = await getProviders()
                if (res.status === 200) {
                    this.providers = res.data || []
                }
            } catch (error) {
                console.error('Failed to fetch providers:', error)
            }
        },

        async createProvider(data: ProviderConfig) {
            try {
                const res: any = await createProvider(data)
                if (res.status === 201 || res.data?.ok === true) {
                    await this.fetchProviders()
                    return true
                }
                return false
            } catch (error) {
                console.error('Failed to create provider:', error)
                throw error
            }
        },

        async deleteProvider(provider: string) {
            try {
                const res: any = await deleteProvider(provider)
                if (res.status === 200 || res.data?.ok === true) {
                    await this.fetchProviders()
                    return true
                }
                return false
            } catch (error) {
                console.error('Failed to delete provider:', error)
                throw error
            }
        }
    },

    persist: true
})

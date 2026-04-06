import { defineStore } from 'pinia'
import type { Device, ProviderConfig, DeviceCommand, WsMessage } from '../types/device'
import { getDevices, createDevice, updateDevice, deleteDevice, discoverDevices, sendCommand } from '../api/device'
import { getProviders, createProvider, deleteProvider } from '../api/provider'

let wsInstance: WebSocket | null = null

export const useDeviceStore = defineStore('device', {
  state: () => ({
    devices: [] as Device[],
    providers: [] as ProviderConfig[],
    discoveredDevices: [] as Device[],
    currentDevice: null as Device | null,
    loading: false,
  }),

  actions: {
    normalizeDevice(device: Device): Device {
      return {
        ...device,
        state: {
          reported: device?.state?.reported || {},
          desired: device?.state?.desired || {},
        },
        metadata: {
          lastUpdated: device?.metadata?.lastUpdated ?? Date.now(),
          isOnline: device?.metadata?.isOnline ?? false,
          version: device?.metadata?.version ?? 1,
        },
      }
    },

    async fetchDevices() {
      this.loading = true
      try {
        const res: any = await getDevices()
        this.devices = Array.isArray(res?.data) ? res.data.map((d: Device) => this.normalizeDevice(d)) : []
      } finally {
        this.loading = false
      }
    },

    async discoverDevices() {
      const res: any = await discoverDevices()
      this.discoveredDevices = Array.isArray(res?.data) ? res.data.map((d: Device) => this.normalizeDevice(d)) : []
    },

    handleDiscovery(device: Device) {
      const normalized = this.normalizeDevice(device)
      const index = this.discoveredDevices.findIndex((item) => item.deviceId === normalized.deviceId)
      if (index >= 0) {
        this.discoveredDevices[index] = normalized
      } else {
        this.discoveredDevices.push(normalized)
      }
    },

    applyShadow(payload: Device) {
      const index = this.devices.findIndex((item) => item.deviceId === payload.deviceId)
      if (index < 0) return
      this.devices[index] = this.normalizeDevice({
        ...this.devices[index],
        ...payload,
        state: {
          reported: payload?.state?.reported ?? this.devices[index].state.reported,
          desired: payload?.state?.desired ?? this.devices[index].state.desired,
        },
      })
    },

    connectShadowStream() {
      if (wsInstance) return
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      wsInstance = new WebSocket(`${protocol}//${window.location.host}/ws`)
      wsInstance.onmessage = (event) => {
        let raw: any = event.data
        try {
          raw = JSON.parse(raw)
        } catch {}
        const message = raw as WsMessage<Device>
        if (!message?.topic) return
        if (message.topic === 'device.updated') this.applyShadow(message.data)
        if (message.topic === 'device.discovery') this.handleDiscovery(message.data)
      }
      wsInstance.onclose = () => {
        wsInstance = null
      }
    },

    disconnectShadowStream() {
      try { wsInstance?.close() } catch {}
      wsInstance = null
    },

    async createDevice(deviceData: Device) {
      const res: any = await createDevice(deviceData)
      if (res?.data?.ok) await this.fetchDevices()
      return res?.data
    },

    async updateDevice(id: string | number, deviceData: Partial<Device>) {
      const res: any = await updateDevice(id, deviceData)
      if (res?.data?.ok) await this.fetchDevices()
      return res?.data
    },

    async deleteDevice(id: string | number) {
      const res: any = await deleteDevice(id)
      if (res?.data?.ok) await this.fetchDevices()
      return !!res?.data?.ok
    },

    async sendCommand(command: DeviceCommand) {
      const res: any = await sendCommand(command)
      return res.status === 200 || res.data?.ok === true
    },

    setCurrentDevice(device: Device | null) {
      this.currentDevice = device
    },

    async fetchProviders() {
      const res: any = await getProviders()
      this.providers = Array.isArray(res?.data) ? res.data : []
    },

    async createProvider(data: ProviderConfig) {
      const res: any = await createProvider(data)
      if (res.status === 201 || res.data?.ok === true) await this.fetchProviders()
      return res.status === 201 || res.data?.ok === true
    },

    async deleteProvider(provider: string) {
      const res: any = await deleteProvider(provider)
      if (res.status === 200 || res.data?.ok === true) await this.fetchProviders()
      return res.status === 200 || res.data?.ok === true
    },
  },
})

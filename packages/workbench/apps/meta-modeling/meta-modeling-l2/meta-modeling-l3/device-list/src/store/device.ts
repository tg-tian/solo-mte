import { defineStore } from 'pinia'
import { getDevicePage, saveDevice, updateDevice, deleteDevice } from '../api/device'
import { Device } from '../types/models'

export const useDeviceStore = defineStore('device', {
    state: () => ({
        deviceList: {
            records: [] as Device[],
            total: 0,
            size: 10,
            current: 1
        },
        loading: false,
        currentDevice: null as Device | null
    }),

    actions: {
        async fetchDevicePage(params: any) {
            this.loading = true
            try {
                const res: any = await getDevicePage(params)
                if (res.status === 200) {
                    this.deviceList = res.data
                }
            } catch (error) {
                console.error('Failed to fetch device page:', error)
            } finally {
                this.loading = false
            }
        },

        async saveDevice(data: any) {
            try {
                const res: any = await saveDevice(data)
                if (res.status === 201) {
                    return true
                }
                return false
            } catch (error) {
                console.error('Failed to save device:', error)
                return false
            }
        },

        async updateDevice(data: any) {
            try {
                const res: any = await updateDevice(data)
                if (res.status === 200) {
                    return true
                }
                return false
            } catch (error) {
                console.error('Failed to update device:', error)
                return false
            }
        },

        async deleteDevice(id: number) {
            try {
                const res: any = await deleteDevice(id)
                if (res.status === 200) {
                    return true
                }
                return false
            } catch (error) {
                console.error('Failed to delete device:', error)
                return false
            }
        },

        setCurrentDevice(data: Device | null) {
            this.currentDevice = data
        }
    },

    persist: true
})

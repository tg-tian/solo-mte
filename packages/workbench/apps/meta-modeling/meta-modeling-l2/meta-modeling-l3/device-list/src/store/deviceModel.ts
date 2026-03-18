import { defineStore } from 'pinia'
import { getDeviceModels, createDeviceModel, updateDeviceModel, deleteDeviceModel } from '../api/deviceModel'
import { DeviceModel } from '../types/models'

export const useDeviceModelStore = defineStore('deviceModel', {
    state: () => ({
        deviceModels: [] as DeviceModel[],
        loading: false,
        currentDeviceModel: null as DeviceModel | null
    }),

    actions: {
        async fetchDeviceModels(deviceTypeId?: number) {
            this.loading = true
            try {
                const res: any = await getDeviceModels(deviceTypeId)
                if (res.data && res.status === 200) {
                    this.deviceModels = res.data
                }
            } catch (error) {
                console.error('Failed to fetch deviceModels:', error)
            } finally {
                this.loading = false
            }
        },

        async createDeviceModel(deviceModelData: any) {
            try {
                const res: any = await createDeviceModel(deviceModelData)
                if (res.data && res.status === 200) {
                    await this.fetchDeviceModels(deviceModelData.deviceTypeId)
                    return res.data
                } else {
                    throw new Error(res.message || '创建设备型号失败')
                }
            } catch (error) {
                console.error('Failed to create deviceModel:', error)
                throw error
            }
        },

        async updateDeviceModel(id: number, deviceModelData: any) {
            try {
                const res: any = await updateDeviceModel(id, deviceModelData)
                if (res.data && res.status === 200) {
                    await this.fetchDeviceModels(deviceModelData.deviceTypeId)
                    return res.data
                } else {
                    throw new Error(res.message || '更新设备型号失败')
                }
            } catch (error) {
                console.error('Failed to update deviceModel:', error)
                throw error
            }
        },

        async deleteDeviceModel(id: number, deviceTypeId?: number) {
            try {
                const res: any = await deleteDeviceModel(id)
                if (res.data && res.status === 200) {
                    await this.fetchDeviceModels(deviceTypeId)
                    return true
                }
            } catch (error) {
                console.error('Failed to delete deviceModel:', error)
                throw error
            }
        },

        setCurrentDeviceModel(deviceModel: DeviceModel | null) {
            this.currentDeviceModel = deviceModel
        },

        setDeviceModels(deviceModels: DeviceModel[]) {
            this.deviceModels = deviceModels
        }
    },

    persist: true
})

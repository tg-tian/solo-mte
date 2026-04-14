import { defineStore } from 'pinia'
import { getDeviceModels, getDeviceModelPage, createDeviceModel, updateDeviceModel, deleteDeviceModel } from '../api/deviceModel'
import { DeviceModel } from '../types/models'

export const useDeviceModelStore = defineStore('deviceModel', {
    state: () => ({
        deviceModels: [] as DeviceModel[],
        allDeviceModels: [] as DeviceModel[],
        deviceModelPage: {
            records: [] as DeviceModel[],
            total: 0,
            size: 10,
            current: 1
        },
        loading: false,
        currentDeviceModel: null as DeviceModel | null
    }),

    actions: {
        async fetchAllDeviceModels() {
            this.loading = true
            try {
                // Since the backend uses getDeviceModelPage, fetch the first page with a large size to simulate getting all
                const params = { current: 1, size: 1000 }
                const res: any = await getDeviceModelPage(params)
                if (res.data && res.data.records) {
                    this.allDeviceModels = res.data.records
                } else if (res.status === 200 && res.records) {
                    this.allDeviceModels = res.records
                }
            } catch (error) {
                console.error('Failed to fetch deviceModels:', error)
            } finally {
                this.loading = false
            }
        },

        async fetchDeviceModelPage(params: any) {
            this.loading = true
            try {
                const res: any = await getDeviceModelPage(params)
                if (res.status === 200) {
                    this.deviceModelPage = res.data
                }
            } catch (error) {
                console.error('Failed to fetch deviceModel page:', error)
            } finally {
                this.loading = false
            }
        },

        async fetchDeviceModels(domainId?: number) {
            if (domainId === null) {
                this.deviceModels = []
                return
            }
            this.loading = true
            try {
                const res: any = await getDeviceModels(domainId)
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
                if (res.status === 201 || res.status === 200) {
                    await this.fetchAllDeviceModels()
                    // 同时刷新分页数据，确保列表页面能显示最新数�?
                    await this.fetchDeviceModelPage({
                        current: this.deviceModelPage.current,
                        size: this.deviceModelPage.size
                    })
                    return res.data
                } else {
                    throw new Error(res.message || '创建设备模型失败')
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
                    await this.fetchAllDeviceModels()
                    return res.data
                } else {
                    throw new Error(res.message || '更新设备模型失败')
                }
            } catch (error) {
                console.error('Failed to update device:', error)
                throw error
            }
        },

        async deleteDeviceModel(id: number) {
            try {
                const res: any = await deleteDeviceModel(id)
                if (res.data && res.status === 200) {
                    await this.fetchAllDeviceModels()
                    return true
                }
            } catch (error) {
                console.error('Failed to delete deviceModel:', error)
                throw error
            }
        },

        setCurrentDeviceModel(deviceModel: any) {
            this.currentDeviceModel = deviceModel
        },

        setDeviceModels(deviceModels: any[]) {
            this.deviceModels = deviceModels
        }
    },

    persist: true
})

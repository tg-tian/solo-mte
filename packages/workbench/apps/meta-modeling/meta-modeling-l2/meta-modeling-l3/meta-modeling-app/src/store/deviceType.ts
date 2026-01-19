import { defineStore } from 'pinia'
import { getMockDeviceTypes, createMockDeviceType, updateMockDeviceType, deleteMockDeviceType, getDeviceTypes, createDeviceType, updateDeviceType, deleteDeviceType, bindingDeviceType, unbindingDeviceType } from '@/api/deviceType'
import { DeviceType } from '@/types/models'

export const useDeviceTypeStore = defineStore('deviceType', {
    state: () => ({
        deviceTypes: [] as DeviceType[],
        allDeviceTypes: [],
        loading: false,
        currentDeviceType: null
    }),

    actions: {
        async fetchAllDeviceTypes() {
            this.loading = true
            try {
                const res: any = await getDeviceTypes()
                if (res.data && res.status === 200) {
                    this.allDeviceTypes = res.data
                }
            } catch (error) {
                console.error('Failed to fetch deviceTypes:', error)
            } finally {
                this.loading = false
            }
        },

        async fetchDeviceTypes(domainId?: number) {
            if(domainId === null){
                this.deviceTypes = []
                return
            }
            this.loading = true
            try {
                const res: any = await getDeviceTypes(domainId)
                if (res.data && res.status === 200) {
                    this.deviceTypes = res.data
                }
            } catch (error) {
                console.error('Failed to fetch deviceTypes:', error)
            } finally {
                this.loading = false
            }
        },

        async createDeviceType(deviceTypeData: any) {
            try {
                const res: any = await createDeviceType(deviceTypeData)
                if (res.data && res.status === 200) {
                    await this.fetchAllDeviceTypes()
                    return res.data
                } else {
                    throw new Error(res.message || '创建设备类型失败')
                }
            } catch (error) {
                console.error('Failed to create deviceType:', error)
                throw error
            }
        },

        async updateDeviceType(id: number, deviceTypeData: any) {
            try {
                const res: any = await updateDeviceType(id, deviceTypeData)
                if (res.data && res.status === 200) {
                    await this.fetchAllDeviceTypes()
                    return res.data
                } else {
                    throw new Error(res.message || '更新设备类型失败')
                }
            } catch (error) {
                console.error('Failed to update device:', error)
                throw error
            }
        },

        async deleteDeviceType(id: number) {
            try {
                const res: any = await deleteDeviceType(id)
                if (res.data && res.status === 200) {
                    await this.fetchAllDeviceTypes()
                    return true
                }
            } catch (error) {
                console.error('Failed to delete deviceType:', error)
                throw error
            }
        },

        async bindingDeviceType(id: number, domainId: number) {
            try {
                const res: any = await bindingDeviceType(domainId, id)
                if (res.data && res.status === 200) {
                    await this.fetchDeviceTypes(domainId)
                    return true
                }
            } catch (error) {
                console.error('Failed to bind deviceType:', error)
                throw error
            }
        },

        async unbindingDeviceType(id: number, domainId: number) {
            try {
                const res: any = await unbindingDeviceType(domainId, id)
                if (res.data && res.status === 200) {
                    await this.fetchDeviceTypes(domainId)
                    return true
                }
            } catch (error) {
                console.error('Failed to unbind deviceType:', error)
                throw error
            }
        },

        setCurrentDeviceType(deviceType: any) {
            this.currentDeviceType = deviceType
        },

        setDeviceTypes(deviceTypes: any[]) {
            this.deviceTypes = deviceTypes
        }
    },

    persist: true
})

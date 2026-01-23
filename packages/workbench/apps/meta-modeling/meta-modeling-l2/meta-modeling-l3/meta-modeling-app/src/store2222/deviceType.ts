import { defineStore } from 'pinia'
import { getMockDeviceTypes, createMockDeviceType, updateMockDeviceType, deleteMockDeviceType, getDeviceTypes, getDeviceTypePage, createDeviceType, updateDeviceType, deleteDeviceType, bindingDeviceType, unbindingDeviceType } from '@/api/deviceType'
import { DeviceType } from '@/types/models'

export const useDeviceTypeStore = defineStore('deviceType', {
    state: () => ({
        deviceTypes: [] as DeviceType[],
        allDeviceTypes: [] as DeviceType[],
        deviceTypePage: {
            records: [] as DeviceType[],
            total: 0,
            size: 10,
            current: 1
        },
        loading: false,
        currentDeviceType: null as DeviceType | null
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

        async fetchDeviceTypePage(params: any) {
            this.loading = true
            try {
                const res: any = await getDeviceTypePage(params)
                if (res.status === 200) {
                    this.deviceTypePage = res.data
                }
            } catch (error) {
                console.error('Failed to fetch deviceType page:', error)
            } finally {
                this.loading = false
            }
        },

        async fetchDeviceTypes(domainId?: number) {
            if (domainId === null) {
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
                if (res.status === 201) {
                    await this.fetchAllDeviceTypes()
                    // 同时刷新分页数据，确保列表页面能显示最新数据
                    await this.fetchDeviceTypePage({
                        current: this.deviceTypePage.current,
                        size: this.deviceTypePage.size
                    })
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

import { defineStore } from 'pinia';
import { bindDeviceModel, getDeviceModels, unbindDeviceModel } from '../api/deviceModel';
import type { DeviceModelRecord } from '../types/models';

export const useDeviceModelStore = defineStore('deviceModel', {
  state: () => ({
    deviceModels: [] as DeviceModelRecord[],
    loading: false,
    currentDeviceModel: null as DeviceModelRecord | null
  }),
  actions: {
    async fetchDeviceModels(domainId?: number) {
      this.loading = true;
      try {
        const res = await getDeviceModels(domainId);
        if (res.status === 200) {
          this.deviceModels = res.data;
          return;
        }
        this.deviceModels = [];
      } catch (_error) {
        this.deviceModels = [];
      } finally {
        this.loading = false;
      }
    },
    async bindDeviceModel(deviceModelId: number, domainId: number) {
      const res = await bindDeviceModel(domainId, deviceModelId);
      if (res.status === 200) {
        await this.fetchDeviceModels(domainId);
      }
      return res.status === 200;
    },
    async unbindDeviceModel(deviceModelId: number, domainId: number) {
      const res = await unbindDeviceModel(domainId, deviceModelId);
      if (res.status === 200) {
        await this.fetchDeviceModels(domainId);
      }
      return res.status === 200;
    },
    setCurrentDeviceModel(deviceModel: DeviceModelRecord | null) {
      this.currentDeviceModel = deviceModel;
    },
    setDeviceModels(deviceModels: DeviceModelRecord[]) {
      this.deviceModels = deviceModels;
    }
  },
  persist: true
});

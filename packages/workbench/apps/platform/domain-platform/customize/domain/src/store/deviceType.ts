import { defineStore } from 'pinia';
import { bindingDeviceType, getAllDeviceTypesFallback, getDeviceTypes, unbindingDeviceType } from '../api/deviceType';
import type { DeviceTypeRecord } from '../types/models';

export const useDeviceTypeStore = defineStore('deviceType', {
  state: () => ({
    deviceTypes: [] as DeviceTypeRecord[],
    loading: false,
    currentDeviceType: null as DeviceTypeRecord | null
  }),
  actions: {
    async fetchDeviceTypes(domainId?: number) {
      this.loading = true;
      try {
        const res = await getDeviceTypes(domainId);
        if (res.status === 200) {
          this.deviceTypes = res.data;
          return;
        }
      } catch (_error) {
        if (domainId) {
          this.deviceTypes = [];
        } else {
          const fallbackRes = await getAllDeviceTypesFallback();
          if (fallbackRes.status === 200) {
            this.deviceTypes = fallbackRes.data;
          }
        }
      } finally {
        this.loading = false;
      }
    },
    async bindingDeviceType(deviceModelId: number, domainId: number) {
      const res = await bindingDeviceType(domainId, deviceModelId);
      if (res.status === 200) {
        await this.fetchDeviceTypes(domainId);
      }
      return res.status === 200;
    },
    async unbindingDeviceType(deviceModelId: number, domainId: number) {
      const res = await unbindingDeviceType(domainId, deviceModelId);
      if (res.status === 200) {
        await this.fetchDeviceTypes(domainId);
      }
      return res.status === 200;
    },
    setCurrentDeviceType(deviceType: DeviceTypeRecord | null) {
      this.currentDeviceType = deviceType;
    },
    setDeviceTypes(deviceTypes: DeviceTypeRecord[]) {
      this.deviceTypes = deviceTypes;
    }
  },
  persist: true
});

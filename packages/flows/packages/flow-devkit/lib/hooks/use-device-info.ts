import { ref, computed, reactive } from 'vue';
import type { DeviceCategory, DeviceInstance } from '@farris/flow-devkit/types';
import axios from 'axios';
import type { AxiosError } from 'axios';

let deviceCategoriesPromise: Promise<DeviceCategory[]> | undefined;
const deviceCategories = ref<DeviceCategory[]>([]);

const deviceCategoriesWithAction = computed<DeviceCategory[]>(() => {
    return deviceCategories.value.filter((device) => {
        const actions = device?.actions;
        return !!actions && typeof actions === 'object' && Object.keys(actions).length > 0;
    });
});
const deviceCategoriesWithEvent = computed<DeviceCategory[]>(() => {
    return deviceCategories.value.filter((device) => {
        const events = device?.events;
        return !!events && typeof events === 'object' && Object.keys(events).length > 0;
    });
});

const deviceName2DeviceList = reactive(new Map<string, DeviceInstance[]>());
const deviceListLoaded = new Map<string, boolean>();

export function useDeviceInfo() {

    function shouldShowDeviceNodes(): boolean {
        return true;
    }

    async function loadDeviceCategories(): Promise<DeviceCategory[]> {
        const baseDevicePath = './flow-contents/device/';
        const manifestUrl = `${baseDevicePath}manifest.json`;

        try {
            const manifestResponse = await axios.get<string[]>(manifestUrl, {
                timeout: 20 * 1000,
                headers: { 'Content-Type': 'application/json' },
            });
            const deviceNames = manifestResponse.data;

            if (!Array.isArray(deviceNames) || !deviceNames.length) {
                return [];
            }
            const deviceRequestPromises = deviceNames.map(async (deviceName) => {
                const deviceFileUrl = `${baseDevicePath}${deviceName}.json`;
                try {
                    const deviceResponse = await axios.get<any>(deviceFileUrl, {
                        timeout: 20 * 1000,
                        headers: { 'Content-Type': 'application/json' },
                    });
                    return deviceResponse.data;
                } catch (deviceError) {
                    const axiosError = deviceError as AxiosError;
                    console.warn(
                        `[设备描述文件加载失败] ${deviceFileUrl}`,
                        axiosError.message || '未知网络错误',
                    );
                    return null;
                }
            });

            const deviceContents = await Promise.all(deviceRequestPromises);
            const validDeviceContents = deviceContents.filter((content) => content !== null);
            return validDeviceContents;
        } catch (manifestError) {
            const axiosError = manifestError as AxiosError;
            console.error(
                `[设备描述文件加载失败] ${manifestUrl}`,
                axiosError.message || '未知网络错误',
            );
            return [];
        }
    }

    async function getDeviceCategories(): Promise<DeviceCategory[]> {
        if (deviceCategoriesPromise) {
            return deviceCategoriesPromise;
        }
        deviceCategoriesPromise = loadDeviceCategories();
        deviceCategories.value = await deviceCategoriesPromise.catch((error) => {
            console.error(error);
            deviceCategoriesPromise = undefined;
            return [];
        });
        return deviceCategoriesPromise;
    }

    async function getDeviceListByModelName(modelName: string): Promise<DeviceInstance[]> {
        if (deviceListLoaded.get(modelName)) {
            return deviceName2DeviceList.get(modelName) || [];
        }
        const url = `/devices/by-model?modelName=${modelName}`;
        const deviceListResponse = await axios.get<DeviceInstance[]>(url, {
            timeout: 20 * 1000,
            headers: { 'Content-Type': 'application/json' },
        }).catch((error) => {
            console.error(`[设备列表加载失败] ${modelName}`, error);
            return undefined;
        });
        if (!deviceListResponse || !Array.isArray(deviceListResponse.data)) {
            return [];
        }
        const deviceList = deviceListResponse.data || [];
        deviceListLoaded.set(modelName, true);
        deviceName2DeviceList.set(modelName, deviceList);
        return deviceList;
    }

    return {
        shouldShowDeviceNodes,
        getDeviceCategories,
        getDeviceListByModelName,
        deviceCategories,
        deviceCategoriesWithAction,
        deviceCategoriesWithEvent,
        deviceName2DeviceList,
    };
}

import { ref, computed, reactive } from 'vue';
import type { DeviceModel, DeviceInstance } from '@farris/flow-devkit/types';
import axios from 'axios';
import type { AxiosError } from 'axios';

let deviceCategoriesPromise: Promise<DeviceModel[]> | undefined;
const deviceCategories = ref<DeviceModel[]>([]);

const deviceCategoriesWithAction = computed<DeviceModel[]>(() => {
    return deviceCategories.value.filter((device) => {
        const actions = device?.actions;
        return !!actions && typeof actions === 'object' && Object.keys(actions).length > 0;
    });
});
const deviceCategoriesWithEvent = computed<DeviceModel[]>(() => {
    return deviceCategories.value.filter((device) => {
        const events = device?.events;
        return !!events && typeof events === 'object' && Object.keys(events).length > 0;
    });
});

const deviceCategory2DeviceInstanceList = reactive(new Map<string, DeviceInstance[]>());
const deviceListLoaded = new Map<string, boolean>();

export function useDeviceInfo() {

    function shouldShowDeviceNodes(): boolean {
        return true;
    }

    async function loadDeviceCategories(): Promise<DeviceModel[]> {
        const baseDevicePath = './flow-contents/device/';
        const manifestUrl = `${baseDevicePath}manifest.json?v=${(new Date()).getTime()}`;

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
                const deviceFileUrl = `${baseDevicePath}${deviceName}.json?v=${(new Date()).getTime()}`;
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

    async function getDeviceCategories(): Promise<DeviceModel[]> {
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

    async function getDeviceListByCategory(category: string): Promise<DeviceInstance[]> {
        if (deviceListLoaded.get(category)) {
            return deviceCategory2DeviceInstanceList.get(category) || [];
        }
        const url = `/api/runtime/bcc/v1.0/ubmlDevice/deviceList/${category}`;
        const deviceListResponse = await axios.get<DeviceInstance[]>(url, {
            timeout: 20 * 1000,
            headers: { 'Content-Type': 'application/json' },
        }).catch((error) => {
            console.error(`[设备列表加载失败] ${category}`, error);
            return undefined;
        });
        if (!deviceListResponse || !Array.isArray(deviceListResponse.data)) {
            return [];
        }
        const deviceList = deviceListResponse.data || [];
        deviceListLoaded.set(category, true);
        deviceCategory2DeviceInstanceList.set(category, deviceList);
        return deviceList;
    }

    return {
        shouldShowDeviceNodes,
        getDeviceCategories,
        getDeviceListByCategory,
        deviceCategories,
        deviceCategoriesWithAction,
        deviceCategoriesWithEvent,
        deviceCategory2DeviceInstanceList,
    };
}

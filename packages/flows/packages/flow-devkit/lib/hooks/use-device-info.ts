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
        const apiUrl = location.protocol === 'https:'
            ? '/solo-mte-8080/meta/device-models'
            : 'http://139.196.239.110:8080/meta/device-models';
        const iconMapUrl = `./device-assets/device-icons.json?v=${(new Date()).getTime()}`;

        try {
            const [deviceResponse, iconMapResponse] = await Promise.all([
                axios.get<any[]>(apiUrl, { timeout: 20 * 1000 }),
                axios.get<Record<string, string>>(iconMapUrl, {
                    timeout: 20 * 1000,
                    headers: { 'Content-Type': 'application/json' },
                }).catch((error: AxiosError) => {
                    console.warn('[设备图标映射加载失败]', error.message || '未知网络错误');
                    return null;
                }),
            ]);

            const items = deviceResponse.data;
            if (!Array.isArray(items)) {
                return [];
            }

            const iconMap = iconMapResponse?.data || {};
            const devices: DeviceModel[] = items.map((item) => {
                const model: DeviceModel = item.model || item;
                if (iconMap[model.modelId]) {
                    model.icon = iconMap[model.modelId];
                }
                return model;
            });

            return devices;
        } catch (error) {
            const axiosError = error as AxiosError;
            console.error(
                '[设备模型加载失败]',
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

import { ref, computed, reactive } from 'vue';
import type { DeviceModel, DeviceInstance } from '@farris/flow-devkit/types';
import axios from 'axios';
import type { AxiosError } from 'axios';

function getModelIconDataUrl(modelIcon?: string): string {
    if (!modelIcon) return '';
    if (modelIcon.startsWith('data:')) return modelIcon;

    let mimeType = 'image/svg+xml';
    if (modelIcon.startsWith('iVBORw')) {
        mimeType = 'image/png';
    } else if (modelIcon.startsWith('/9j/')) {
        mimeType = 'image/jpeg';
    } else if (modelIcon.startsWith('R0lGOD')) {
        mimeType = 'image/gif';
    } else if (modelIcon.startsWith('UklGR')) {
        mimeType = 'image/webp';
    }

    return `data:${mimeType};base64,${modelIcon}`;
}

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

        try {
            const deviceResponse = await axios.get<any[]>(apiUrl, { timeout: 20 * 1000 });

            const items = deviceResponse.data;
            if (!Array.isArray(items)) {
                return [];
            }

            const devices: DeviceModel[] = items.map((item) => {
                const model: DeviceModel = item.model || item;
                model.icon = getModelIconDataUrl(item.modelIcon);
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

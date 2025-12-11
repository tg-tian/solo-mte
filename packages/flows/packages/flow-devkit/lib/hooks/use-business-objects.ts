import { ref } from 'vue';
import { TypeTreeApi, type TreeNodeData } from '@farris/flow-devkit/api';

const businessObjects = ref<TreeNodeData[]>([]);
const isInitialized = ref<boolean>(false);
const loading = ref<boolean>(false);

export function useBusinessObjects() {

    async function init() {
        if (isInitialized.value || loading.value) {
            return;
        }
        isInitialized.value = true;
        await refreshBusinessObjects();
    }

    async function refreshBusinessObjects(): Promise<void> {
        if (loading.value) {
            return;
        }
        loading.value = true;
        try {
            const result = await TypeTreeApi.getBusinessObjects();
            businessObjects.value = result.data || [];
        } finally {
            loading.value = false;
        }
    }

    init();

    return {
        businessObjects,
        loading,
        refreshBusinessObjects,
    };
}

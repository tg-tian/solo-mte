import { ref } from 'vue';
import { TypeTreeApi, type TreeNodeData } from '@farris/flow-devkit/api';

const billCategories = ref<TreeNodeData[]>([]);
const isInitialized = ref<boolean>(false);
const loading = ref<boolean>(false);

export function useBillCategories() {

    async function init() {
        if (isInitialized.value || loading.value) {
            return;
        }
        isInitialized.value = true;
        await refreshBillCategories();
    }

    async function refreshBillCategories(): Promise<void> {
        if (loading.value) {
            return;
        }
        loading.value = true;
        try {
            const result = await TypeTreeApi.getBillCategories();
            billCategories.value = result.data || [];
        } finally {
            loading.value = false;
        }
    }

    init();

    return {
        billCategories,
        loading,
        refreshBillCategories,
    };
}

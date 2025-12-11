import { ref } from 'vue';
import type { TypeProvider } from '@farris/flow-devkit/types';
import { TypeQueryApi } from '@farris/flow-devkit/api';

const typeProviders = ref<TypeProvider[]>([]);
const isInitialized = ref<boolean>(false);
const loading = ref<boolean>(false);

export function useTypeProvider() {

    async function init() {
        if (isInitialized.value || loading.value) {
            return;
        }
        isInitialized.value = true;
        await refreshTypeProviders();
    }

    async function refreshTypeProviders(): Promise<void> {
        if (loading.value) {
            return;
        }
        loading.value = true;
        try {
            const result = await TypeQueryApi.getTypeProviders();
            typeProviders.value = result.data || [];
        } finally {
            loading.value = false;
        }
    }

    init();

    return {
        typeProviders,
        refreshTypeProviders,
    };
}

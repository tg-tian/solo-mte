import { ref, computed } from 'vue';
import type { Type, TypeRefer } from '@farris/flow-devkit/types';
import { FuncQueryApi, TypeDefineApi, TypeQueryApi } from '@farris/flow-devkit/api';

const methodTypes = ref<Type[]>([]);

const listRefers = ref<TypeRefer[]>([]);

const functionListRefers = computed<TypeRefer[]>(() => {
    return listRefers.value.filter(refer => refer.kind === 'function');
});

const allMethodTypes = ref<Type[]>([]);

const mergedMethodTypes = computed<Type[]>(() => {
    const types = [...methodTypes.value];
    allMethodTypes.value.forEach((type) => {
        const sameItem = types.find(item => {
            return item.source === type.source && item.typeId === type.typeId;
        });
        if (!sameItem) {
            types.push(type);
        }
    });
    return types;
});

const isInitialized = ref<boolean>(false);
const loading = ref<boolean>(false);

export function useMethodTypes() {

    async function init() {
        if (isInitialized.value || loading.value) {
            return;
        }
        isInitialized.value = true;
        await refreshMethodTypes();
    }

    async function refreshMethodTypes(): Promise<void> {
        if (loading.value) {
            return;
        }
        loading.value = true;
        try {
            const methodTypesPromise = FuncQueryApi.getMethodTypes();
            const listRefersPromise = TypeDefineApi.getListRefer();
            const [methodTypesResult, listRefersResult] = await Promise.all([methodTypesPromise, listRefersPromise]);
            methodTypes.value = methodTypesResult.data || [];
            listRefers.value = listRefersResult.data || [];
            if (functionListRefers.value.length) {
                const allMethodTypesResult = await TypeQueryApi.getTypes(functionListRefers.value);
                allMethodTypes.value = allMethodTypesResult.data || [];
            }
        } finally {
            loading.value = false;
        }
    }

    init();

    return {
        methodTypes,
        mergedMethodTypes,
        refreshMethodTypes,
    };
}
